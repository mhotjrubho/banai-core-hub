import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/notifications")({ component: NotificationsPage });

function NotificationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [channels, setChannels] = useState<string>("email");
  const [notifyOn, setNotifyOn] = useState<string>("[]");

  const { data } = useQuery({
    queryKey: ["notifications-settings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("notifications_settings").select("*").eq("user_id", user!.id).maybeSingle();
      return data ?? null;
    },
  });

  // Realtime: refresh when settings change
  useEffect(() => {
    const subs: any[] = [];
    try {
      if (user) {
        if ((supabase as any).channel) {
          const ch = (supabase as any)
            .channel('public:notifications_settings')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications_settings', filter: `user_id=eq.${user.id}` }, () => qc.invalidateQueries(["notifications-settings", user.id]))
            .subscribe();
          subs.push(ch);
        } else if ((supabase as any).from) {
          const s = (supabase as any).from(`notifications_settings:user_id=eq.${user.id}`).on('*', () => qc.invalidateQueries(["notifications-settings", user.id])).subscribe();
          subs.push(s);
        }
      }
    } catch (err) {}
    return () => subs.forEach((s) => { try { if (s?.unsubscribe) s.unsubscribe(); else if ((supabase as any).removeChannel) (supabase as any).removeChannel(s); } catch (_) {} });
  }, [qc, user]);

  useEffect(() => {
    if (data) {
      setChannels((data.channels ?? []).join(","));
      setNotifyOn(JSON.stringify(data.notify_on ?? []));
    }
  }, [data]);

  const save = async () => {
    if (!user) return;
    const payload = {
      user_id: user.id,
      channels: channels.split(",").map((s) => s.trim()).filter(Boolean),
      notify_on: JSON.parse(notifyOn || "[]"),
    } as any;
    // upsert behavior
    const existing = await supabase.from("notifications_settings").select("id").eq("user_id", user.id).maybeSingle();
    if ((existing as any).data) {
      await supabase.from("notifications_settings").update(payload).eq("user_id", user.id);
    } else {
      await supabase.from("notifications_settings").insert(payload);
    }
    qc.invalidateQueries(["notifications-settings", user.id]);
  };

  return (
    <div>
      <header className="h-16 bg-card border-b flex items-center px-8 sticky top-0 z-10">
        <h2 className="text-lg font-semibold">הגדרות התראות</h2>
      </header>
      <div className="p-8">
        <Card className="p-4 space-y-3">
          <div>
            <Label>ערוצי התראה (comma separated)</Label>
            <Input value={channels} onChange={(e) => setChannels(e.target.value)} placeholder="email,sms,push" />
          </div>
          <div>
            <Label>אירועים להתראה (JSON array)</Label>
            <Input value={notifyOn} onChange={(e) => setNotifyOn(e.target.value)} placeholder='["events","messages"]' />
          </div>
          <div>
            <Button onClick={save}>שמור</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
