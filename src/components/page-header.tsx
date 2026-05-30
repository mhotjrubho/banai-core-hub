import type { ReactNode } from "react";

export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <header className="h-16 bg-card border-b flex items-center justify-between px-8 sticky top-0 z-10">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="flex items-center gap-2">{actions}</div>
    </header>
  );
}
