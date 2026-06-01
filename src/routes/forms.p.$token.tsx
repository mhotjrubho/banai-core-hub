import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/forms/p/$token")({ component: PublicForm });

function PublicForm() {
  const { token } = Route.useParams();
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["public-form", token],
    queryFn: async () => {
      const { data: form } = await supabase.from("form_definitions").select("*").eq("public_token", token).eq("is_active", true).maybeSingle();
      if (!form) return null;
      const { data: fields } = await supabase.from("form_fields").select("*").eq("form_id", form.id).order("sort_order");
      return { form, fields: fields ?? [] };
    },
  });

  if (isLoading) return <div className="min-h-screen grid place-items-center">טוען...</div>;
  if (!data) return <div className="min-h-screen grid place-items-center text-muted-foreground">הטופס לא נמצא או הושבת</div>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`/api/public/forms/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      if (!res.ok) throw new Error("שגיאה בשליחה");
      setSubmitted(true);
      toast.success("הטופס נשלח בהצלחה");
    } catch (err) { toast.error(err instanceof Error ? err.message : "שגיאה"); }
    finally { setBusy(false); }
  };

  if (submitted) return (
    <div className="min-h-screen grid place-items-center p-4">
      <Card className="p-8 text-center max-w-md">
        <h2 className="text-xl font-bold mb-2">תודה!</h2>
        <p className="text-sm text-muted-foreground">הטופס נשלח בהצלחה.</p>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-secondary/30 py-12 px-4">
      <Card className="max-w-2xl mx-auto p-8">
        <h1 className="text-2xl font-bold mb-2">{data.form.name}</h1>
        {data.form.description && <p className="text-sm text-muted-foreground mb-6">{data.form.description}</p>}
        <form onSubmit={submit} className="space-y-4">
          {data.fields.map((f: any) => (
            <div key={f.id}>
              <Label className="mb-1 block text-sm">{f.label} {f.is_required && <span className="text-destructive">*</span>}</Label>
              {f.field_type === "textarea" ? (
                <Textarea required={f.is_required} placeholder={f.placeholder ?? ""} value={values[f.field_key] ?? ""} onChange={(e) => setValues({ ...values, [f.field_key]: e.target.value })} />
              ) : (
                <Input type={["email", "tel", "number", "date"].includes(f.field_type) ? f.field_type : "text"} required={f.is_required} placeholder={f.placeholder ?? ""} value={values[f.field_key] ?? ""} onChange={(e) => setValues({ ...values, [f.field_key]: e.target.value })} />
              )}
            </div>
          ))}
          <Button type="submit" disabled={busy} className="w-full">{busy ? "שולח..." : "שלח טופס"}</Button>
        </form>
      </Card>
    </div>
  );
}
