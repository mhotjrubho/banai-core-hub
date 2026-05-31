Supabase migrations and setup

This folder contains SQL migrations used to create the application's database schema.

Quick notes:

- Apply migrations using the Supabase CLI or from your DB management tool.
- The schema includes core tables used by the app:
  - `profiles`, `user_roles`, `permissions`, `role_permissions`, `user_permissions`
  - `students`, `staff`, `staff_contracts`
  - `events`, `event_expense_items`
  - `graphics_tasks`, `graphics_revisions`
  - `inspector_reports`, `vendors`
  - `form_definitions`, `form_fields`, `form_submissions`
  - `audit_log`, `webhook_log`

Environment variables required for local dev and the frontend:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon/public key

Server-side (optional) uses:
- `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` may be used by server processes.

Notes and recommendations:
- Use Row Level Security (RLS) policies in Supabase for enforcing permissions server-side.
- The project contains triggers and helper functions (e.g., `handle_new_user`, `get_user_roles`).
- After applying migrations, verify that functions are granted to `authenticated` and `service_role` as needed.

If you need a migration added or an updated schema, tell me which tables/columns to add and I will prepare a migration SQL file.