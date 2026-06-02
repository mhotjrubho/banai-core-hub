import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { AppSidebar } from "@/components/app-sidebar";
import { NotificationBell } from "@/components/notification-bell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { loading, user } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">טוען...</div>;
  if (!user) return null;
  return (
    <div className="min-h-screen flex bg-brand-surface">
      <AppSidebar />
      <main className="flex-1 overflow-x-hidden flex flex-col">
        {/* Top bar with notifications */}
        <div className="h-14 bg-card border-b border-border flex items-center justify-end px-6 sticky top-0 z-10">
          <NotificationBell />
        </div>
        {/* Main content */}
        <div className="flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
