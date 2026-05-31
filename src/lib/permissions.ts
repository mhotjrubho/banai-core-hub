import type { AppRole } from "./auth-context";

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "מנהל-על (מתכנת)",
  developer: "מתכנת",
  ceo: "מנכ\"ל",
  finance: "כספים",
  secretary: "מזכירות",
  district_head: "רכז מחוז",
  city_coordinator: "רכז עיר",
  community_coordinator: "רכז קהילה",
  field_coordinator: "רכז שטח / סניף",
  trip_coordinator: "אחראי טיולים",
  designer: "גרפיקאית",
  inspector: "בקר",
  employee: "עובד",
  student: "תלמיד",
};

export const ALL_ROLES = Object.keys(ROLE_LABELS) as AppRole[];

// Modules in the system. Each route is tied to one module.
export type Module =
  | "dashboard" | "students" | "staff" | "events" | "graphics"
  | "inspectors" | "vendors" | "geography" | "forms" | "reports"
  | "admin_users" | "admin_logs" | "admin_webhooks" | "import";

// Role → allowed modules. super_admin gets everything implicitly.
export const ROLE_MODULES: Record<AppRole, Module[]> = {
  super_admin: [
    "dashboard","students","staff","events","graphics","inspectors","vendors",
    "geography","forms","reports","admin_users","admin_logs","admin_webhooks","import",
  ],
  developer: [
    "dashboard","students","staff","events","graphics","inspectors","vendors",
    "geography","forms","reports","admin_users","admin_logs","admin_webhooks","import",
  ],
  ceo: [
    "dashboard","students","staff","events","graphics","inspectors","vendors",
    "geography","forms","reports","admin_users","admin_logs","import",
  ],
  finance: ["dashboard","staff","events","vendors","reports","admin_logs"],
  secretary: ["dashboard","students","staff","events","vendors","geography","forms","reports"],
  district_head: ["dashboard","students","staff","events","inspectors","geography","reports"],
  city_coordinator: ["dashboard","students","staff","events","inspectors","geography","reports"],
  community_coordinator: ["dashboard","students","events","inspectors","geography"],
  field_coordinator: ["dashboard","students","events","geography"],
  trip_coordinator: ["dashboard","events","vendors"],
  inspector: ["dashboard","inspectors"],
  designer: ["dashboard","graphics"],
  employee: ["dashboard"],
  student: [],
};

export function canAccess(roles: AppRole[], mod: Module): boolean {
  if (roles.includes("super_admin")) return true;
  return roles.some((r) => ROLE_MODULES[r]?.includes(mod));
}
