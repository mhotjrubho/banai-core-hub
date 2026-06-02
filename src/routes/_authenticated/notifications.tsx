import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, CheckCheck, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const CHANNELS = [
  { key: "email", label: "דוא\"ל" },
  { key: "sms", label: "SMS" },
  { key: "push", label: "Push" },
  { key: "phone", label: "שיחת טלפון" },
];

const NOTIFICATION_TYPES = [
  { key: "student_added", label: "תלמיד חדש" },
  { key: "student_updated", label: "עדכון תלמיד" },
  { key: "event_created", label: "אירוע חדש" },
  { key: "event_updated", label: "עדכון אירוע" },
  { key: "graphic_task_assigned", label: "משימת גרפיקה" },
  { key: "form_submission", label: "טופס חדש" },
  { key: "inspector_report_filed", label: "דיווח בקרה" },
  { key: "system_alert", label: "התראה מערכת" },
];

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
};

export const Route = createFileRoute("/_authenticated/notifications")({ component: NotificationsPage });

function NotificationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [tab, setTab] = useState<"all" | "unread" | "settings">("all");

  // Get notifications
  const { data: allNotifications = [], isLoading: notificationsLoading } = useQuery({
    queryKey: ["notifications-all", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      return (data ?? []) as Notification[];
    },
  });

  // Get settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["notifications-settings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications_settings")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data ?? null;
    },
  });

  useEffect(() => {
    if (settings) {
      setSelectedChannels(((settings as any).enabled_channels ?? ["in_app"]) as string[]);
      setSelectedTypes(((settings as any).enabled_types ?? []) as string[]);
    }
  }, [settings]);

  // Filter notifications based on tab
  const displayedNotifications = useMemo(() => {
    let filtered = allNotifications;
    if (tab === "unread") {
      filtered = filtered.filter((n) => !n.is_read);
    }
    return filtered;
  }, [allNotifications, tab]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications:user_id=eq.${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["notifications-all", user.id] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);

  const toggleChannel = (key: string) => {
    setSelectedChannels((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  };

  const toggleType = (key: string) => {
    setSelectedTypes((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  };

  const saveSettings = async () => {
    if (!user) return;
    const payload = {
      user_id: user.id,
      enabled_channels: selectedChannels,
      enabled_types: selectedTypes,
    } as any;

    const existing = await supabase
      .from("notifications_settings")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if ((existing as any).data) {
      await supabase
        .from("notifications_settings")
        .update(payload)
        .eq("user_id", user.id);
    } else {
      await supabase.from("notifications_settings").insert(payload);
    }
    qc.invalidateQueries({ queryKey: ["notifications-settings", user.id] });
  };

  const markAsRead = async (notif: Notification) => {
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", notif.id);
    qc.invalidateQueries({ queryKey: ["notifications-all", user?.id] });
  };

  const deleteNotification = async (notif: Notification) => {
    await supabase.from("notifications").delete().eq("id", notif.id);
    qc.invalidateQueries({ queryKey: ["notifications-all", user?.id] });
  };

  const markAllAsRead = async () => {
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", user!.id)
      .eq("is_read", false);
    qc.invalidateQueries({ queryKey: ["notifications-all", user?.id] });
  };

  return (
    <div className="min-h-screen">
      <header className="h-16 bg-card border-b flex items-center px-8 sticky top-0 z-10">
        <div>
          <h2 className="text-lg font-semibold">התראות</h2>
          <p className="text-sm text-muted-foreground">
            צפה בהתראות, סמן כנקרא ובחר העדראה
          </p>
        </div>
      </header>

      <div className="p-8">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="all">
              כל ההתראות ({allNotifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread">
              לא קרואות ({allNotifications.filter((n) => !n.is_read).length})
            </TabsTrigger>
            <TabsTrigger value="settings">הגדרות</TabsTrigger>
          </TabsList>

          {/* All/Unread notifications */}
          <TabsContent value="all" className="space-y-4">
            {displayedNotifications.length > 0 && (
              <div className="flex justify-end mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                  disabled={allNotifications.every((n) => n.is_read)}
                >
                  <CheckCheck className="size-4 mr-2" />
                  סימון הכל כנקרא
                </Button>
              </div>
            )}
            <ScrollArea className="rounded-lg border">
              <div className="p-4 space-y-3">
                {displayedNotifications.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    {tab === "unread"
                      ? "אין התראות לא קרואות"
                      : "אין התראות"}
                  </div>
                ) : (
                  displayedNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={cn(
                        "p-4 rounded-lg border transition",
                        notif.is_read
                          ? "bg-muted/30 border-border"
                          : "bg-accent/10 border-accent/30"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "mt-1 flex-shrink-0 size-2 rounded-full",
                            notif.is_read ? "bg-muted-foreground" : "bg-accent"
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm">{notif.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {notif.message}
                          </p>
                          <div className="text-[10px] text-muted-foreground/60 mt-2">
                            {formatTime(notif.created_at)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!notif.is_read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => markAsRead(notif)}
                              title="סימון כנקרא"
                            >
                              <Check className="size-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => deleteNotification(notif)}
                            title="מחיקה"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="unread" className="space-y-4">
            {displayedNotifications.length > 0 && (
              <div className="flex justify-end mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                >
                  <CheckCheck className="size-4 mr-2" />
                  סימון הכל כנקרא
                </Button>
              </div>
            )}
            <ScrollArea className="rounded-lg border">
              <div className="p-4 space-y-3">
                {displayedNotifications.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    אין התראות לא קרואות
                  </div>
                ) : (
                  displayedNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={cn(
                        "p-4 rounded-lg border transition",
                        notif.is_read
                          ? "bg-muted/30 border-border"
                          : "bg-accent/10 border-accent/30"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex-shrink-0 size-2 rounded-full bg-accent" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm">{notif.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {notif.message}
                          </p>
                          <div className="text-[10px] text-muted-foreground/60 mt-2">
                            {formatTime(notif.created_at)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => markAsRead(notif)}
                            title="סימון כנקרא"
                          >
                            <Check className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => deleteNotification(notif)}
                            title="מחיקה"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Settings tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="p-6 space-y-6">
              <div>
                <h3 className="text-base font-semibold mb-4">ערוצי התראה</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  בחר איך תרצה לקבל עדכונים
                </p>
                <div className="flex flex-wrap gap-2">
                  {CHANNELS.map((option) => {
                    const active = selectedChannels.includes(option.key);
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => toggleChannel(option.key)}
                        className={cn(
                          "rounded-full border px-3 py-2 text-sm transition",
                          active
                            ? "border-transparent bg-primary text-primary-foreground"
                            : "border-border bg-muted text-muted-foreground hover:border-border/80"
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold mb-4">סוגי התראות</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  בחר באילו סוגי אירועים תרצה לקבל התראה
                </p>
                <div className="flex flex-wrap gap-2">
                  {NOTIFICATION_TYPES.map((option) => {
                    const active = selectedTypes.includes(option.key);
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => toggleType(option.key)}
                        className={cn(
                          "rounded-full border px-3 py-2 text-sm transition",
                          active
                            ? "border-transparent bg-secondary text-secondary-foreground"
                            : "border-border bg-muted text-muted-foreground hover:border-border/80"
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveSettings} disabled={settingsLoading}>
                  שמור הגדרות
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "עכשיו";
  if (diffInSeconds < 3600)
    return `לפני ${Math.floor(diffInSeconds / 60)} דקות`;
  if (diffInSeconds < 86400)
    return `לפני ${Math.floor(diffInSeconds / 3600)} שעות`;
  if (diffInSeconds < 604800)
    return `לפני ${Math.floor(diffInSeconds / 86400)} ימים`;

  return date.toLocaleDateString("he-IL");
}
