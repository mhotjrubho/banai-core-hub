import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/bug-reports")({ component: BugReports });

function BugReports() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["bug-reports"],
    queryFn: async () => {
      const { data } = await supabase.from("bug_reports").select("*").order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from("bug_reports").insert({ reporter_id: user?.id ?? null, title, description });
    setTitle("");
    setDescription("");
    qc.invalidateQueries(["bug-reports"]);
  };

  return (
    <div>
      <header className="h-16 bg-card border-b flex items-center px-8 sticky top-0 z-10">
        <h2 className="text-lg font-semibold">דיווח באגים והצעות</h2>
      </header>
      <div className="p-8 space-y-6">
        <Card className="p-4">
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>כותרת</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <Label>תיאור</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} required />
            </div>
            <div>
              <Button type="submit">דווח</Button>
            </div>
          </form>
        </Card>

        <section className="space-y-3">
          {(data ?? []).map((b: any) => (
            <Card key={b.id} className="p-3">
              <div className="text-sm text-muted-foreground">{b.title} · {b.status} · {new Date(b.created_at).toLocaleString()}</div>
              <div className="mt-1">{b.description}</div>
            </Card>
          ))}
        </section>
      </div>
    </div>
  );
}
