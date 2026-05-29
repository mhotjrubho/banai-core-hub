import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { ROLE_LABELS } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
  const { profile, roles, isAdmin } = useAuth();

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

  return (
    <div>
      <header className="h-16 bg-card border-b flex items-center justify-between px-8 sticky top-0 z-10">
        <h2 className="text-lg font-semibold">לוח בקרה כללי</h2>
        <div className="text-xs text-muted-foreground">
          שלום, <span className="font-semibold text-foreground">{profile?.full_name ?? ""}</span>
          {roles.length > 0 && <span className="mr-2 px-2 py-0.5 bg-secondary rounded text-[10px]">{roles.map((r) => ROLE_LABELS[r] ?? r).join(", ")}</span>}
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
