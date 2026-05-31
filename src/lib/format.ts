export const formatCurrency = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);

export const formatDate = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  return new Intl.DateTimeFormat("he-IL", { dateStyle: "short" }).format(new Date(d));
};

export const formatDateTime = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  return new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(new Date(d));
};

export { ROLE_LABELS } from "./permissions";

export const EVENT_STATUS_LABELS: Record<string, string> = {
  draft: "טיוטה",
  requested: "בבקשה",
  admin_approved: "אושר מנהלית",
  logistics_approved: "אושר לוגיסטית",
  in_progress: "בביצוע",
  completed: "הסתיים",
  rejected: "נדחה",
  cancelled: "בוטל",
};

export const GRAPHICS_STATUS_LABELS: Record<string, string> = {
  pending: "ממתין",
  in_progress: "בעבודה",
  sketch_uploaded: "סקיצה הועלתה",
  revision_requested: "נדרש תיקון",
  approved: "אושר",
  cancelled: "בוטל",
};
