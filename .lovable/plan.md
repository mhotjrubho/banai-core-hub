
# תוכנית פיתוח: מערכת ERP "בני חיל"

מערכת SPA רספונסיבית ב-RTL מלא, על TanStack Start + Lovable Cloud (Postgres + Auth + Storage). כל הנתונים בזמן אמת דרך Supabase Realtime.

## שלב 0 — תשתית

- הפעלת Lovable Cloud (Auth + DB + Storage + Realtime).
- עיצוב: אציג 3 כיווני עיצוב (`design--create_directions`) ותבחר אחד לפני הבנייה הוויזואלית.
- שפה: עברית, RTL גלובלי, Heebo/Assistant.
- ארכיטקטורת קוד: TanStack file-routes, server functions לכל פעולה רגישה, RLS על כל טבלה.

## שלב 1 — מודל נתונים (Postgres)

### היררכיה גיאוגרפית (1:N קבועה)
`districts` → `cities` → `communities` → `yeshivas`
שיוך משתמש לרמה כלשהי = הרשאת צפייה לכל מה שתחתיה.

### ישויות ליבה
- **students** — ת.ז, שם, טלפון, 2 טל' הורים, community_id, yeshiva_id, shiur, smart_card_status.
- **staff** — ת.ז, שם, טל', בנק, role (field/city/district/head), group (בנים/בנות/אתיופים), district_id/city_id/community_id, salary_model (fixed/hourly/per_event), תנאי קליטה.
- **staff_contracts** — היסטוריית חוזים ושינויי תנאים (עם תאריך תוקף).
- **events** — סוג, תאריכי start/end, status (requested/admin_approved/logistics_approved/rejected), requesting_staff_id, expected_participants, community_ids[], total_budget, logistics_notes.
- **event_expense_items** — שורות דינמיות (סוג, כמות, תקציב מוערך, עלות בפועל) FK ל-event.
- **graphics_tasks** — event_id, creator, designer_id, deadline, status, type, dimensions, text, files[].
- **graphics_revisions** — סקיצות + פידבק לכל משימה.
- **inspector_reports** — תאריך ביקור, branch_id, district/city, expected vs actual participants, photos, notes.
- **vendors** — אטרקציות/מפעילים: שם, סוג, תעריף, אזורים, ביטוח/בטיחות בתוקף עד.
- **communities** + **yeshivas** — כישויות עצמאיות עם אנשי קשר.
- **payroll_calculations** — תחשיב חודשי לכל רכז (קריאה בלבד, ייצוא Excel/PDF).

### מערכת טפסים דינמית
- **form_definitions** — שם, slug, ייעוד, public_webhook_token.
- **form_fields** — type (text/number/date/select/checkbox/file/conditional), label, validation, options, conditional_logic JSON.
- **form_submissions** — form_id, payload JSONB, מקור (manual/webhook/public link).

### Auth & RBAC
- **profiles** (1:1 עם auth.users) — name, phone, scope_level (super/finance/secretary/district/city/coordinator/designer/dev), scope_ref_id (FK לרמה הגיאוגרפית).
- **roles** + **permissions** + **role_permissions** + **user_roles** — מודל פרטני; מנהל-על מגדיר בדיוק מי רואה/עורך מה (per-module, per-action).
- **audit_log** — actor, entity, action, before/after JSONB, timestamp.
- **webhook_log** — direction, source, payload גולמי, status, response.

### RLS
פונקציית `has_scope_access(user_id, geo_level, geo_id)` security-definer; כל policy נתמך עליה. תפקידים נשמרים אך ורק ב-`user_roles` (לעולם לא ב-profiles).

## שלב 2 — מסכי משתמש (לפי תפקיד)

דשבורד דינמי שמרכיב ויג'טים לפי `user_roles` ו-scope.

- **/login, /signup, /reset-password** — אימייל+סיסמה + Google (ברוקר Lovable).
- **/dashboard** — KPIs לפי scope.
- **/students** — טבלה + כרטיס + ייבוא CSV + סטטוס כרטיס חכם.
- **/staff** — טבלה + כרטיס + טאב חוזים + טאב תחשיב שכר.
- **/events** — Kanban לפי סטטוס, טופס בקשה דינמי, אישור מנהלי/לוגיסטי, הוצאות דינמיות, סיכום תקציב מול ביצוע.
- **/graphics** — לוח משימות לגרפיקאיות (Kanban), העלאת סקיצות, פידבק/אישור.
- **/inspectors** — דיווחי שטח מסוננים לפי מחוז, גלריית תמונות.
- **/vendors** — קטלוג אטרקציות + התראות תפוגת ביטוח.
- **/communities, /yeshivas, /districts** — ניהול ישויות גיאוגרפיות.
- **/forms** — מחולל טפסים מתקדם (drag-drop fields, תנאים, ולידציה, יצירת קישור ציבורי וקבלת submissions).
- **/reports** — בונה דוחות + ייצוא Excel/CSV/PDF (נוכחות, תקציב, שכר, משימות).
- **/admin/users** — מנהל-על: ניהול משתמשים, הרשאות פרטניות, scope.
- **/admin/webhooks** — endpoints, field mapping ל-DB, התראות כשל.
- **/admin/logs** — audit + webhook logs עם פילטרים.
- **/admin/settings** — הגדרות כלליות, ערכת נושא, גיבויים.

## שלב 3 — Server functions (TanStack)

כל מוטציה רגישה דרך `createServerFn` + `requireSupabaseAuth`:
- CRUD לכל ישות + בדיקת scope.
- `submitEventRequest`, `approveEvent`, `assignDesigner`, `uploadRevision`.
- `calculatePayroll(staff_id, month)` — מחושב מאירועים/שעות/חוזה.
- `exportReport(type, filters, format)`.
- `generateFormPublicLink(form_id)`.

## שלב 4 — Webhooks (תשתית מוכנה, mock כרגע)

- `/api/public/webhooks/forms/:token` — קליטת submissions מטופס ציבורי.
- `/api/public/webhooks/incoming/:source` — endpoint גנרי עם field mapping מ-DB (ימות המשיח / נדרים פלוס / קהילות קארד מוכנים כתבניות אך לא פעילים).
- אימות HMAC לכל endpoint, לוג מלא, התראת מייל כשל.
- מסך admin להגדרת mapping ללא קוד.

## שלב 5 — דוחות וייצוא

- בונה דוחות: בחירת ישות → פילטרים → עמודות → ייצוא.
- פורמטים: xlsx (exceljs), csv, pdf (pdfmake עם פונט עברית).
- דוחות מוגדרים מראש: נוכחות, תקציב מול ביצוע, שכר חודשי, סטטוס משימות.

## שלב 6 — גיבויים

- שלב MVP: ייצוא ידני של כל ה-DB ל-JSON/SQL מתוך admin.
- שלב המשך (אחרי שיתחבר Drive connector): cron יומי שדוחף backup מוצפן ל-Google Drive.

---

## פרטים טכניים

- **Stack**: TanStack Start + React 19 + Tailwind v4 + shadcn + Lovable Cloud (Supabase).
- **Realtime**: subscriptions ל-events, graphics_tasks, inspector_reports.
- **RTL**: `dir="rtl"` ב-`__root.tsx`, התאמת shadcn (icons + spacing).
- **File storage**: bucket-ים נפרדים — `graphics`, `inspector-photos`, `form-uploads`, `backups`.
- **Audit**: trigger Postgres על כל טבלה רגישה שכותב ל-`audit_log`.
- **Logs UI**: דף מתכנת עם פילטר actor/entity/date + הצגת diff.

---

## הערות לפני בנייה

1. **היקף ענק** — נבנה הכל בסבב אחד אך הבנייה תיקח זמן וקרדיטים. אם תרצה לבצע בשלבים (קודם Auth+Students+Staff, אח"כ Events+Graphics, אח"כ Forms+Reports+Admin) — אגיש בלוקים. אחרת אבנה ברצף.
2. **לפני קוד UI** אריץ `design--create_directions` ואציג 3 כיוונים — תבחר אחד.
3. **כרטיסים חכמים / נדרים פלוס / ימות המשיח** — המבנה והUI יבנו כעת; ההפעלה בפועל תדרוש רק חיבור endpoints והגדרת mapping במסך admin כשתקבל גישה.
