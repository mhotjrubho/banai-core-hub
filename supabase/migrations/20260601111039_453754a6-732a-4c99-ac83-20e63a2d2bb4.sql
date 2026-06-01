
-- ============ GRANTS + RLS for missing tables ============

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bug_reports TO authenticated;
GRANT ALL ON public.bug_reports TO service_role;
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bug_reports_read" ON public.bug_reports
  FOR SELECT TO authenticated USING (has_any_role(auth.uid()));
CREATE POLICY "bug_reports_insert" ON public.bug_reports
  FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid()));
CREATE POLICY "bug_reports_update_admin" ON public.bug_reports
  FOR UPDATE TO authenticated USING (is_super_admin(auth.uid()) OR has_role(auth.uid(),'developer'::app_role) OR reporter_id = auth.uid());
CREATE POLICY "bug_reports_delete_admin" ON public.bug_reports
  FOR DELETE TO authenticated USING (is_super_admin(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_read_own" ON public.chat_messages
  FOR SELECT TO authenticated USING (sender_id = auth.uid() OR recipient_id = auth.uid() OR recipient_id IS NULL);
CREATE POLICY "chat_send" ON public.chat_messages
  FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "chat_update_own" ON public.chat_messages
  FOR UPDATE TO authenticated USING (sender_id = auth.uid() OR recipient_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications_settings TO authenticated;
GRANT ALL ON public.notifications_settings TO service_role;
ALTER TABLE public.notifications_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_settings_own" ON public.notifications_settings
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ Graphics: comments + files ============

CREATE TABLE IF NOT EXISTS public.graphics_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.graphics_tasks(id) ON DELETE CASCADE,
  author_id UUID,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.graphics_comments TO authenticated;
GRANT ALL ON public.graphics_comments TO service_role;
ALTER TABLE public.graphics_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gfx_comments_read" ON public.graphics_comments
  FOR SELECT TO authenticated USING (has_any_role(auth.uid()));
CREATE POLICY "gfx_comments_write" ON public.graphics_comments
  FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid()));
CREATE POLICY "gfx_comments_update_own" ON public.graphics_comments
  FOR UPDATE TO authenticated USING (author_id = auth.uid() OR is_super_admin(auth.uid()));
CREATE POLICY "gfx_comments_delete_own" ON public.graphics_comments
  FOR DELETE TO authenticated USING (author_id = auth.uid() OR is_super_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.graphics_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.graphics_tasks(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'general',
  file_path TEXT NOT NULL,
  file_name TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.graphics_files TO authenticated;
GRANT ALL ON public.graphics_files TO service_role;
ALTER TABLE public.graphics_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gfx_files_read" ON public.graphics_files
  FOR SELECT TO authenticated USING (has_any_role(auth.uid()));
CREATE POLICY "gfx_files_write" ON public.graphics_files
  FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid()));
CREATE POLICY "gfx_files_update" ON public.graphics_files
  FOR UPDATE TO authenticated USING (uploaded_by = auth.uid() OR is_super_admin(auth.uid()));
CREATE POLICY "gfx_files_delete" ON public.graphics_files
  FOR DELETE TO authenticated USING (uploaded_by = auth.uid() OR is_super_admin(auth.uid()));

-- ============ Storage bucket for graphics ============

INSERT INTO storage.buckets (id, name, public)
VALUES ('graphics', 'graphics', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "graphics_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'graphics');
CREATE POLICY "graphics_auth_upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'graphics');
CREATE POLICY "graphics_auth_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'graphics');
CREATE POLICY "graphics_auth_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'graphics');
