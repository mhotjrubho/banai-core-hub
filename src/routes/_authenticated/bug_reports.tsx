import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Bug, Plus, AlertOctagon, AlertTriangle, Info, CircleDot,
  CheckCircle2, Loader2, XCircle, User as UserIcon,
} from "lucide-react";

const STATUSES = [
  { value: "open",        label: "פתוח",   icon: CircleDot,       color: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300" },
  { value: "in_progress", label: "בטיפול", icon: Loader2,         color: "bg-sky-500/15 text-sky-700 border-sky-500/30 dark:text-sky-300" },
  { value: "resolved",    label: "נפתר",   icon: CheckCircle2,    color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300" },
  { value: "closed",      label: "סגור",   icon: XCircle,         color: "bg-slate-500/15 text-slate-700 border-slate-500/30 dark:text-slate-300" },
] as const;

const PRIORITIES = [
  { value: "low",      label: "נמוכה",   icon: Info,          color: "bg-slate-500/15 text-slate-700 dark:text-slate-300" },
  { value: "normal",   label: "רגילה",   icon: Info,          color: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  { value: "high",     label: "גבוהה",   icon: AlertTriangle, color: "bg-orange-500/15 text-orange-700 dark:text-orange-300" },
  { value: "critical", label: "קריטית",  icon: AlertOctagon,  color: "bg-red-500/15 text-red-700 dark:text-red-300" },
];

export const Route = createFileRoute("/_authenticated/bug_reports")({ component: BugReports });

type Report = {
  id: string; title: string; description: string | null;
  status: string; priority: string | null;
  reporter_id: string | null; assigned_to: string | null;
  resolution_notes: string | null; created_at: string;
};

function BugReports() {
  const { user, isAdmin, hasRole } = useAuth();
  const canManage = isAdmin || hasRole("developer");
  const qc = useQueryClient();

  const { data: reports = [] } = useQuery({
    queryKey: ["bug-reports"],
    queryFn: async () => {
      const { data } = await supabase.from("bug_reports").select("*").order("created_at", { ascending: false }).limit(300);
      return (data ?? []) as Report[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-list-for-assign"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id,full_name").order("full_name", { ascending: true });
      return (data ?? []) as { user_id: string; full_name: string | null }[];
    },
  });
  const nameOf = (id: string | null) => id ? (profiles.find((p) => p.user_id === id)?.full_name ?? "—") : "—";

  useEffect(() => {
    const ch = supabase
      .channel("public:bug_reports")
      .on("postgres_changes", { event: "*", schema: "public", table: "bug_reports" },
        () => qc.invalidateQueries({ queryKey: ["bug-reports"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const [scope, setScope] = useState<"all" | "mine">("all");
  const visible = useMemo(() => scope === "mine"
    ? reports.filter((r) => r.reporter_id === user?.id)
    : reports, [reports, scope, user]);

  const byStatus = useMemo(() => {
    const m: Record<string, Report[]> = { open: [], in_progress: [], resolved: [], closed: [] };
    for (const r of visible) (m[r.status] ?? (m[r.status] = [])).push(r);
    return m;
  }, [visible]);

  return (
    <div className="min-h-screen">
      <header className="h-16 bg-card border-b flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-destructive/10 grid place-items-center"><Bug className="size-5 text-destructive" /></div>
          <div>
            <h2 className="text-lg font-bold">מרכז דיווח באגים והצעות</h2>
            <p className="text-sm text-muted-foreground">תעדף, סווג, הקצה אחראי ועקוב אחרי טיפול.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border bg-card p-0.5 text-sm">
            <button onClick={() => setScope("all")}
              className={`px-3 py-1.5 rounded-md ${scope === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>הכל</button>
            <button onClick={() => setScope("mine")}
              className={`px-3 py-1.5 rounded-md ${scope === "mine" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>שלי</button>
          </div>
          <NewReportDialog onCreated={() => qc.invalidateQueries({ queryKey: ["bug-reports"] })} />
        </div>
      </header>

      <div className="p-8 space-y-6">
        {/* Stats */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {STATUSES.map((s) => {
            const count = (byStatus[s.value] ?? []).length;
            const Icon = s.icon;
            return (
              <Card key={s.value} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                    <div className="text-2xl font-bold mt-1">{count}</div>
                  </div>
                  <div className={`size-10 rounded-lg grid place-items-center ${s.color} border`}><Icon className="size-5" /></div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Kanban */}
        <div className="grid gap-4 lg:grid-cols-4">
          {STATUSES.map((s) => {
            const items = byStatus[s.value] ?? [];
            const Icon = s.icon;
            return (
              <div key={s.value} className="bg-muted/40 rounded-xl border p-3 flex flex-col gap-3 min-h-[200px]">
                <div className={`flex items-center justify-between rounded-lg px-3 py-2 border ${s.color}`}>
                  <div className="flex items-center gap-2 font-semibold text-sm"><Icon className="size-4" /> {s.label}</div>
                  <Badge variant="outline" className="bg-background/60">{items.length}</Badge>
                </div>
                <div className="space-y-2">
                  {items.length === 0 && <div className="text-xs text-muted-foreground text-center py-4">אין דיווחים</div>}
                  {items.map((r) => (
                    <ReportCard key={r.id} report={r} canManage={canManage}
                      nameOf={nameOf} profiles={profiles}
                      onChange={() => qc.invalidateQueries({ queryKey: ["bug-reports"] })} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PriorityBadge({ value }: { value: string | null }) {
  const p = PRIORITIES.find((x) => x.value === (value ?? "normal")) ?? PRIORITIES[1];
  const Icon = p.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.color}`}>
      <Icon className="size-3" /> {p.label}
    </span>
  );
}

function ReportCard({ report, canManage, nameOf, profiles, onChange }: {
  report: Report; canManage: boolean; nameOf: (id: string | null) => string;
  profiles: { user_id: string; full_name: string | null }[]; onChange: () => void;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="w-full text-right bg-card border rounded-lg p-3 hover:border-accent hover:shadow-md transition space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-sm leading-tight line-clamp-2">{report.title}</h4>
            <PriorityBadge value={report.priority} />
          </div>
          {report.description && <p className="text-xs text-muted-foreground line-clamp-2">{report.description}</p>}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
            <span className="flex items-center gap-1"><UserIcon className="size-3" />{nameOf(report.reporter_id)}</span>
            <span>{new Date(report.created_at).toLocaleDateString("he-IL")}</span>
          </div>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{report.title}</DialogTitle></DialogHeader>
        <ReportDetails report={report} canManage={canManage} nameOf={nameOf} profiles={profiles} onChange={onChange} />
      </DialogContent>
    </Dialog>
  );
}

function ReportDetails({ report, canManage, nameOf, profiles, onChange }: {
  report: Report; canManage: boolean; nameOf: (id: string | null) => string;
  profiles: { user_id: string; full_name: string | null }[]; onChange: () => void;
}) {
  const [status, setStatus] = useState(report.status);
  const [priority, setPriority] = useState(report.priority ?? "normal");
  const [assignedTo, setAssignedTo] = useState(report.assigned_to ?? "");
  const [notes, setNotes] = useState(report.resolution_notes ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await supabase.from("bug_reports").update({
      status, priority, assigned_to: assignedTo || null, resolution_notes: notes || null,
    }).eq("id", report.id);
    setSaving(false);
    onChange();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <PriorityBadge value={priority} />
        <Badge variant="outline" className="text-xs">דיווח: {nameOf(report.reporter_id)}</Badge>
        <Badge variant="outline" className="text-xs">תאריך: {new Date(report.created_at).toLocaleString("he-IL")}</Badge>
      </div>
      {report.description && (
        <div className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap leading-relaxed">{report.description}</div>
      )}

      {canManage ? (
        <div className="space-y-3 pt-2 border-t">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">סטטוס</Label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm mt-1">
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">עדיפות</Label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm mt-1">
                {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label className="text-xs">אחראי</Label>
            <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm mt-1">
              <option value="">לא מוקצה</option>
              {profiles.map((p) => <option key={p.user_id} value={p.user_id}>{p.full_name ?? "משתמש"}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">הערות / פתרון</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 min-h-[80px]" />
          </div>
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>{saving ? "שומר..." : "שמור שינויים"}</Button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground border-t pt-3">
          <div>סטטוס: <strong>{STATUSES.find((s) => s.value === report.status)?.label ?? report.status}</strong></div>
          <div>אחראי: <strong>{nameOf(report.assigned_to)}</strong></div>
          {report.resolution_notes && <div className="mt-2">הערות: {report.resolution_notes}</div>}
        </div>
      )}
    </div>
  );
}

function NewReportDialog({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await supabase.from("bug_reports").insert({
      reporter_id: user?.id ?? null, title: title.trim(),
      description: description.trim() || null, priority, status: "open",
    });
    setSaving(false);
    setOpen(false); setTitle(""); setDescription(""); setPriority("normal");
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="size-4" /> דיווח חדש</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>דיווח באג / הצעת שיפור</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>כותרת קצרה</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="לדוגמה: כפתור הייבוא לא נטען" />
          </div>
          <div>
            <Label>תיאור מפורט</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
              className="min-h-[140px]" placeholder="מה ניסית לעשות? מה ציפית שיקרה? מה קרה בפועל?" />
          </div>
          <div>
            <Label>עדיפות</Label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm mt-1">
              {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>ביטול</Button>
            <Button type="submit" disabled={saving || !title.trim()}>{saving ? "שולח..." : "שלח דיווח"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
