import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Copy } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog } from "@/components/crud-dialog";
import { ConfirmDelete } from "@/components/confirm-delete";
import { useList, useUpsert, useDelete } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/webhooks")({ component: WebhooksPage });

type Row = { id: string; name: string; source: string; description: string | null; target_table: string | null; field_mapping: Record<string, string>; secret_key: string | null; is_active: boolean; notify_on_failure: boolean };

const randSecret = () => Array.from(crypto.getRandomValues(new Uint8Array(24))).map((b) => b.toString(16).padStart(2, "0")).join("");

function WebhooksPage() {
  const { data: rows } = useList<Row>("webhook_endpoints", { orderBy: "created_at" });
  const upsert = useUpsert("webhook_endpoints", "ה-Webhook");
  const del = useDelete("webhook_endpoints", "ה-Webhook");

  const fields = [
    { name: "name", label: "שם", required: true },
    { name: "source", label: "מקור (slug)", required: true, placeholder: "nedarim / yomim / kehilatcard / custom" },
    { name: "description", label: "תיאור", type: "textarea" as const, colSpan: 2 as const },
    { name: "target_table", label: "טבלת יעד", type: "select" as const, options: [
      { value: "students", label: "תלמידים" }, { value: "form_submissions", label: "הגשות טפסים" }, { value: "audit_log", label: "תיעוד בלבד" },
    ]},
  ];

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div>
      <PageHeader title="Webhooks ואינטגרציות" actions={
        <CrudDialog title="Webhook חדש" fields={fields}
          onSubmit={(v) => upsert.mutateAsync({ ...v, secret_key: randSecret(), is_active: true, notify_on_failure: true, field_mapping: {} })}
          trigger={<Button size="sm"><Plus className="size-4" /> חדש</Button>} />
      } />
      <div className="p-8 space-y-3">
        <div className="bg-secondary/50 p-3 rounded text-xs">
          <strong>נקודות קצה ציבוריות:</strong>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>טפסים: <code>{baseUrl}/api/public/forms/&lt;PUBLIC_TOKEN&gt;</code></li>
            <li>אינטגרציה כללית: <code>{baseUrl}/api/public/incoming/&lt;SOURCE&gt;</code> (כותרת <code>x-webhook-secret</code>)</li>
          </ul>
        </div>
        <DataTable<Row> rows={rows}
          columns={[
            { key: "name", header: "שם" },
            { key: "source", header: "מקור", render: (r) => <code>{r.source}</code> },
            { key: "target_table", header: "יעד" },
            { key: "is_active", header: "סטטוס", render: (r) => <Badge variant={r.is_active ? "default" : "outline"}>{r.is_active ? "פעיל" : "מושבת"}</Badge> },
            { key: "secret_key", header: "סוד", render: (r) => r.secret_key ? (
              <button onClick={() => { navigator.clipboard.writeText(r.secret_key!); toast.success("הועתק"); }} className="flex items-center gap-1 text-xs"><Copy className="size-3" /> העתק</button>
            ) : "—" },
          ]}
          actions={(r) => (
            <div className="flex gap-1">
              <CrudDialog title="עריכת Webhook" fields={fields} initial={r as unknown as Record<string, unknown>} onSubmit={(v) => upsert.mutateAsync(v)}
                trigger={<Button size="sm" variant="ghost"><Edit2 className="size-4" /></Button>} />
              <ConfirmDelete onConfirm={() => del.mutateAsync(r.id)} />
            </div>
          )}
        />
      </div>
    </div>
  );
}
