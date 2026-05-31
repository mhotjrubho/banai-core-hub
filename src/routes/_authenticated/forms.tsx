import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireModule } from "@/components/require-module";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, ExternalLink, Copy, Eye } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog } from "@/components/crud-dialog";
import { ConfirmDelete } from "@/components/confirm-delete";
import { useList, useUpsert, useDelete } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/forms")({ component: () => <RequireModule module="forms"><FormsPage /></RequireModule> });

type FormDef = { id: string; slug: string; name: string; description: string | null; is_public: boolean; is_active: boolean; public_token: string | null; target_table: string | null };
type Field = { id: string; form_id: string; field_key: string; label: string; field_type: string; is_required: boolean; sort_order: number; options: unknown; placeholder: string | null };

const randomToken = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

function FormsPage() {
  const { data: forms } = useList<FormDef>("form_definitions", { orderBy: "created_at" });
  const upsert = useUpsert("form_definitions", "הטופס");
  const del = useDelete("form_definitions", "הטופס");
  const [editing, setEditing] = useState<FormDef | null>(null);

  const fields = [
    { name: "name", label: "שם הטופס", required: true },
    { name: "slug", label: "מזהה (slug)", required: true, placeholder: "registration" },
    { name: "description", label: "תיאור", type: "textarea" as const, colSpan: 2 as const },
    { name: "target_table", label: "טבלת יעד (אופציונלי)", type: "select" as const, options: [
      { value: "students", label: "תלמידים" }, { value: "staff", label: "כוח אדם" }, { value: "inspector_reports", label: "דיווחי בקרים" },
    ]},
  ];

  return (
    <div>
      <PageHeader title="טפסים דינמיים" actions={
        <CrudDialog title="טופס חדש" fields={fields}
          onSubmit={(v) => upsert.mutateAsync({ ...v, public_token: randomToken(), is_public: true, is_active: true })}
          trigger={<Button size="sm"><Plus className="size-4" /> טופס חדש</Button>} />
      } />
      <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-4 lg:col-span-1">
          <h3 className="font-bold mb-4">רשימת טפסים</h3>
          <DataTable<FormDef> rows={forms}
            columns={[
              { key: "name", header: "שם", render: (f) => (
                <button onClick={() => setEditing(f)} className="text-right hover:underline font-medium">{f.name}</button>
              )},
              { key: "is_public", header: "סטטוס", render: (f) => <Badge variant={f.is_active ? "default" : "outline"}>{f.is_active ? "פעיל" : "מושבת"}</Badge> },
            ]}
            actions={(r) => (<div className="flex gap-1">
              <CrudDialog title="עריכת טופס" fields={fields} initial={r as unknown as Record<string, unknown>}
                onSubmit={(v) => upsert.mutateAsync(v)} trigger={<Button size="sm" variant="ghost"><Edit2 className="size-4" /></Button>} />
              <ConfirmDelete onConfirm={() => del.mutateAsync(r.id)} />
            </div>)}
          />
        </Card>
        <Card className="p-4 lg:col-span-2">
          {editing ? <FormBuilder form={editing} /> : (
            <div className="text-center py-12 text-muted-foreground text-sm">בחר טופס מהרשימה כדי לערוך שדות וקישור ציבורי</div>
          )}
        </Card>
      </div>
    </div>
  );
}

function FormBuilder({ form }: { form: FormDef }) {
  const qc = useQueryClient();
  const { data: fields } = useQuery({
    queryKey: ["form_fields", form.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("form_fields").select("*").eq("form_id", form.id).order("sort_order");
      if (error) throw error;
      return data as Field[];
    },
  });
  const upd = useUpsert("form_definitions");
  const publicUrl = form.public_token ? `${typeof window !== "undefined" ? window.location.origin : ""}/forms/p/${form.public_token}` : null;

  const addField = async (values: Partial<Field>) => {
    const sort = (fields?.length ?? 0);
    const { error } = await supabase.from("form_fields").insert({
      form_id: form.id, sort_order: sort,
      field_key: values.field_key!, label: values.label!,
      field_type: values.field_type as never,
      is_required: values.is_required ?? false, placeholder: values.placeholder ?? null,
    });
    if (error) toast.error(error.message);
    else { toast.success("שדה נוסף"); qc.invalidateQueries({ queryKey: ["form_fields", form.id] }); }
  };

  const removeField = async (id: string) => {
    await supabase.from("form_fields").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["form_fields", form.id] });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-lg">{form.name}</h3>
          <p className="text-xs text-muted-foreground">{form.description}</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Switch checked={form.is_active} onCheckedChange={(v) => upd.mutateAsync({ id: form.id, is_active: v })} />
          <span>פעיל</span>
        </div>
      </div>

      {publicUrl && (
        <div className="bg-secondary/50 p-3 rounded-md flex items-center gap-2 text-xs">
          <span className="text-muted-foreground shrink-0">קישור ציבורי:</span>
          <code className="flex-1 truncate">{publicUrl}</code>
          <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("הקישור הועתק"); }}><Copy className="size-3" /></Button>
          <a href={publicUrl} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost"><ExternalLink className="size-3" /></Button></a>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-sm">שדות הטופס</h4>
          <AddFieldDialog onAdd={addField} />
        </div>
        <div className="border rounded-md divide-y">
          {(fields ?? []).map((f) => (
            <div key={f.id} className="flex items-center justify-between p-3 text-sm">
              <div>
                <div className="font-medium">{f.label} {f.is_required && <span className="text-destructive">*</span>}</div>
                <div className="text-xs text-muted-foreground">{f.field_key} • {f.field_type}</div>
              </div>
              <ConfirmDelete onConfirm={() => removeField(f.id)} />
            </div>
          ))}
          {!fields?.length && <div className="p-4 text-center text-xs text-muted-foreground">אין שדות עדיין</div>}
        </div>
      </div>

      <SubmissionsViewer formId={form.id} />
    </div>
  );
}

function AddFieldDialog({ onAdd }: { onAdd: (v: Partial<Field>) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<Partial<Field>>({ field_type: "text" });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="size-4" /> הוסף שדה</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>שדה חדש</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">מזהה שדה (אנגלית)</Label><Input value={v.field_key ?? ""} onChange={(e) => setV({ ...v, field_key: e.target.value })} placeholder="first_name" /></div>
          <div><Label className="text-xs">תווית</Label><Input value={v.label ?? ""} onChange={(e) => setV({ ...v, label: e.target.value })} /></div>
          <div><Label className="text-xs">סוג</Label>
            <Select value={v.field_type ?? "text"} onValueChange={(val) => setV({ ...v, field_type: val })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["text", "textarea", "number", "email", "tel", "date", "select", "checkbox", "radio"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2"><Switch checked={!!v.is_required} onCheckedChange={(c) => setV({ ...v, is_required: c })} /><Label className="text-xs">חובה</Label></div>
          <div><Label className="text-xs">placeholder</Label><Input value={v.placeholder ?? ""} onChange={(e) => setV({ ...v, placeholder: e.target.value })} /></div>
          <Button onClick={async () => { if (!v.field_key || !v.label) return toast.error("חובה למלא מזהה ותווית"); await onAdd(v); setOpen(false); setV({ field_type: "text" }); }}>הוסף</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SubmissionsViewer({ formId }: { formId: string }) {
  const { data: subs } = useQuery({
    queryKey: ["submissions", formId],
    queryFn: async () => {
      const { data } = await supabase.from("form_submissions").select("*").eq("form_id", formId).order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });
  return (
    <div>
      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Eye className="size-4" /> הגשות אחרונות ({subs?.length ?? 0})</h4>
      <div className="border rounded-md divide-y max-h-80 overflow-y-auto">
        {(subs ?? []).map((s) => (
          <div key={s.id} className="p-3 text-xs">
            <div className="text-muted-foreground mb-1">{new Date(s.created_at).toLocaleString("he-IL")} • {s.source}</div>
            <pre className="text-[11px] bg-muted/30 p-2 rounded overflow-x-auto">{JSON.stringify(s.payload, null, 2)}</pre>
          </div>
        ))}
        {!subs?.length && <div className="p-4 text-center text-xs text-muted-foreground">אין הגשות עדיין</div>}
      </div>
      <Link to="/forms" className="hidden">.</Link>
    </div>
  );
}
