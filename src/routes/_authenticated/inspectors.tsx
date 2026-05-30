import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Plus, Edit2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog } from "@/components/crud-dialog";
import { ConfirmDelete } from "@/components/confirm-delete";
import { useList, useUpsert, useDelete } from "@/lib/queries";
import { formatDate } from "@/lib/format";

type Row = { id: string; visit_date: string; visit_time: string | null; expected_participants: number | null; actual_participants: number; rating: number | null; experience_summary: string | null };

export const Route = createFileRoute("/_authenticated/inspectors")({ component: InspectorsPage });

function InspectorsPage() {
  const { data: rows } = useList<Row>("inspector_reports", { orderBy: "visit_date" });
  const { data: communities } = useList<{ id: string; name: string }>("communities", { orderBy: "name", ascending: true });
  const upsert = useUpsert("inspector_reports", "הדיווח");
  const del = useDelete("inspector_reports", "הדיווח");

  const fields = [
    { name: "visit_date", label: "תאריך ביקור", type: "date" as const, required: true },
    { name: "visit_time", label: "שעת ביקור" },
    { name: "community_id", label: "קהילה", type: "select" as const, options: (communities ?? []).map((c) => ({ value: c.id, label: c.name })) },
    { name: "expected_participants", label: "משתתפים צפוי", type: "number" as const },
    { name: "actual_participants", label: "משתתפים בפועל", type: "number" as const, required: true },
    { name: "rating", label: "ציון (1-5)", type: "number" as const },
    { name: "conversation_details", label: "פרטי שיחה עם הרכז", type: "textarea" as const, colSpan: 2 as const },
    { name: "experience_summary", label: "סיכום החוויה", type: "textarea" as const, colSpan: 2 as const },
    { name: "notes", label: "הערות נוספות", type: "textarea" as const, colSpan: 2 as const },
  ];

  return (
    <div>
      <PageHeader title="דיווחי בקרים" actions={
        <CrudDialog title="דיווח בקרה חדש" fields={fields} onSubmit={(v) => upsert.mutateAsync(v)}
          trigger={<Button size="sm"><Plus className="size-4" /> דיווח חדש</Button>} />
      } />
      <div className="p-8">
        <DataTable<Row> rows={rows}
          columns={[
            { key: "visit_date", header: "תאריך", render: (r) => formatDate(r.visit_date) },
            { key: "visit_time", header: "שעה" },
            { key: "actual_participants", header: "משתתפים" },
            { key: "rating", header: "ציון" },
            { key: "experience_summary", header: "סיכום", render: (r) => <span className="line-clamp-1 text-xs">{r.experience_summary ?? "—"}</span> },
          ]}
          actions={(r) => (
            <div className="flex gap-1">
              <CrudDialog title="עריכת דיווח" fields={fields} initial={r as unknown as Record<string, unknown>} onSubmit={(v) => upsert.mutateAsync(v)}
                trigger={<Button size="sm" variant="ghost"><Edit2 className="size-4" /></Button>} />
              <ConfirmDelete onConfirm={() => del.mutateAsync(r.id)} />
            </div>
          )}
        />
      </div>
    </div>
  );
}
