
-- ===== Helper roles =====
CREATE OR REPLACE FUNCTION public.is_admin_or_dev(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles
                WHERE user_id=_uid AND role IN ('super_admin','developer','ceo'))
$$;

CREATE OR REPLACE FUNCTION public.is_finance_or_admin(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles
                WHERE user_id=_uid AND role IN ('super_admin','developer','ceo','finance','secretary'))
$$;

CREATE OR REPLACE FUNCTION public.is_coordinator_or_admin(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles
                WHERE user_id=_uid AND role IN ('super_admin','developer','ceo','secretary',
                  'district_head','city_coordinator','community_coordinator','field_coordinator','trip_coordinator','inspector'))
$$;

-- ===== STAFF =====
DROP POLICY IF EXISTS staff_read  ON public.staff;
DROP POLICY IF EXISTS staff_write ON public.staff;
CREATE POLICY staff_read ON public.staff FOR SELECT TO authenticated
  USING (public.is_finance_or_admin(auth.uid()) OR user_id = auth.uid());
CREATE POLICY staff_write ON public.staff FOR ALL TO authenticated
  USING (public.is_finance_or_admin(auth.uid()))
  WITH CHECK (public.is_finance_or_admin(auth.uid()));

-- ===== STAFF CONTRACTS =====
DROP POLICY IF EXISTS staff_contracts_read  ON public.staff_contracts;
DROP POLICY IF EXISTS staff_contracts_write ON public.staff_contracts;
CREATE POLICY staff_contracts_read ON public.staff_contracts FOR SELECT TO authenticated
  USING (public.is_finance_or_admin(auth.uid()));
CREATE POLICY staff_contracts_write ON public.staff_contracts FOR ALL TO authenticated
  USING (public.is_finance_or_admin(auth.uid()))
  WITH CHECK (public.is_finance_or_admin(auth.uid()));

-- ===== STUDENTS =====
DROP POLICY IF EXISTS students_read  ON public.students;
DROP POLICY IF EXISTS students_write ON public.students;
CREATE POLICY students_read ON public.students FOR SELECT TO authenticated
  USING (public.is_coordinator_or_admin(auth.uid()));
CREATE POLICY students_write ON public.students FOR ALL TO authenticated
  USING (public.is_coordinator_or_admin(auth.uid()))
  WITH CHECK (public.is_coordinator_or_admin(auth.uid()));

-- ===== WEBHOOK ENDPOINTS (contain secrets) =====
DROP POLICY IF EXISTS webhook_endpoints_read  ON public.webhook_endpoints;
DROP POLICY IF EXISTS webhook_endpoints_write ON public.webhook_endpoints;
CREATE POLICY webhook_endpoints_read ON public.webhook_endpoints FOR SELECT TO authenticated
  USING (public.is_admin_or_dev(auth.uid()));
CREATE POLICY webhook_endpoints_write ON public.webhook_endpoints FOR ALL TO authenticated
  USING (public.is_admin_or_dev(auth.uid()))
  WITH CHECK (public.is_admin_or_dev(auth.uid()));

-- ===== AUDIT LOG — only service_role inserts =====
DROP POLICY IF EXISTS audit_insert ON public.audit_log;
-- (no policy = no authenticated insert; service_role bypasses RLS)

-- ===== WEBHOOK LOG — only service_role inserts =====
DROP POLICY IF EXISTS webhook_log_insert ON public.webhook_log;

-- ===== FORM SUBMISSIONS — validate anon submissions =====
DROP POLICY IF EXISTS submissions_anon_insert ON public.form_submissions;
CREATE POLICY submissions_anon_insert ON public.form_submissions FOR INSERT TO anon
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.form_definitions f
    WHERE f.id = form_submissions.form_id AND f.is_public = true AND f.is_active = true
  ));

-- ===== STORAGE: graphics bucket — ownership-scoped writes =====
DROP POLICY IF EXISTS "graphics_select"  ON storage.objects;
DROP POLICY IF EXISTS "graphics_insert"  ON storage.objects;
DROP POLICY IF EXISTS "graphics_update"  ON storage.objects;
DROP POLICY IF EXISTS "graphics_delete"  ON storage.objects;

CREATE POLICY "graphics_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'graphics');
CREATE POLICY "graphics_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'graphics' AND owner = auth.uid());
CREATE POLICY "graphics_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'graphics' AND (owner = auth.uid() OR public.is_admin_or_dev(auth.uid())));
CREATE POLICY "graphics_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'graphics' AND (owner = auth.uid() OR public.is_admin_or_dev(auth.uid())));

-- ===== Revoke anon EXECUTE on security-definer helpers =====
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_roles(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_dev(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_finance_or_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_coordinator_or_admin(uuid) FROM anon;
