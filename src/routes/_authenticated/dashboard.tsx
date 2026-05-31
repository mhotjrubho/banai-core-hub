import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { ROLE_LABELS } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
  const { profile, roles, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [liveConnected, setLiveConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const { data: kpis } = useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: async () => {
      const [students, staff, events, graphics, reports] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("staff").select("id", { count: "exact", head: true }),
        supabase.from("events").select("id", { count: "exact", head: true }).in("status", ["requested", "admin_approved", "logistics_approved", "in_progress"]),
        supabase.from("graphics_tasks").select("id", { count: "exact", head: true }).in("status", ["pending", "in_progress", "revision_requested"]),
        supabase.from("inspector_reports").select("id", { count: "exact", head: true }),
      ]);
      return {
        students: students.count ?? 0,
        staff: staff.count ?? 0,
        events: events.count ?? 0,
        graphics: graphics.count ?? 0,
        reports: reports.count ?? 0,
      };
    },
  });

  useEffect(() => {
    if (kpis) setLastUpdated(new Date().toLocaleString());
  }, [kpis]);

  // Realtime: invalidate KPIs when core tables change so UI updates quickly
  useEffect(() => {
    const tables = ["students", "staff", "events", "graphics_tasks", "inspector_reports"];
    const subs: any[] = [];
    try {
      // Newer supabase-js uses channels
      if ((supabase as any).channel) {
        tables.forEach((t) => {
          const ch = (supabase as any)
            .channel(`public:${t}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: t }, () => qc.invalidateQueries(['dashboard-kpis']))
            .subscribe();
          subs.push(ch);
        });
        if (tables.length > 0) setLiveConnected(true);
      } else if ((supabase as any).from) {
        // Fallback older API
        tables.forEach((t) => {
          const s = (supabase as any).from(t).on('*', () => qc.invalidateQueries(['dashboard-kpis'])).subscribe();
          subs.push(s);
        });
        if (tables.length > 0) setLiveConnected(true);
      }
    } catch (err) {
      // Non-fatal: if realtime isn't available, dashboard still works via polling
      // eslint-disable-next-line no-console
      console.warn('Supabase realtime subscription failed', err);
    }

    return () => {
      subs.forEach((s) => {
        try {
          if (s?.unsubscribe) s.unsubscribe();
          else if ((supabase as any).removeChannel) (supabase as any).removeChannel(s);
        } catch (_) {}
      });
      setLiveConnected(false);
    };
  }, [qc]);

  return (
    <div>
      <header className="h-20 bg-card border-b flex items-center justify-between px-8 sticky top-0 z-10">
        <div>
          <h2 className="text-lg font-semibold">לוח בקרה כללי</h2>
          <div className="text-xs text-muted-foreground mt-1">שלום, <span className="font-semibold text-foreground">{profile?.full_name ?? ""}</span>
            {roles.length > 0 && <span className="mr-2 px-2 py-0.5 bg-secondary rounded text-[10px]">{roles.map((r) => ROLE_LABELS[r] ?? r).join(", ")}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {liveConnected ? (
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-emerald-500" />
              <div className="text-sm font-medium">Live updates</div>
              {lastUpdated && <div className="text-[11px] text-muted-foreground mr-3">עדכון אחרון: {lastUpdated}</div>}
            </div>
          ) : (
            <div className="text-sm text-amber-600">Realtime disabled</div>
          )}
        </div>
      </header>
      <div className="p-8 space-y-8">
        {!isAdmin && roles.length === 0 && (
          <Card className="p-4 bg-amber-50 border-amber-200 text-amber-900 text-sm">
            עדיין לא הוקצו לך הרשאות. פנה למנהל המערכת.
          </Card>
        )}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {[
            { label: "תלמידים", value: kpis?.students },
            { label: "כוח אדם", value: kpis?.staff },
            { label: "אירועים פעילים", value: kpis?.events },
            { label: "משימות גרפיקה", value: kpis?.graphics },
            { label: "דיווחי בקרים", value: kpis?.reports },
          ].map((k) => (
            <Card key={k.label} className="p-5">
              <p className="text-xs font-medium text-muted-foreground mb-1">{k.label}</p>
              <p className="text-2xl font-bold">{k.value ?? "—"}</p>
            </Card>
          ))}
        </section>
        <Card className="p-6">
          <h3 className="font-bold mb-2">ברוך הבא למערכת בני חיל</h3>
          <p className="text-sm text-muted-foreground">
            המערכת מכילה את כל מודולי הניהול: תלמידים, כוח אדם, אירועים וטיולים, משימות גרפיקה, דיווחי בקרים, ספקים, טפסים דינמיים ודוחות.
            השתמש בתפריט הצדדי כדי לנווט. {isAdmin && "כמנהל-על תוכל לנהל משתמשים, הרשאות, Webhooks ולוגים תחת \"ניהול מערכת\"."}
          </p>
        </Card>
      </div>
    </div>
  );
}
