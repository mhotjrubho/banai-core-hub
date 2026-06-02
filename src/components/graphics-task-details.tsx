import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Upload, Trash2, Download, MessageSquare, ImageIcon, FileText, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

const PLATFORMS = [
  { key: "general",   label: "כללי",     color: "bg-slate-500/15 text-slate-700 dark:text-slate-300" },
  { key: "facebook",  label: "פייסבוק",  color: "bg-blue-600/15 text-blue-700 dark:text-blue-300" },
  { key: "instagram", label: "אינסטגרם", color: "bg-pink-600/15 text-pink-700 dark:text-pink-300" },
  { key: "whatsapp",  label: "ווטסאפ",   color: "bg-green-600/15 text-green-700 dark:text-green-300" },
  { key: "tiktok",    label: "טיקטוק",   color: "bg-fuchsia-600/15 text-fuchsia-700 dark:text-fuchsia-300" },
  { key: "print",     label: "הדפסה",    color: "bg-amber-600/15 text-amber-700 dark:text-amber-300" },
  { key: "email",     label: "אימייל",   color: "bg-cyan-600/15 text-cyan-700 dark:text-cyan-300" },
];

export function GraphicsTaskDetails({ taskId, trigger }: { taskId: string; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>פרטי משימה — קבצים ותגובות</DialogTitle>
        </DialogHeader>
        {open && <TaskContent taskId={taskId} />}
      </DialogContent>
    </Dialog>
  );
}

function TaskContent({ taskId }: { taskId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState("general");
  const [uploading, setUploading] = useState(false);
  const [commentText, setCommentText] = useState("");

  const { data: files = [] } = useQuery({
    queryKey: ["gfx-files", taskId],
    queryFn: async () => {
      const { data } = await supabase.from("graphics_files" as never).select("*").eq("task_id", taskId).order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["gfx-comments", taskId],
    queryFn: async () => {
      const { data } = await supabase.from("graphics_comments" as never).select("*").eq("task_id", taskId).order("created_at", { ascending: true });
      return (data ?? []) as any[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-list"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id,full_name");
      return data ?? [];
    },
  });
  const nameOf = (id: string | null) => profiles.find((p: any) => p.user_id === id)?.full_name ?? "משתמש";

  // Signed URLs for previews (bucket is private)
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries: Record<string, string> = {};
      for (const f of files) {
        try {
          const { data } = await supabase.storage.from("graphics").createSignedUrl(f.file_path, 60 * 60);
          if (data?.signedUrl) entries[f.id] = data.signedUrl;
        } catch {}
      }
      if (!cancelled) setUrls(entries);
    })();
    return () => { cancelled = true; };
  }, [files]);

  useEffect(() => {
    const ch1 = supabase.channel(`gfx-files-${taskId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "graphics_files", filter: `task_id=eq.${taskId}` },
        () => qc.invalidateQueries({ queryKey: ["gfx-files", taskId] })).subscribe();
    const ch2 = supabase.channel(`gfx-comments-${taskId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "graphics_comments", filter: `task_id=eq.${taskId}` },
        () => qc.invalidateQueries({ queryKey: ["gfx-comments", taskId] })).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [taskId, qc]);

  const uploadFile = async (file: File) => {
    if (file.size > 25 * 1024 * 1024) { toast.error("הקובץ גדול מדי (מקסימום 25MB)"); return; }
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^\w.\-א-ת]/g, "_");
      const path = `${taskId}/${tab}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage.from("graphics").upload(path, file);
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("graphics_files" as never).insert({
        task_id: taskId, platform: tab, file_path: path, file_name: file.name,
        mime_type: file.type, size_bytes: file.size, uploaded_by: user?.id ?? null,
      } as never);
      if (insErr) throw insErr;
      toast.success("הקובץ הועלה");
    } catch (e: any) { toast.error(e.message ?? "שגיאה בהעלאה"); } finally { setUploading(false); }
  };

  const deleteFile = async (f: any) => {
    if (!confirm("למחוק את הקובץ?")) return;
    await supabase.storage.from("graphics").remove([f.file_path]);
    await supabase.from("graphics_files" as never).delete().eq("id", f.id);
    toast.success("הקובץ נמחק");
  };

  const sendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const text = commentText.trim();
    setCommentText("");
    const { error } = await supabase.from("graphics_comments" as never).insert({
      task_id: taskId, author_id: user?.id ?? null, body: text,
    } as never);
    if (error) toast.error(error.message);
  };

  const filesByPlatform = useMemo(() => {
    const m: Record<string, any[]> = {};
    for (const f of files) (m[f.platform] ||= []).push(f);
    return m;
  }, [files]);
  const currentFiles = filesByPlatform[tab] ?? [];
  const isImage = (mime?: string) => (mime ?? "").startsWith("image/");
  const formatSize = (n?: number) => {
    if (!n) return "";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="px-6 pb-6 space-y-6">
      {/* Platform tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-3 sticky top-0 bg-background pt-3 z-10">
        {PLATFORMS.map((p) => {
          const count = (filesByPlatform[p.key] ?? []).length;
          const active = p.key === tab;
          return (
            <button key={p.key} onClick={() => setTab(p.key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                active ? "bg-primary text-primary-foreground border-primary" : `${p.color} border-transparent hover:border-current`
              }`}>
              {p.label} {count > 0 && <span className="opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Upload zone */}
      <section className="rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-4">
        <label className="flex flex-col items-center justify-center gap-2 cursor-pointer text-center py-4">
          {uploading ? <Loader2 className="size-8 animate-spin text-accent" /> : <Upload className="size-8 text-accent" />}
          <span className="text-sm font-semibold">{uploading ? "מעלה..." : `העלה קובץ עבור: ${PLATFORMS.find((p) => p.key === tab)?.label}`}</span>
          <span className="text-xs text-muted-foreground">תמונות, PDF, וידאו וכו' — עד 25MB</span>
          <Input type="file" disabled={uploading} className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
        </label>
      </section>

      {/* File grid */}
      <section>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <ImageIcon className="size-4" /> קבצים בפלטפורמה זו
        </h3>
        {currentFiles.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6 border rounded-lg bg-muted/20">אין קבצים</div>
        ) : (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {currentFiles.map((f: any) => (
              <div key={f.id} className="border rounded-lg overflow-hidden bg-card group">
                <div className="aspect-square bg-muted grid place-items-center overflow-hidden">
                  {isImage(f.mime_type) && urls[f.id] ? (
                    <img src={urls[f.id]} alt={f.file_name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <FileText className="size-10 text-muted-foreground" />
                  )}
                </div>
                <div className="p-2 text-xs space-y-1">
                  <div className="font-medium truncate" title={f.file_name}>{f.file_name}</div>
                  <div className="text-muted-foreground flex items-center justify-between">
                    <span>{formatSize(f.size_bytes)}</span>
                    <span className="flex items-center gap-1">
                      {urls[f.id] && (
                        <a href={urls[f.id]} target="_blank" rel="noreferrer" download className="hover:text-primary"><Download className="size-3.5" /></a>
                      )}
                      {(f.uploaded_by === user?.id) && (
                        <button onClick={() => deleteFile(f)} className="hover:text-destructive"><Trash2 className="size-3.5" /></button>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Comments thread */}
      <section>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <MessageSquare className="size-4" /> תגובות ודיון
          <Badge variant="outline">{comments.length}</Badge>
        </h3>
        <div className="space-y-2 max-h-72 overflow-y-auto border rounded-lg p-3 bg-muted/20 mb-3">
          {comments.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">אין עדיין תגובות. פתח את הדיון.</p>}
          {comments.map((c: any) => {
            const mine = c.author_id === user?.id;
            return (
              <div key={c.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${mine ? "bg-accent text-accent-foreground" : "bg-card border"}`}>
                  <div className="text-[11px] font-semibold opacity-70 mb-0.5">{nameOf(c.author_id)}</div>
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{c.body}</div>
                  <div className="text-[10px] opacity-70 text-left mt-1">
                    {new Date(c.created_at).toLocaleString("he-IL", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <form onSubmit={sendComment} className="flex gap-2">
          <Textarea value={commentText} onChange={(e) => setCommentText(e.target.value)}
            placeholder="כתוב תגובה..." className="flex-1 min-h-[60px] resize-none"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendComment(e as any); } }} />
          <Button type="submit" size="icon" className="size-12 shrink-0" disabled={!commentText.trim()}>
            <Send className="size-4" />
          </Button>
        </form>
      </section>
    </div>
  );
}
