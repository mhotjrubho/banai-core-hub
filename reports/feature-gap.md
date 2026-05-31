דוח מפגש מהיר — מימוש מול אפיון

תקציר
- המערכת מכילה מימוש מרכזי של UI ו-Routes עבור: התחברות/הרשמה, דשבורד, ניהול תלמידים, כוח אדם, אירועים, משימות גרפיקה, דיווחי בקרים, ספקים/אטרקציות, טפסים דינמיים ודוחות.
- סכמת DB העיקרית קיימת ב-`supabase/migrations/` וכוללת טבלאות רבות המוזכרות באפיון (profiles, user_roles, students, staff, events, event_expense_items, graphics_tasks, graphics_revisions, inspector_reports, vendors, form_definitions, form_fields, form_submissions, audit_log, webhook_log ועוד).
- קיימת אינטגרציה ל-OAuth דרך `lovable` (Google) ומנגנון `supabase` לשמירת סשנים.

מה מיושם (Present)
- Auth: `src/lib/auth-context.tsx` + `src/integrations/lovable/index.ts` + `src/integrations/supabase/client.ts`.
- Routes/UI: `src/routes/*` כולל מסכים לניהול `students`, `staff`, `events`, `graphics`, `forms`, `reports`, `admin.*`.
- DB: migrations יצירתיות למרבית הטבלאות המרכזיות (ראו `supabase/migrations/*.sql`).
- Admin logs & webhook logging: קיימים (`audit_log`, `webhook_log`).

החסרים/חסרים חלקית (Missing / Partial)
- Chat פנימי (`chat_messages`) — לא נמצא מימוש ב-UI או routes; סוגיית realtime לא מטופלת פה.
- הגדרות התראות מפורטות (`notifications_settings`) — לא נמצא UI/טבלאות ייעודיות.
- אינטגרציות חיצוניות מלאות: Google Drive backup, Google Forms import, תשלומים/נדרים פלוס/TikTok — במסמך התכנון מופיעות כ־placeholders, לא מחוברים.
- בדיקות אוטומטיות (unit/integration) וחוסן CI: לא נמצאו.
- מדיניות RLS/Policies מפורשות במיגרציות: לא זוהו מדיניות RLS בקבצי ה-SQL — יש לבדוק אם ה־project משתמש ב-RLS בחוץ (Supabase dashboard).
- תיעוד תפעולי (deploy, backup, envs) — הוספתי `supabase/README.md` אבל יש להרחיב README ראשי ודוק התפעול.

סיכונים לזכור
- הקוד מותאם להרצה על שרת (לא להתקין או לשנות תצורות פרוד באופן ישיר ללא גיבוי).
- `src/integrations/supabase/client.ts` עכשיו מחזיר Proxy אם משתני סביבה חסרים — שינוי זה שומר על יציבות אך יש לבדוק בסביבת שרת שהמשתנים מוגדרים כראוי.

צעדי המשך בטוחים (מועדפים כרגע)
1. (מיידי, בטוח) להפיק דוח מפורט מקובץ לייב: מיפוי routes ↔ טבלאות ומיפוי פיצ'רים חסרים — קובץ זה מוכן לקריאה (`reports/feature-gap.md`).
2. (מיידי, בטוח) להכין טיוטות מיגרציה ב`supabase/migrations_drafts/` עבור טבלאות חסרות כגון: `chat_messages`, `notifications_settings`, `bug_reports` — לא מריצים מיגרציות אוטומטית.
3. (בטוח) ליצור checklist להפעלת RLS וגרסאות גיבוי לפני כל מיגרציה_prod.
4. (אופציונלי) להוסיף בדיקות smoke פשוטות ל־auth ו־permissions (`tests/smoke/`) שרצות רק בסביבת dev/CI.

מה אני אעשה עכשיו (בלי לשנות קבצים פרוד):
- אייצר טיוטת מיגרציה עבור `chat_messages`, `notifications_settings`, ו-`bug_reports` תחת `supabase/migrations_drafts/`.
- אעדכן את ה-TODO ושם את השלב של סיכום findings כ"in-progress".

אם תרצה שאמשיך, אמשיך בביצוע של הטיוטות ונקודת הבדיקה הבאה תהיה הקבצים החדשים בתיקיית `supabase/migrations_drafts/`.
