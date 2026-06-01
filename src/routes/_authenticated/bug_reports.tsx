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

const STATUS_LABELS: Record<string, string> = {
  open: 'פתוח',
  in_progress: 'בטיפול',
  resolved: 'נפתר',
  closed: 'סגור',
};

const STATUS_CLASSES: Record<string, string> = {
  open: 'bg-yellow-500/15 text-yellow-200 border border-yellow-500/20',
  in_progress: 'bg-sky-500/15 text-sky-200 border border-sky-500/20',
  resolved: 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/20',
  closed: 'bg-slate-500/15 text-slate-200 border border-slate-500/20',
};

export const Route = createFileRoute("/_authenticated/bug_reports")({ component: BugReports });

function BugReports() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["bug-reports"],
    queryFn: async () => {
      const { data } = await supabase.from("bug_reports").select("*").order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ['profiles-list-for-assign'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('user_id,full_name').order('full_name', { ascending: true });
      return data ?? [];
    },
  });

  const profilesMap = useMemo(
    () => (profiles ?? []).reduce((acc: any, p: any) => ({ ...acc, [p.user_id]: p.full_name ?? p.user_id }), {} as Record<string, string>),
    [profiles],
  );

  useEffect(() => {
    const subs: any[] = [];
    try {
      if ((supabase as any).channel) {
        const ch = (supabase as any)
          .channel('public:bug_reports')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'bug_reports' }, () => qc.invalidateQueries({ queryKey: ['bug-reports'] }))
          .subscribe();
        subs.push(ch);
      } else if ((supabase as any).from) {
        const s = (supabase as any).from('bug_reports').on('*', () => qc.invalidateQueries({ queryKey: ['bug-reports'] })).subscribe();
        subs.push(s);
      }
    } catch (err) {
      // ignore subscription errors
    }
    return () => {
      subs.forEach((s) => {
        try {
          if (s?.unsubscribe) s.unsubscribe();
          else if ((supabase as any).removeChannel) (supabase as any).removeChannel(s);
        } catch (_) {}
      });
    };
  }, [qc]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    await supabase.from("bug_reports").insert({ reporter_id: user?.id ?? null, title: title.trim(), description: description.trim(), status: 'open' });
    setTitle("");
    setDescription("");
    qc.invalidateQueries({ queryKey: ["bug-reports"] });
  };

  const updateReport = async (id: string, patch: any) => {
    await supabase.from('bug_reports').update(patch).eq('id', id);
    qc.invalidateQueries({ queryKey: ['bug-reports'] });
  };

  const reports = data ?? [];
  const filteredReports = filterStatus ? reports.filter((item: any) => item.status === filterStatus) : reports;
  const summary = useMemo(
    () => reports.reduce(
      (acc: Record<string, number>, item: any) => {
        acc[item.status] = (acc[item.status] ?? 0) + 1;
        return acc;
      },
      { open: 0, in_progress: 0, resolved: 0, closed: 0 },
    ),
    [reports],
  );

  return (
    <div className="min-h-screen">
      <header className="h-16 bg-card border-b flex items-center px-8 sticky top-0 z-10">
        <div>
          <h2 className="text-lg font-semibold">דיווח באגים והצעות</h2>
          <p className="text-sm text-muted-foreground">תעדף תיקונים, עקוב אחרי סטטוס והקצה אחראי.</p>
        </div>
      </header>

      <div className="p-8 space-y-6">
        <Card className="p-4 grid gap-4 xl:grid-cols-[1.8fr_1.2fr]">
          <div>
            <h3 className="text-base font-semibold">ניטור בעיות</h3>
            <p className="text-sm text-muted-foreground">ראה כמה דיווחים יש בכל סטטוס.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Object.entries(summary).map(([status, count]) => (
                <div key={status} className="rounded-2xl border border-white/10 bg-slate-950/80 p-3">
                  <div className="text-sm text-muted-foreground">{STATUS_LABELS[status] ?? status}</div>
                  <div className="mt-2 text-2xl font-semibold">{count}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-sm font-semibold">מסנן סטטוס</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFilterStatus("")}
                  className={`rounded-full border px-3 py-2 text-sm transition ${!filterStatus ? 'bg-primary text-primary-foreground border-transparent' : 'bg-white/5 text-white/80 hover:border-white/20'}`}
                >
                  הכל
                </button>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilterStatus(value)}
                    className={`rounded-full border px-3 py-2 text-sm transition ${filterStatus === value ? 'bg-primary text-primary-foreground border-transparent' : 'bg-white/5 text-white/80 hover:border-white/20'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold">יצירת דיווח חדש</div>
              <p className="text-sm text-muted-foreground">שלח בעיה או בקשת שיפור בקלות.</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div>
              <Label>כותרת</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <Label>תיאור</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} required className="min-h-[120px]" />
            </div>
            <div className="lg:col-span-2 flex justify-end">
              <Button type="submit">דווח</Button>
            </div>
          </form>
        </Card>

        <section className="space-y-4">
          {filteredReports.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">אין דיווחים להצגה כרגע.</Card>
          ) : (
            <div className="space-y-4">
              {filteredReports.map((report: any) => (
                <Card key={report.id} className="p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                        <h3 className="text-base font-semibold">{report.title}</h3>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASSES[report.status] ?? 'bg-white/5 text-white/80'}`}>
                          {STATUS_LABELS[report.status] ?? report.status}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {profilesMap[report.reporter_id] ?? 'משתמש לא מזוהה'} · {new Date(report.created_at).toLocaleString()}
                        {report.assigned_to ? ` · אחראי: ${profilesMap[report.assigned_to] ?? report.assigned_to}` : ''}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="grid gap-3 sm:w-80">
                        <label className="grid gap-2 text-sm">
                          סטטוס
                          <select
                            value={report.status}
                            onChange={(e) => updateReport(report.id, { status: e.target.value })}
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                          >
                            {Object.entries(STATUS_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="grid gap-2 text-sm">
                          קבע אחראי
                          <select
                            value={report.assigned_to ?? ""}
                            onChange={(e) => updateReport(report.id, { assigned_to: e.target.value || null })}
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                          >
                            <option value="">לא מוקצה</option>
                            {(profiles ?? []).map((p: any) => (
                              <option key={p.user_id} value={p.user_id}>{p.full_name ?? p.user_id}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 text-sm leading-6 text-muted-foreground">{report.description}</div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
