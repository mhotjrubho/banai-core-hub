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
import { downloadXLSX } from "@/lib/csv";

type Row = { id: string; first_name: string; last_name: string; national_id: string | null; phone: string | null; parent1_phone: string | null; parent2_phone: string | null; shiur: string | null; community_id: string | null; yeshiva_id: string | null; smart_card_status: string; is_active: boolean };

export const Route = createFileRoute("/_authenticated/students")({ component: () => <RequireModule module="students"><StudentsPage /></RequireModule> });

function StudentsPage() {
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Row | null>(null);
  const { data: rows } = useList<Row>("students", { orderBy: "created_at" });
  const { data: communities } = useList<{ id: string; name: string }>("communities", { orderBy: "name", ascending: true });
  const { data: yeshivas } = useList<{ id: string; name: string }>("yeshivas", { orderBy: "name", ascending: true });
  const upsert = useUpsert("students", "התלמיד");
  const del = useDelete("students", "התלמיד");

  const filtered = useMemo(() => (rows ?? []).filter((r) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return [r.first_name, r.last_name, r.national_id, r.phone].some((v) => v?.toLowerCase().includes(s));
  }), [rows, q]);

  const fields = [
    { name: "first_name", label: "שם פרטי", required: true },
    { name: "last_name", label: "שם משפחה", required: true },
    { name: "national_id", label: "תעודת זהות" },
    { name: "phone", label: "טלפון נייד", type: "tel" as const },
    { name: "parent1_phone", label: "טלפון הורה 1", type: "tel" as const },
    { name: "parent2_phone", label: "טלפון הורה 2", type: "tel" as const },
    { name: "shiur", label: "שיעור" },
    { name: "community_id", label: "קהילה", type: "select" as const, options: (communities ?? []).map((c) => ({ value: c.id, label: c.name })) },
    { name: "yeshiva_id", label: "ישיבה", type: "select" as const, options: (yeshivas ?? []).map((y) => ({ value: y.id, label: y.name })) },
    { name: "smart_card_status", label: "סטטוס כרטיס חכם", type: "select" as const, options: [
      { value: "none", label: "ללא" }, { value: "pending", label: "ממתין" }, { value: "active", label: "פעיל" }, { value: "blocked", label: "חסום" },
    ]},
    { name: "notes", label: "הערות", type: "textarea" as const, colSpan: 2 as const },
  ];

  return (
    <div>
      <PageHeader title="ניהול תלמידים" actions={
        <>
          <Button variant="outline" size="sm" onClick={() => downloadXLSX("students.xlsx", filtered)}>ייצוא Excel</Button>
          <CrudDialog title="תלמיד חדש" fields={fields} onSubmit={(v) => upsert.mutateAsync(v)}
            trigger={<Button size="sm"><Plus className="size-4" /> הוסף תלמיד</Button>} />
        </>
      } />
      <div className="p-8 space-y-4">
        <Input placeholder="חיפוש לפי שם, ת.ז או טלפון..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />
        <DataTable<Row> rows={filtered}
          columns={[
            { key: "first_name", header: "שם פרטי" },
            { key: "last_name", header: "שם משפחה" },
            { key: "national_id", header: "ת.ז" },
            { key: "phone", header: "טלפון" },
            { key: "shiur", header: "שיעור" },
            { key: "smart_card_status", header: "כרטיס חכם" },
          ]}
          actions={(r) => (
            <div className="flex gap-1">
              <CrudDialog title="עריכת תלמיד" fields={fields} initial={r} onSubmit={(v) => upsert.mutateAsync(v)}
                trigger={<Button size="sm" variant="ghost"><Edit2 className="size-4" /></Button>} />
              <ConfirmDelete onConfirm={() => del.mutateAsync(r.id)} />
            </div>
          )}
        />
        {edit && <div className="hidden">{JSON.stringify(edit)}</div>}
      </div>
    </div>
  );
}
