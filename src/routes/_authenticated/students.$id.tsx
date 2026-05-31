import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpsert } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/students/$id")({ component: StudentDetail });

function StudentDetail() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["student", id],
    queryFn: async () => {
      const { data } = await supabase.from("students").select("*").eq("id", id).maybeSingle();
      return data ?? null;
    },
    enabled: !!id,
  });

  const upsert = useUpsert("students", "תלמיד");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>(null);

  if (isLoading) return <div className="min-h-screen grid place-items-center">טוען...</div>;
  if (!data) return <div className="min-h-screen grid place-items-center text-muted-foreground">תלמיד לא נמצא</div>;

  const startEdit = () => { setForm(data); setEditing(true); };
  const save = async () => { await upsert.mutateAsync(form); setEditing(false); };

  return (
    <div>
      <header className="h-16 bg-card border-b flex items-center px-8 sticky top-0 z-10">
        <h2 className="text-lg font-semibold">כרטיס תלמיד</h2>
      </header>
      <div className="p-8">
        <Card className="p-6 space-y-4">
          {!editing ? (
            <div>
              <p className="text-lg font-bold">{data.first_name} {data.last_name}</p>
              <p className="text-sm text-muted-foreground">ת.ז: {data.national_id ?? '—'}</p>
              <p className="mt-2">טלפון: {data.phone ?? '—'}</p>
              <div className="mt-4"><Button onClick={startEdit}>ערוך</Button></div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label>שם פרטי</Label>
                <Input value={form.first_name ?? ''} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              </div>
              <div>
                <Label>שם משפחה</Label>
                <Input value={form.last_name ?? ''} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              </div>
              <div>
                <Label>טלפון</Label>
                <Input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <Button onClick={save}>שמור</Button>
                <Button variant="ghost" onClick={() => setEditing(false)}>בטל</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
