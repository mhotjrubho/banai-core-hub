import { createFileRoute } from "@tanstack/react-router";
import { RequireModule } from "@/components/require-module";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { useList } from "@/lib/queries";
import { downloadXLSX, downloadCSV } from "@/lib/csv";
import { ROLE_LABELS, EVENT_STATUS_LABELS, GRAPHICS_STATUS_LABELS, formatDate, formatDateTime } from "@/lib/format";
import { FileSpreadsheet, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({ component: () => <RequireModule module="reports"><ReportsPage /></RequireModule> });

function ReportsPage() {
  const { data: students } = useList<Record<string, unknown>>("students");
  const { data: staff } = useList<Record<string, unknown>>("staff");
  const { data: events } = useList<Record<string, unknown>>("events");
  const { data: graphics } = useList<Record<string, unknown>>("graphics_tasks");
  const { data: inspectors } = useList<Record<string, unknown>>("inspector_reports");
  const { data: vendors } = useList<Record<string, unknown>>("vendors");

  const reports = [
    { label: "תלמידים", rows: students ?? [], file: "students" },
    { label: "כוח אדם", rows: (staff ?? []).map((s) => ({ ...s, role: ROLE_LABELS[s.role as string] ?? s.role })), file: "staff" },
    { label: "אירועים", rows: (events ?? []).map((e) => ({ ...e, status: EVENT_STATUS_LABELS[e.status as string] ?? e.status, start_at: formatDateTime(e.start_at as string) })), file: "events" },
    { label: "משימות גרפיקה", rows: (graphics ?? []).map((g) => ({ ...g, status: GRAPHICS_STATUS_LABELS[g.status as string] ?? g.status })), file: "graphics" },
    { label: "דיווחי בקרים", rows: (inspectors ?? []).map((i) => ({ ...i, visit_date: formatDate(i.visit_date as string) })), file: "inspector_reports" },
    { label: "ספקים", rows: vendors ?? [], file: "vendors" },
  ];

  return (
    <div>
      <PageHeader title="דוחות וייצוא" />
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((r) => (
            <Card key={r.file} className="p-5 space-y-3">
              <div>
                <h3 className="font-bold">{r.label}</h3>
                <p className="text-xs text-muted-foreground">{r.rows.length} רשומות</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => downloadXLSX(`${r.file}.xlsx`, r.rows)} disabled={!r.rows.length}>
                  <FileSpreadsheet className="size-4" /> Excel
                </Button>
                <Button size="sm" variant="outline" onClick={() => downloadCSV(`${r.file}.csv`, r.rows)} disabled={!r.rows.length}>
                  <FileText className="size-4" /> CSV
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
