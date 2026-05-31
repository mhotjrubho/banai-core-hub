import { Link, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { canAccess, type Module } from "@/lib/permissions";
import {
  Users, UserCog, Calendar, Palette, ClipboardCheck, Store,
  MapPin, FileText, BarChart3, ShieldCheck, Activity, Webhook, LayoutDashboard, LogOut, Upload,
} from "lucide-react";

type NavItem = { to: string; label: string; icon: typeof Users; module: Module };

const NAV: NavItem[] = [
  { to: "/dashboard", label: "לוח בקרה", icon: LayoutDashboard, module: "dashboard" },
  { to: "/students", label: "תלמידים", icon: Users, module: "students" },
  { to: "/staff", label: "כוח אדם", icon: UserCog, module: "staff" },
  { to: "/events", label: "אירועים וטיולים", icon: Calendar, module: "events" },
  { to: "/graphics", label: "משימות גרפיקה", icon: Palette, module: "graphics" },
  { to: "/inspectors", label: "דיווחי בקרים", icon: ClipboardCheck, module: "inspectors" },
  { to: "/vendors", label: "ספקים ואטרקציות", icon: Store, module: "vendors" },
  { to: "/communities", label: "קהילות וישיבות", icon: MapPin, module: "geography" },
  { to: "/forms", label: "טפסים דינמיים", icon: FileText, module: "forms" },
  { to: "/reports", label: "דוחות וייצוא", icon: BarChart3, module: "reports" },
];

const ADMIN_NAV: NavItem[] = [
  { to: "/admin/users", label: "ניהול משתמשים", icon: ShieldCheck, module: "admin_users" },
  { to: "/admin/import", label: "ייבוא מאקסל", icon: Upload, module: "import" },
  { to: "/admin/logs", label: "לוגים ובקרה", icon: Activity, module: "admin_logs" },
  { to: "/admin/webhooks", label: "Webhooks", icon: Webhook, module: "admin_webhooks" },
];

export function AppSidebar() {
  const { profile, roles, isAdmin } = useAuth();
  const loc = useLocation();
  const isActive = (to: string) => loc.pathname === to || loc.pathname.startsWith(to + "/");
  const visibleMain = NAV.filter((n) => canAccess(roles, n.module));
  const visibleAdmin = ADMIN_NAV.filter((n) => canAccess(roles, n.module));

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col sticky top-0 h-screen shrink-0">
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-xl font-bold tracking-tight text-sidebar-accent">בני חיל</h1>
        <p className="text-[10px] text-white/50 mt-1 uppercase tracking-widest">מערכת ניהול</p>
      </div>
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {visibleMain.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              isActive(to) ? "bg-white/10 font-semibold" : "text-white/70 hover:bg-white/5 hover:text-white"
            }`}>
            <Icon className="size-4 shrink-0" /> {label}
          </Link>
        ))}
        {visibleAdmin.length > 0 && (
          <>
            <div className="pt-4 pb-2 text-[10px] uppercase tracking-widest text-white/40 font-bold px-3">ניהול מערכת</div>
            {visibleAdmin.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive(to) ? "bg-white/10 font-semibold" : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}>
                <Icon className="size-4 shrink-0" /> {label}
              </Link>
            ))}
          </>
        )}
      </nav>
      <div className="p-4 border-t border-sidebar-border space-y-3">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-sidebar-accent grid place-items-center text-xs font-bold text-accent-foreground">
            {profile?.full_name?.[0] ?? "?"}
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-xs font-medium truncate">{profile?.full_name ?? "משתמש"}</p>
            <p className="text-[10px] text-white/40">{isAdmin ? "מנהל מערכת" : roles[0] ?? "משתמש"}</p>
          </div>
        </div>
        <button onClick={() => supabase.auth.signOut()}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:bg-white/5 rounded-md transition-colors">
          <LogOut className="size-4" /> התנתק
        </button>
      </div>
    </aside>
  );
}
