import { createFileRoute } from "@tanstack/react-router";
import { RequireModule } from "@/components/require-module";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit2 } from "lucide-react";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog } from "@/components/crud-dialog";
import { ConfirmDelete } from "@/components/confirm-delete";
import { useList, useUpsert, useDelete } from "@/lib/queries";
import { ROLE_LABELS } from "@/lib/format";
import { downloadXLSX } from "@/lib/csv";

type Row = { id: string; first_name: string; last_name: string; role: string; national_id: string | null; phone: string | null; email: string | null; salary_model: string; bank_name: string | null; bank_branch: string | null; bank_account: string | null; staff_group: string | null; is_active: boolean };

export const Route = createFileRoute("/_authenticated/staff")({ component: () => <RequireModule module="staff"><StaffPage /></RequireModule> });

function StaffPage() {
  const [q, setQ] = useState("");
  const { data: rows } = useList<Row>("staff", { orderBy: "created_at" });
  const upsert = useUpsert("staff", "איש הצוות");
  const del = useDelete("staff", "איש הצוות");

  const filtered = useMemo(() => (rows ?? []).filter((r) =>
    !q || [r.first_name, r.last_name, r.national_id, r.phone, r.email].some((v) => v?.toLowerCase().includes(q.toLowerCase()))
  ), [rows, q]);

  const fields = [
    { name: "first_name", label: "שם פרטי", required: true },
    { name: "last_name", label: "שם משפחה", required: true },
    { name: "national_id", label: "תעודת זהות" },
    { name: "phone", label: "טלפון", type: "tel" as const },
    { name: "email", label: "אימייל", type: "email" as const },
    { name: "role", label: "תפקיד", required: true, type: "select" as const,
      options: Object.entries(ROLE_LABELS).map(([v, l]) => ({ value: v, label: l })) },
    { name: "salary_model", label: "מודל שכר", required: true, type: "select" as const, options: [
      { value: "fixed", label: "קבוע חודשי" }, { value: "hourly", label: "שעתי" }, { value: "per_event", label: "לפי אירוע" }, { value: "none", label: "ללא" },
    ]},
    { name: "staff_group", label: "קבוצה", type: "select" as const, options: [
      { value: "coordinators", label: "רכזים" }, { value: "operators", label: "מפעילים" }, { value: "inspectors", label: "בקרים" }, { value: "designers", label: "גרפיקאים" }, { value: "office", label: "משרד" },
    ]},
    { name: "bank_name", label: "בנק" },
    { name: "bank_branch", label: "סניף" },
    { name: "bank_account", label: "חשבון" },
  ];

  return (
    <div>
      <PageHeader title="כוח אדם" actions={
        <>
          <Button variant="outline" size="sm" onClick={() => downloadXLSX("staff.xlsx", filtered)}>ייצוא Excel</Button>
          <CrudDialog title="איש צוות חדש" fields={fields} onSubmit={(v) => upsert.mutateAsync(v)}
            trigger={<Button size="sm"><Plus className="size-4" /> הוסף</Button>} />
        </>
      } />
      <div className="p-8 space-y-4">
        <Input placeholder="חיפוש..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />
        <DataTable<Row> rows={filtered}
          columns={[
            { key: "first_name", header: "שם" },
            { key: "last_name", header: "משפחה" },
            { key: "role", header: "תפקיד", render: (r) => ROLE_LABELS[r.role] ?? r.role },
            { key: "phone", header: "טלפון" },
            { key: "salary_model", header: "מודל שכר" },
          ]}
          actions={(r) => (
            <div className="flex gap-1">
              <CrudDialog title="עריכה" fields={fields} initial={r} onSubmit={(v) => upsert.mutateAsync(v)}
                trigger={<Button size="sm" variant="ghost"><Edit2 className="size-4" /></Button>} />
              <ConfirmDelete onConfirm={() => del.mutateAsync(r.id)} />
            </div>
          )}
        />
      </div>
    </div>
  );
}
