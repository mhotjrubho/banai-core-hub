import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const CHANNELS = [
  { key: "email", label: "דוא""ל" },
  { key: "sms", label: "SMS" },
  { key: "push", label: "Push" },
  { key: "phone", label: "שיחת טלפון" },
];

const EVENTS = [
  { key: "events", label: "אירועים" },
  { key: "messages", label: "הודעות" },
  { key: "reports", label: "דיווחים" },
  { key: "graphics", label: "משימות גרפיקה" },
];

export const Route = createFileRoute("/_authenticated/notifications")({ component: NotificationsPage });

function NotificationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications-settings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("notifications_settings").select("*").eq("user_id", user!.id).maybeSingle();
      return data ?? null;
    },
  });

  useEffect(() => {
    if (data) {
      setSelectedChannels(data.channels ?? []);
      setSelectedEvents(data.notify_on ?? []);
    }
  }, [data]);

  const summary = useMemo(
    () => ({
      channels: selectedChannels.length ? selectedChannels.join(" · ") : "אין ערוצים",
      events: selectedEvents.length ? selectedEvents.join(" · ") : "אין אירועים",
    }),
    [selectedChannels, selectedEvents],
  );

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
    } catch (err) {
      // ignore realtime errors
    }
    return () => subs.forEach((s) => { try { if (s?.unsubscribe) s.unsubscribe(); else if ((supabase as any).removeChannel) (supabase as any).removeChannel(s); } catch (_) {} });
  }, [qc, user]);

  const toggleChannel = (key: string) => {
    setSelectedChannels((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  };

  const toggleEvent = (key: string) => {
    setSelectedEvents((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  };

  const save = async () => {
    if (!user) return;
    const payload = {
      user_id: user.id,
      channels: selectedChannels,
      notify_on: selectedEvents,
    } as any;

    const existing = await supabase.from("notifications_settings").select("id").eq("user_id", user.id).maybeSingle();
    if ((existing as any).data) {
      await supabase.from("notifications_settings").update(payload).eq("user_id", user.id);
    } else {
      await supabase.from("notifications_settings").insert(payload);
    }
    qc.invalidateQueries(["notifications-settings", user.id]);
  };

  return (
    <div className="min-h-screen">
      <header className="h-16 bg-card border-b flex items-center px-8 sticky top-0 z-10">
        <div>
          <h2 className="text-lg font-semibold">הגדרות התראות</h2>
          <p className="text-sm text-muted-foreground">בחר ערוצים ואירועים כדי לקבל התראות רלוונטיות למערכת.</p>
        </div>
      </header>

      <div className="p-8 space-y-6">
        <Card className="p-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div>
              <h3 className="text-base font-semibold">ערוצי התראה</h3>
              <p className="text-sm text-muted-foreground">בחר איך תרצה לקבל עדכונים.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {CHANNELS.map((option) => {
                  const active = selectedChannels.includes(option.key);
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => toggleChannel(option.key)}
                      className={`rounded-full border px-3 py-2 text-sm transition ${active ? 'border-transparent bg-primary text-primary-foreground' : 'border-white/10 bg-white/5 text-white/80 hover:border-white/20'}`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold">אירועים</h3>
              <p className="text-sm text-muted-foreground">הגדר באילו סוגי אירועים תקבל התראה.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {EVENTS.map((option) => {
                  const active = selectedEvents.includes(option.key);
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => toggleEvent(option.key)}
                      className={`rounded-full border px-3 py-2 text-sm transition ${active ? 'border-transparent bg-secondary text-secondary-foreground' : 'border-white/10 bg-white/5 text-white/80 hover:border-white/20'}`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-xl border border-white/10 bg-slate-950/80 p-4">
              <div className="text-sm text-muted-foreground">ערוצים נבחרים</div>
              <div className="mt-2 min-h-[40px] text-sm">{summary.channels}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/80 p-4">
              <div className="text-sm text-muted-foreground">אירועים נבחרים</div>
              <div className="mt-2 min-h-[40px] text-sm">{summary.events}</div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={save} disabled={isLoading}>שמור הגדרות</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
