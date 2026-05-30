import { useEffect, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type Field = {
  name: string;
  label: string;
  type?: "text" | "number" | "email" | "tel" | "date" | "datetime-local" | "textarea" | "select";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  colSpan?: 1 | 2;
};

export function CrudDialog({
  title, fields, initial, onSubmit, trigger, submitLabel = "שמירה",
}: {
  title: string;
  fields: Field[];
  initial?: Record<string, unknown> | null;
  onSubmit: (values: Record<string, unknown>) => Promise<void> | void;
  trigger: ReactNode;
  submitLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) setValues(initial ?? {}); }, [open, initial]);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const cleaned: Record<string, unknown> = {};
      for (const f of fields) {
        const v = values[f.name];
        if (v === "" || v === undefined) cleaned[f.name] = null;
        else if (f.type === "number") cleaned[f.name] = v === null ? null : Number(v);
        else cleaned[f.name] = v;
      }
      if (initial?.id) cleaned.id = initial.id;
      await onSubmit(cleaned);
      setOpen(false);
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form onSubmit={handle} className="grid grid-cols-2 gap-4">
          {fields.map((f) => {
            const v = (values[f.name] ?? "") as string | number;
            const set = (val: unknown) => setValues((p) => ({ ...p, [f.name]: val }));
            return (
              <div key={f.name} className={f.colSpan === 2 ? "col-span-2" : "col-span-2 md:col-span-1"}>
                <Label className="mb-1.5 block text-xs">{f.label}{f.required && <span className="text-destructive"> *</span>}</Label>
                {f.type === "textarea" ? (
                  <Textarea value={v as string} onChange={(e) => set(e.target.value)} required={f.required} placeholder={f.placeholder} />
                ) : f.type === "select" ? (
                  <Select value={v ? String(v) : ""} onValueChange={set}>
                    <SelectTrigger><SelectValue placeholder={f.placeholder ?? "בחר..."} /></SelectTrigger>
                    <SelectContent>
                      {f.options?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input type={f.type ?? "text"} value={v as string} onChange={(e) => set(e.target.value)} required={f.required} placeholder={f.placeholder} />
                )}
              </div>
            );
          })}
          <DialogFooter className="col-span-2 mt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
            <Button type="submit" disabled={busy}>{busy ? "שומר..." : submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
