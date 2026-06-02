import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  action_url?: string;
  action_type?: string;
  action_id?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  expires_at?: string;
};

export function NotificationBell() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Get unread count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications-unread-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_unread_notifications_count", {
        p_user_id: user!.id,
      });
      if (error) {
        console.error("Failed to get unread count:", error);
        return 0;
      }
      return data ?? 0;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Get recent notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Failed to get notifications:", error);
        return [];
      }
      return (data ?? []) as Notification[];
    },
  });

  // Realtime subscriptions
  useEffect(() => {
    if (!user) return;

    // Subscribe to new notifications
    const channel = supabase
      .channel(`notifications:user_id=eq.${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["notifications-list", user.id] });
          qc.invalidateQueries({ queryKey: ["notifications-unread-count", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", notificationId);

    qc.invalidateQueries({ queryKey: ["notifications-list", user?.id] });
    qc.invalidateQueries({ queryKey: ["notifications-unread-count", user?.id] });
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    await supabase.from("notifications").delete().eq("id", notificationId);

    qc.invalidateQueries({ queryKey: ["notifications-list", user?.id] });
    qc.invalidateQueries({ queryKey: ["notifications-unread-count", user?.id] });
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!user) return;
    await supabase.rpc("mark_notifications_read", { p_user_id: user.id });
    qc.invalidateQueries({ queryKey: ["notifications-list", user.id] });
    qc.invalidateQueries({ queryKey: ["notifications-unread-count", user.id] });
  };

  if (!user) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="התראות"
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0" align="start">
        <div className="flex flex-col max-h-96">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-semibold">התראות</h2>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs h-auto py-1"
              >
                <CheckCheck className="size-3 mr-1" />
                סימון הכל כנקרא
              </Button>
            )}
          </div>

          {/* Notifications list */}
          <ScrollArea className="flex-1">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                אין התראות
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={cn(
                      "p-3 rounded-lg border transition cursor-pointer",
                      notif.is_read
                        ? "bg-muted/30 border-border hover:border-border/80"
                        : "bg-accent/10 border-accent/30 hover:border-accent/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon/Badge */}
                      <div
                        className={cn(
                          "mt-1 flex-shrink-0 size-2 rounded-full",
                          notif.is_read ? "bg-muted-foreground" : "bg-accent"
                        )}
                      />

                      {/* Content */}
                      <div
                        className="flex-1 min-w-0"
                        onClick={() => {
                          if (notif.action_url) {
                            window.location.href = notif.action_url;
                          }
                          if (!notif.is_read) {
                            markAsRead(notif.id);
                          }
                        }}
                      >
                        <h3 className="font-medium text-sm truncate">
                          {notif.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notif.message}
                        </p>
                        <div className="text-[10px] text-muted-foreground/60 mt-1">
                          {formatTime(notif.created_at)}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!notif.is_read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notif.id);
                            }}
                            title="סימון כנקרא"
                          >
                            <Check className="size-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notif.id);
                          }}
                          title="מחיקה"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  // Navigate to notifications page
                  window.location.href = "/notifications";
                }}
              >
                ראה את כל ההתראות
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Helper function to format time
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "עכשיו";
  if (diffInSeconds < 3600) return `לפני ${Math.floor(diffInSeconds / 60)} דקות`;
  if (diffInSeconds < 86400) return `לפני ${Math.floor(diffInSeconds / 3600)} שעות`;
  if (diffInSeconds < 604800) return `לפני ${Math.floor(diffInSeconds / 86400)} ימים`;

  return date.toLocaleDateString("he-IL");
}
