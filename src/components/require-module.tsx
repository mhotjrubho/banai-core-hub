import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { canAccess, type Module } from "@/lib/permissions";
import { Card } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export function RequireModule({ module, children }: { module: Module; children: ReactNode }) {
  const { roles, loading } = useAuth();
  if (loading) return null;
  if (!canAccess(roles, module)) {
    return (
      <div className="p-8">
        <Card className="p-10 text-center max-w-md mx-auto">
          <ShieldAlert className="size-12 mx-auto mb-3 text-destructive" />
          <h3 className="font-bold text-lg">אין הרשאה למסך זה</h3>
          <p className="text-sm text-muted-foreground mt-2">פנה למנהל המערכת כדי לקבל גישה.</p>
        </Card>
      </div>
    );
  }
  return <>{children}</>;
}
