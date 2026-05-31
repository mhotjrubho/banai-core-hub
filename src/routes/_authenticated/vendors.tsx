import { createFileRoute } from "@tanstack/react-router";
import { RequireModule } from "@/components/require-module";
import { Button } from "@/components/ui/button";
import { Plus, Edit2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog } from "@/components/crud-dialog";
import { ConfirmDelete } from "@/components/confirm-delete";
import { useList, useUpsert, useDelete } from "@/lib/queries";
import { formatDate, formatCurrency } from "@/lib/format";

type Row = { id: string; name: string; vendor_type: string; contact_name: string | null; phone: string | null; email: string | null; rate: number | null; rate_unit: string | null; insurance_valid_until: string | null; safety_approval_valid_until: string | null; is_active: boolean };

export const Route = createFileRoute("/_authenticated/vendors")({ component: () => <RequireModule module="vendors"><VendorsPage /></RequireModule> });

function VendorsPage() {
  const { data: rows } = useList<Row>("vendors", { orderBy: "name", ascending: true });
  const upsert = useUpsert("vendors", "הספק");
  const del = useDelete("vendors", "הספק");

  const fields = [
    { name: "name", label: "שם הספק", required: true, colSpan: 2 as const },
    { name: "vendor_type", label: "סוג", required: true, type: "select" as const, options: [
      { value: "transport", label: "הסעות" }, { value: "attraction", label: "אטרקציה" }, { value: "catering", label: "קייטרינג" }, { value: "venue", label: "אולם / מקום" }, { value: "media", label: "מדיה / צילום" }, { value: "other", label: "אחר" },
    ]},
    { name: "contact_name", label: "איש קשר" },
    { name: "phone", label: "טלפון", type: "tel" as const },
    { name: "email", label: "אימייל", type: "email" as const },
    { name: "address", label: "כתובת" },
    { name: "rate", label: "תעריף", type: "number" as const },
    { name: "rate_unit", label: "יחידה (לאוטובוס/ליחידה/לאדם...)", placeholder: "לדוגמה: לאוטובוס" },
    { name: "insurance_valid_until", label: "ביטוח בתוקף עד", type: "date" as const },
    { name: "safety_approval_valid_until", label: "אישור בטיחות עד", type: "date" as const },
    { name: "notes", label: "הערות", type: "textarea" as const, colSpan: 2 as const },
  ];

  return (
    <div>
      <PageHeader title="ספקים ואטרקציות" actions={
        <CrudDialog title="ספק חדש" fields={fields} onSubmit={(v) => upsert.mutateAsync(v)}
          trigger={<Button size="sm"><Plus className="size-4" /> ספק חדש</Button>} />
      } />
      <div className="p-8">
        <DataTable<Row> rows={rows}
          columns={[
            { key: "name", header: "שם" },
            { key: "vendor_type", header: "סוג" },
            { key: "contact_name", header: "איש קשר" },
            { key: "phone", header: "טלפון" },
            { key: "rate", header: "תעריף", render: (r) => r.rate ? `${formatCurrency(r.rate)} / ${r.rate_unit ?? ""}` : "—" },
            { key: "insurance_valid_until", header: "ביטוח עד", render: (r) => formatDate(r.insurance_valid_until) },
          ]}
          actions={(r) => (
            <div className="flex gap-1">
              <CrudDialog title="עריכת ספק" fields={fields} initial={r as unknown as Record<string, unknown>} onSubmit={(v) => upsert.mutateAsync(v)}
                trigger={<Button size="sm" variant="ghost"><Edit2 className="size-4" /></Button>} />
              <ConfirmDelete onConfirm={() => del.mutateAsync(r.id)} />
            </div>
          )}
        />
      </div>
    </div>
  );
}
