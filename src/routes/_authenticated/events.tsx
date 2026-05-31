import { createFileRoute } from "@tanstack/react-router";
import { RequireModule } from "@/components/require-module";
import { Button } from "@/components/ui/button";
import { Plus, Edit2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog } from "@/components/crud-dialog";
import { ConfirmDelete } from "@/components/confirm-delete";
import { useList, useUpsert, useDelete } from "@/lib/queries";
import { EVENT_STATUS_LABELS, formatDateTime, formatCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

type Row = { id: string; serial_number: number; title: string; event_type: string; status: string; start_at: string; end_at: string | null; expected_participants: number | null; actual_participants: number | null; total_budget_requested: number | null; total_budget_approved: number | null };

export const Route = createFileRoute("/_authenticated/events")({ component: () => <RequireModule module="events"><EventsPage /></RequireModule> });

function EventsPage() {
  const { data: rows } = useList<Row>("events", { orderBy: "start_at" });
  const upsert = useUpsert("events", "האירוע");
  const del = useDelete("events", "האירוע");

  const fields = [
    { name: "title", label: "כותרת האירוע", required: true, colSpan: 2 as const },
    { name: "event_type", label: "סוג", required: true, type: "select" as const, options: [
      { value: "trip", label: "טיול" }, { value: "shabbat", label: "שבת ארגון" }, { value: "evening", label: "ערב פעילות" }, { value: "ceremony", label: "טקס" }, { value: "other", label: "אחר" },
    ]},
    { name: "status", label: "סטטוס", type: "select" as const, options:
      Object.entries(EVENT_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l })) },
    { name: "start_at", label: "מועד התחלה", type: "datetime-local" as const, required: true },
    { name: "end_at", label: "מועד סיום", type: "datetime-local" as const },
    { name: "expected_participants", label: "משתתפים צפוי", type: "number" as const },
    { name: "actual_participants", label: "משתתפים בפועל", type: "number" as const },
    { name: "total_budget_requested", label: "תקציב מבוקש", type: "number" as const },
    { name: "total_budget_approved", label: "תקציב מאושר", type: "number" as const },
    { name: "required_activities", label: "פעילויות / אטרקציות נדרשות", type: "textarea" as const, colSpan: 2 as const },
    { name: "pickup_details", label: "פרטי איסוף", type: "textarea" as const, colSpan: 2 as const },
    { name: "logistics_notes", label: "הערות לוגיסטיקה", type: "textarea" as const, colSpan: 2 as const },
  ];

  const statusVariant = (s: string) =>
    s === "rejected" || s === "cancelled" ? "destructive" :
    s === "completed" ? "secondary" :
    s === "logistics_approved" || s === "admin_approved" ? "default" : "outline";

  return (
    <div>
      <PageHeader title="אירועים וטיולים" actions={
        <CrudDialog title="אירוע חדש" fields={fields} onSubmit={(v) => upsert.mutateAsync({ ...v, status: v.status || "draft" })}
          trigger={<Button size="sm"><Plus className="size-4" /> אירוע חדש</Button>} />
      } />
      <div className="p-8">
        <DataTable<Row> rows={rows}
          columns={[
            { key: "serial_number", header: "מס׳", render: (r) => `#${r.serial_number}` },
            { key: "title", header: "כותרת" },
            { key: "event_type", header: "סוג" },
            { key: "start_at", header: "מועד", render: (r) => formatDateTime(r.start_at) },
            { key: "status", header: "סטטוס", render: (r) => <Badge variant={statusVariant(r.status)}>{EVENT_STATUS_LABELS[r.status] ?? r.status}</Badge> },
            { key: "total_budget_approved", header: "תקציב", render: (r) => formatCurrency(r.total_budget_approved) },
          ]}
          actions={(r) => (
            <div className="flex gap-1">
              <CrudDialog title={`עריכת אירוע #${r.serial_number}`} fields={fields} initial={r as unknown as Record<string, unknown>} onSubmit={(v) => upsert.mutateAsync(v)}
                trigger={<Button size="sm" variant="ghost"><Edit2 className="size-4" /></Button>} />
              <ConfirmDelete onConfirm={() => del.mutateAsync(r.id)} />
            </div>
          )}
        />
      </div>
    </div>
  );
}
