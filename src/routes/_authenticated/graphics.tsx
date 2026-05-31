import { createFileRoute } from "@tanstack/react-router";
import { RequireModule } from "@/components/require-module";
import { Button } from "@/components/ui/button";
import { Plus, Edit2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog } from "@/components/crud-dialog";
import { ConfirmDelete } from "@/components/confirm-delete";
import { useList, useUpsert, useDelete } from "@/lib/queries";
import { GRAPHICS_STATUS_LABELS, formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

type Row = { id: string; title: string; description: string | null; status: string; output_type: string | null; dimensions: string | null; deadline: string | null };

export const Route = createFileRoute("/_authenticated/graphics")({ component: () => <RequireModule module="graphics"><GraphicsPage /></RequireModule> });

function GraphicsPage() {
  const { data: rows } = useList<Row>("graphics_tasks", { orderBy: "created_at" });
  const upsert = useUpsert("graphics_tasks", "המשימה");
  const del = useDelete("graphics_tasks", "המשימה");

  const fields = [
    { name: "title", label: "כותרת המשימה", required: true, colSpan: 2 as const },
    { name: "description", label: "תיאור המשימה", type: "textarea" as const, colSpan: 2 as const },
    { name: "output_type", label: "סוג פלט", type: "select" as const, options: [
      { value: "flyer", label: "פלייר" }, { value: "banner", label: "באנר" }, { value: "card", label: "כרטיס" }, { value: "post", label: "פוסט רשתות" }, { value: "other", label: "אחר" },
    ]},
    { name: "dimensions", label: "מימדים" },
    { name: "deadline", label: "דדליין", type: "datetime-local" as const },
    { name: "status", label: "סטטוס", type: "select" as const, options:
      Object.entries(GRAPHICS_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l })) },
    { name: "text_content", label: "תוכן טקסטואלי לעיצוב", type: "textarea" as const, colSpan: 2 as const },
  ];

  return (
    <div>
      <PageHeader title="משימות גרפיקה" actions={
        <CrudDialog title="משימה חדשה" fields={fields} onSubmit={(v) => upsert.mutateAsync({ ...v, status: v.status || "pending" })}
          trigger={<Button size="sm"><Plus className="size-4" /> משימה חדשה</Button>} />
      } />
      <div className="p-8">
        <DataTable<Row> rows={rows}
          columns={[
            { key: "title", header: "כותרת" },
            { key: "output_type", header: "סוג" },
            { key: "deadline", header: "דדליין", render: (r) => formatDateTime(r.deadline) },
            { key: "status", header: "סטטוס", render: (r) => <Badge>{GRAPHICS_STATUS_LABELS[r.status] ?? r.status}</Badge> },
          ]}
          actions={(r) => (
            <div className="flex gap-1">
              <CrudDialog title="עריכת משימה" fields={fields} initial={r as unknown as Record<string, unknown>} onSubmit={(v) => upsert.mutateAsync(v)}
                trigger={<Button size="sm" variant="ghost"><Edit2 className="size-4" /></Button>} />
              <ConfirmDelete onConfirm={() => del.mutateAsync(r.id)} />
            </div>
          )}
        />
      </div>
    </div>
  );
}
