import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Upload, Trash2, ExternalLink, MessageSquare } from "lucide-react";
import { toast } from "sonner";

const PLATFORMS = [
  { key: "general", label: "כללי" },
  { key: "facebook", label: "פייסבוק" },
  { key: "instagram", label: "אינסטגרם" },
  { key: "whatsapp", label: "ווטסאפ" },
  { key: "tiktok", label: "טיקטוק" },
  { key: "print", label: "הדפסה" },
  { key: "email", label: "אימייל" },
];

export function GraphicsTaskDetails({ taskId, trigger }: { taskId: string; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>פרטי משימה — קבצים ותגובות</DialogTitle></DialogHeader>
        {open && <TaskContent taskId={taskId} />}
      </DialogContent>
    </Dialog>
  );
}

function TaskContent({ taskId }: { taskId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [platform, setPlatform] = useState("general");
  const [uploading, setUploading] = useState(false);
  const [commentText, setCommentText] = useState("");

  const { data: files } = useQuery({
    queryKey: ["gfx-files", taskId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("graphics_files").select("*").eq("task_id", taskId).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: comments } = useQuery({
    queryKey: ["gfx-comments", taskId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("graphics_comments").select("*").eq("task_id", taskId).order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const path = `${taskId}/${platform}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("graphics").upload(path, file);
      if (upErr) throw upErr;
      const { error: insErr } = await (supabase as any).from("graphics_files").insert({
        task_id: taskId, platform, file_path: path, file_name: file.name,
        mime_type: file.type, size_bytes: file.size, uploaded_by: user?.id ?? null,
      });
      if (insErr) throw insErr;
      qc.invalidateQueries({ queryKey: ["gfx-files", taskId] });
      toast.success("הקובץ הועלה");
    } catch (e: any) { toast.error(e.message); } finally { setUploading(false); }
  };

  const deleteFile = async (f: any) => {
    if (!confirm("למחוק את הקובץ?")) return;
    await supabase.storage.from("graphics").remove([f.file_path]);
    await (supabase as any).from("graphics_files").delete().eq("id", f.id);
    qc.invalidateQueries({ queryKey: ["gfx-files", taskId] });
  };

  const sendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const { error } = await (supabase as any).from("graphics_comments").insert({
      task_id: taskId, author_id: user?.id ?? null, body: commentText.trim(),
    });
    if (error) { toast.error(error.message); return; }
    setCommentText("");
    qc.invalidateQueries({ queryKey: ["gfx-comments", taskId] });
  };

  const fileUrl = (p: string) => supabase.storage.from("graphics").getPublicUrl(p).data.publicUrl;
  const filesByPlatform = (files ?? []).reduce((acc: Record<string, any[]>, f: any) => {
    (acc[f.platform] ||= []).push(f); return acc;
  }, {});

  return (
    <div className="space-y-6">
      <section>
        <h3 className="font-semibold mb-3 flex items-center gap-2"><Upload className="size-4" /> העלאת קובץ</h3>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label className="text-xs">פלטפורמה</Label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)}
              className="w-full border rounded-md bg-background px-3 py-2 text-sm">
              {PLATFORMS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
          <Label className="flex-1">
            <span className="text-xs block mb-1">קובץ</span>
            <Input type="file" disabled={uploading}
              onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
          </Label>
        </div>
      </section>

      <section>
        <h3 className="font-semibold mb-3">קבצים לפי פלטפורמה</h3>
        {PLATFORMS.map((p) => {
          const list = filesByPlatform[p.key] ?? [];
          if (list.length === 0) return null;
          return (
            <div key={p.key} className="border rounded-md p-3 mb-2">
              <div className="flex items-center gap-2 mb-2"><Badge>{p.label}</Badge><span className="text-xs text-muted-foreground">{list.length} קבצים</span></div>
              <div className="space-y-1">
                {list.map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between text-sm border-b last:border-0 py-1">
                    <a href={fileUrl(f.file_path)} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:underline">
                      <ExternalLink className="size-3" /> {f.file_name}
                    </a>
                    <Button size="sm" variant="ghost" onClick={() => deleteFile(f)}><Trash2 className="size-4" /></Button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {(files ?? []).length === 0 && <p className="text-sm text-muted-foreground">אין קבצים עדיין</p>}
      </section>

      <section>
        <h3 className="font-semibold mb-3 flex items-center gap-2"><MessageSquare className="size-4" /> תגובות</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3 bg-muted/20 mb-3">
          {(comments ?? []).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">אין תגובות</p>}
          {(comments ?? []).map((c: any) => (
            <div key={c.id} className="bg-background rounded-md p-2 text-sm">
              <div className="text-xs text-muted-foreground mb-1">{new Date(c.created_at).toLocaleString("he-IL")}</div>
              <div>{c.body}</div>
            </div>
          ))}
        </div>
        <form onSubmit={sendComment} className="flex gap-2">
          <Textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="כתוב תגובה..." className="flex-1 min-h-[60px]" />
          <Button type="submit">שלח</Button>
        </form>
      </section>
    </div>
  );
}
