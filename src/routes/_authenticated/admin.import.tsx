import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { RequireModule } from "@/components/require-module";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/import")({
  component: () => <RequireModule module="import"><ImportPage /></RequireModule>,
});

type TargetTable = {
  table: string;
  label: string;
  fields: { key: string; label: string; required?: boolean }[];
  dedupOn?: string;
};

const TARGETS: TargetTable[] = [
  { table: "students", label: "תלמידים", dedupOn: "national_id", fields: [
    { key: "national_id", label: "תעודת זהות", required: true },
    { key: "first_name", label: "שם פרטי", required: true },
    { key: "last_name", label: "שם משפחה", required: true },
    { key: "phone", label: "טלפון" },
    { key: "parent1_phone", label: "טלפון הורה 1" },
    { key: "parent2_phone", label: "טלפון הורה 2" },
    { key: "shiur", label: "שיעור" },
    { key: "notes", label: "הערות" },
  ]},
  { table: "staff", label: "כוח אדם", dedupOn: "national_id", fields: [
    { key: "national_id", label: "תעודת זהות", required: true },
    { key: "first_name", label: "שם פרטי", required: true },
    { key: "last_name", label: "שם משפחה", required: true },
    { key: "phone", label: "טלפון" },
    { key: "email", label: "אימייל" },
    { key: "role", label: "תפקיד" },
    { key: "bank_name", label: "בנק" },
    { key: "bank_branch", label: "סניף" },
    { key: "bank_account", label: "חשבון" },
  ]},
  { table: "vendors", label: "ספקים ואטרקציות", fields: [
    { key: "name", label: "שם ספק", required: true },
    { key: "vendor_type", label: "סוג", required: true },
    { key: "contact_name", label: "איש קשר" },
    { key: "phone", label: "טלפון" },
    { key: "email", label: "אימייל" },
    { key: "rate", label: "תעריף" },
    { key: "rate_unit", label: "יחידת תעריף" },
    { key: "address", label: "כתובת" },
  ]},
  { table: "districts", label: "מחוזות", fields: [
    { key: "name", label: "שם מחוז", required: true },
    { key: "notes", label: "הערות" },
  ]},
  { table: "cities", label: "ערים", fields: [
    { key: "name", label: "שם עיר", required: true },
    { key: "district_id", label: "מזהה מחוז (UUID)", required: true },
  ]},
  { table: "communities", label: "קהילות", fields: [
    { key: "name", label: "שם קהילה", required: true },
    { key: "city_id", label: "מזהה עיר (UUID)", required: true },
    { key: "coordinator_name", label: "רכז" },
    { key: "phone", label: "טלפון" },
    { key: "email", label: "אימייל" },
    { key: "address", label: "כתובת" },
  ]},
  { table: "yeshivas", label: "ישיבות", fields: [
    { key: "name", label: "שם ישיבה", required: true },
    { key: "community_id", label: "מזהה קהילה (UUID)" },
    { key: "contact_name", label: "איש קשר" },
    { key: "phone", label: "טלפון" },
    { key: "email", label: "אימייל" },
    { key: "address", label: "כתובת" },
  ]},
];

type Step = "select-target" | "upload" | "map" | "result";

function normalize(v: string) {
  return String(v ?? "").trim().toLowerCase().replace(/[\s_\-]+/g, "");
}

function autoMap(sheetCols: string[], target: TargetTable): Record<string, string> {
  const map: Record<string, string> = {};
  for (const f of target.fields) {
    const candidates = [f.key, f.label].map(normalize);
    const match = sheetCols.find((c) => candidates.includes(normalize(c)));
    if (match) map[f.key] = match;
  }
  return map;
}

function ImportPage() {
  const [step, setStep] = useState<Step>("select-target");
  const [target, setTarget] = useState<TargetTable | null>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [sheetCols, setSheetCols] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ inserted: number; updated: number; failed: number; errors: string[] } | null>(null);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
    if (json.length === 0) { toast.error("הקובץ ריק"); return; }
    const cols = Object.keys(json[0]);
    setSheetCols(cols);
    setRows(json);
    if (target) setMapping(autoMap(cols, target));
    setStep("map");
  };

  const previewRows = useMemo(() => rows.slice(0, 5), [rows]);

  const runImport = async () => {
    if (!target) return;
    setBusy(true);
    const errors: string[] = [];
    let inserted = 0;
    let updated = 0;
    let failed = 0;

    // Build mapped rows
    const mapped = rows.map((r) => {
      const out: Record<string, unknown> = {};
      for (const [tk, sk] of Object.entries(mapping)) {
        if (sk) {
          const v = r[sk];
          out[tk] = v === "" ? null : v;
        }
      }
      return out;
    }).filter((r) => Object.values(r).some((v) => v !== null && v !== undefined && v !== ""));

    // Validate required fields
    const requiredFields = target.fields.filter((f) => f.required).map((f) => f.key);
    const validRows = mapped.filter((r, i) => {
      const missing = requiredFields.filter((f) => !r[f]);
      if (missing.length) {
        failed++;
        errors.push(`שורה ${i + 2}: חסרים שדות חובה: ${missing.join(", ")}`);
        return false;
      }
      return true;
    });

    // Batch upsert
    const batchSize = 200;
    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize);
      try {
        if (target.dedupOn) {
          const { data, error } = await (supabase as any)
            .from(target.table)
            .upsert(batch, { onConflict: target.dedupOn, ignoreDuplicates: false })
            .select("id");
          if (error) throw error;
          inserted += data?.length ?? batch.length;
        } else {
          const { data, error } = await (supabase as any)
            .from(target.table)
            .insert(batch)
            .select("id");
          if (error) throw error;
          inserted += data?.length ?? batch.length;
        }
      } catch (e: any) {
        failed += batch.length;
        errors.push(`אצווה ${i}-${i + batch.length}: ${e.message}`);
      }
    }

    setResult({ inserted, updated, failed, errors: errors.slice(0, 50) });
    setStep("result");
    setBusy(false);
    if (failed === 0) toast.success(`יובאו ${inserted} שורות בהצלחה`);
    else toast.warning(`יובאו ${inserted}, נכשלו ${failed}`);
  };

  const reset = () => {
    setStep("select-target"); setTarget(null); setRows([]); setSheetCols([]); setMapping({}); setFileName(""); setResult(null);
  };

  return (
    <div>
      <PageHeader title="ייבוא מאקסל" />
      <div className="p-8 max-w-5xl">
        {step === "select-target" && (
          <Card className="p-6">
            <h3 className="font-semibold mb-4">בחר טבלת יעד</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {TARGETS.map((t) => (
                <button key={t.table}
                  onClick={() => { setTarget(t); setStep("upload"); }}
                  className="text-right border rounded-lg p-4 hover:border-primary hover:bg-primary/5 transition">
                  <div className="flex items-center gap-2 mb-2">
                    <FileSpreadsheet className="size-5 text-primary" />
                    <span className="font-semibold">{t.label}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{t.fields.length} עמודות · {t.dedupOn ? `דדופ לפי ${t.dedupOn}` : "בלי דדופ"}</div>
                </button>
              ))}
            </div>
          </Card>
        )}

        {step === "upload" && target && (
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">העלאת קובץ — {target.label}</h3>
              <Button variant="ghost" size="sm" onClick={reset}><ArrowLeft className="size-4" /> חזרה</Button>
            </div>
            <Label className="border-2 border-dashed rounded-lg p-12 flex flex-col items-center gap-3 cursor-pointer hover:border-primary">
              <Upload className="size-10 text-muted-foreground" />
              <span className="font-semibold">לחץ לבחירת קובץ Excel/CSV</span>
              <span className="text-xs text-muted-foreground">.xlsx · .xls · .csv</span>
              <Input type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </Label>
          </Card>
        )}

        {step === "map" && target && (
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">התאמת עמודות — {target.label}</h3>
                <p className="text-xs text-muted-foreground">{fileName} · {rows.length} שורות</p>
              </div>
              <Button variant="ghost" size="sm" onClick={reset}><ArrowLeft className="size-4" /> חזרה</Button>
            </div>
            <div className="space-y-2">
              {target.fields.map((f) => (
                <div key={f.key} className="grid grid-cols-[1fr_1fr] gap-3 items-center border-b py-2">
                  <div>
                    <div className="font-semibold text-sm">{f.label} {f.required && <Badge variant="destructive" className="text-[10px]">חובה</Badge>}</div>
                    <div className="text-xs text-muted-foreground font-mono">{f.key}</div>
                  </div>
                  <select value={mapping[f.key] ?? ""}
                    onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}
                    className="border rounded-md bg-background px-3 py-2 text-sm">
                    <option value="">-- דלג --</option>
                    {sheetCols.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <details className="border rounded-md p-3">
              <summary className="cursor-pointer text-sm font-semibold">תצוגה מקדימה (5 שורות ראשונות)</summary>
              <div className="overflow-x-auto mt-3">
                <table className="text-xs w-full">
                  <thead><tr>{sheetCols.map((c) => <th key={c} className="text-right p-1 border-b">{c}</th>)}</tr></thead>
                  <tbody>{previewRows.map((r, i) => (
                    <tr key={i}>{sheetCols.map((c) => <td key={c} className="p-1 border-b">{String(r[c] ?? "")}</td>)}</tr>
                  ))}</tbody>
                </table>
              </div>
            </details>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep("upload")}>חזרה</Button>
              <Button onClick={runImport} disabled={busy}>
                {busy ? "מייבא..." : `ייבא ${rows.length} שורות`}
              </Button>
            </div>
          </Card>
        )}

        {step === "result" && result && (
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">סיכום ייבוא</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="border rounded-md p-4 text-center">
                <div className="text-3xl font-bold text-emerald-600">{result.inserted}</div>
                <div className="text-sm text-muted-foreground">יובאו בהצלחה</div>
              </div>
              <div className="border rounded-md p-4 text-center">
                <div className="text-3xl font-bold text-amber-600">{result.updated}</div>
                <div className="text-sm text-muted-foreground">עודכנו</div>
              </div>
              <div className="border rounded-md p-4 text-center">
                <div className="text-3xl font-bold text-destructive">{result.failed}</div>
                <div className="text-sm text-muted-foreground">נכשלו</div>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="border rounded-md p-3 bg-destructive/5 max-h-60 overflow-y-auto">
                <div className="font-semibold text-sm mb-2">שגיאות:</div>
                <ul className="text-xs space-y-1">
                  {result.errors.map((e, i) => <li key={i} className="font-mono">• {e}</li>)}
                </ul>
              </div>
            )}
            <div className="flex justify-end"><Button onClick={reset}>ייבוא נוסף</Button></div>
          </Card>
        )}
      </div>
    </div>
  );
}
