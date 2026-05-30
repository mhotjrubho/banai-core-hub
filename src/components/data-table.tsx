import type { ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T extends { id: string }>({
  columns, rows, empty = "אין נתונים להצגה", actions,
}: {
  columns: Column<T>[];
  rows: T[] | undefined;
  empty?: string;
  actions?: (row: T) => ReactNode;
}) {
  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => <TableHead key={c.key} className={c.className}>{c.header}</TableHead>)}
            {actions && <TableHead className="w-32 text-left">פעולות</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {!rows || rows.length === 0 ? (
            <TableRow><TableCell colSpan={columns.length + (actions ? 1 : 0)} className="text-center text-muted-foreground py-12">{empty}</TableCell></TableRow>
          ) : rows.map((row) => (
            <TableRow key={row.id}>
              {columns.map((c) => (
                <TableCell key={c.key} className={c.className}>
                  {c.render ? c.render(row) : ((row as Record<string, unknown>)[c.key] as ReactNode) ?? "—"}
                </TableCell>
              ))}
              {actions && <TableCell className="text-left">{actions(row)}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
