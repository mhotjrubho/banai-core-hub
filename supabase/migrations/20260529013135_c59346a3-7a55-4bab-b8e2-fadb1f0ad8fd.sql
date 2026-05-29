
-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.app_role AS ENUM (
  'super_admin', 'finance', 'secretary', 'district_head',
  'city_coordinator', 'community_coordinator', 'field_coordinator',
  'trip_coordinator', 'designer', 'inspector', 'developer'
);

CREATE TYPE public.scope_level AS ENUM ('global', 'district', 'city', 'community');
CREATE TYPE public.staff_role AS ENUM ('head_coordinator', 'district', 'city', 'field', 'trip', 'designer', 'inspector', 'other');
CREATE TYPE public.staff_group AS ENUM ('boys', 'girls', 'boys_ethiopian');
CREATE TYPE public.salary_model AS ENUM ('fixed', 'hourly', 'per_event');
CREATE TYPE public.event_status AS ENUM ('draft', 'requested', 'admin_approved', 'logistics_approved', 'in_progress', 'completed', 'rejected', 'cancelled');
CREATE TYPE public.graphics_status AS ENUM ('pending', 'in_progress', 'sketch_uploaded', 'revision_requested', 'approved', 'cancelled');
CREATE TYPE public.smart_card_status AS ENUM ('none', 'pending', 'active', 'suspended');
CREATE TYPE public.form_field_type AS ENUM ('text', 'textarea', 'number', 'date', 'datetime', 'time', 'select', 'multiselect', 'checkbox', 'radio', 'file', 'phone', 'email', 'id_number');
CREATE TYPE public.submission_source AS ENUM ('manual', 'public_link', 'webhook', 'import');

-- ============================================================
-- TIMESTAMPS HELPER
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================
-- GEOGRAPHY
-- ============================================================
CREATE TABLE public.districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id UUID NOT NULL REFERENCES public.districts(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cities_district ON public.cities(district_id);

CREATE TABLE public.communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  coordinator_name TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_communities_city ON public.communities(city_id);

CREATE TABLE public.yeshivas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES public.communities(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  contact_name TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_yeshivas_community ON public.yeshivas(community_id);

-- ============================================================
-- PROFILES & RBAC
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  scope_level public.scope_level NOT NULL DEFAULT 'global',
  district_id UUID REFERENCES public.districts(id) ON DELETE SET NULL,
  city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  community_id UUID REFERENCES public.communities(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_user ON public.profiles(user_id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT
);

CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  UNIQUE(role, permission_id)
);

CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT true,
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, permission_id)
);

-- Security definer helpers
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin') $$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id) $$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STUDENTS
-- ============================================================
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  national_id TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  parent1_phone TEXT,
  parent2_phone TEXT,
  community_id UUID REFERENCES public.communities(id) ON DELETE SET NULL,
  yeshiva_id UUID REFERENCES public.yeshivas(id) ON DELETE SET NULL,
  shiur TEXT,
  smart_card_status public.smart_card_status NOT NULL DEFAULT 'none',
  smart_card_external_id TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_students_community ON public.students(community_id);
CREATE INDEX idx_students_yeshiva ON public.students(yeshiva_id);
CREATE INDEX idx_students_name ON public.students(last_name, first_name);

-- ============================================================
-- STAFF
-- ============================================================
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  national_id TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  bank_name TEXT,
  bank_branch TEXT,
  bank_account TEXT,
  role public.staff_role NOT NULL,
  staff_group public.staff_group,
  district_id UUID REFERENCES public.districts(id) ON DELETE SET NULL,
  city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  community_id UUID REFERENCES public.communities(id) ON DELETE SET NULL,
  salary_model public.salary_model NOT NULL DEFAULT 'fixed',
  initial_terms JSONB DEFAULT '{}'::JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_staff_user ON public.staff(user_id);
CREATE INDEX idx_staff_district ON public.staff(district_id);

CREATE TABLE public.staff_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  effective_from DATE NOT NULL,
  effective_to DATE,
  salary_model public.salary_model NOT NULL,
  hourly_rate NUMERIC(10,2),
  fixed_monthly NUMERIC(10,2),
  per_event_rate NUMERIC(10,2),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_contracts_staff ON public.staff_contracts(staff_id);

-- ============================================================
-- EVENTS
-- ============================================================
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number SERIAL UNIQUE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  status public.event_status NOT NULL DEFAULT 'draft',
  requesting_staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  district_id UUID REFERENCES public.districts(id) ON DELETE SET NULL,
  city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  community_ids UUID[] DEFAULT '{}'::UUID[],
  expected_participants INTEGER DEFAULT 0,
  actual_participants INTEGER,
  total_budget_requested NUMERIC(12,2) DEFAULT 0,
  total_budget_approved NUMERIC(12,2) DEFAULT 0,
  required_activities TEXT,
  logistics_notes TEXT,
  pickup_details TEXT,
  rejection_reason TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_events_dates ON public.events(start_at);
CREATE INDEX idx_events_district ON public.events(district_id);

CREATE TABLE public.event_expense_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity NUMERIC(10,2) DEFAULT 1,
  unit TEXT,
  estimated_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  actual_cost NUMERIC(12,2),
  vendor_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_expense_event ON public.event_expense_items(event_id);

-- ============================================================
-- GRAPHICS
-- ============================================================
CREATE TABLE public.graphics_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  designer_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  deadline TIMESTAMPTZ,
  status public.graphics_status NOT NULL DEFAULT 'pending',
  output_type TEXT,
  dimensions TEXT,
  text_content TEXT,
  reference_files TEXT[] DEFAULT '{}'::TEXT[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_graphics_status ON public.graphics_tasks(status);
CREATE INDEX idx_graphics_designer ON public.graphics_tasks(designer_id);

CREATE TABLE public.graphics_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.graphics_tasks(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  file_path TEXT,
  feedback TEXT,
  status public.graphics_status NOT NULL,
  submitted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_revisions_task ON public.graphics_revisions(task_id);

-- ============================================================
-- INSPECTOR REPORTS
-- ============================================================
CREATE TABLE public.inspector_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspector_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  visit_date DATE NOT NULL,
  visit_time TIME,
  district_id UUID REFERENCES public.districts(id) ON DELETE SET NULL,
  city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  community_id UUID REFERENCES public.communities(id) ON DELETE SET NULL,
  yeshiva_id UUID REFERENCES public.yeshivas(id) ON DELETE SET NULL,
  expected_participants INTEGER,
  actual_participants INTEGER NOT NULL,
  conversation_details TEXT,
  experience_summary TEXT,
  photos TEXT[] DEFAULT '{}'::TEXT[],
  notes TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reports_district ON public.inspector_reports(district_id);
CREATE INDEX idx_reports_date ON public.inspector_reports(visit_date);

-- ============================================================
-- VENDORS
-- ============================================================
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  vendor_type TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  rate NUMERIC(10,2),
  rate_unit TEXT,
  operating_regions TEXT[] DEFAULT '{}'::TEXT[],
  safety_approval_valid_until DATE,
  insurance_valid_until DATE,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- DYNAMIC FORMS
-- ============================================================
CREATE TABLE public.form_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  purpose TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  public_token TEXT UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  target_table TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.form_definitions(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type public.form_field_type NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT false,
  placeholder TEXT,
  help_text TEXT,
  options JSONB DEFAULT '[]'::JSONB,
  validation JSONB DEFAULT '{}'::JSONB,
  conditional_logic JSONB DEFAULT '{}'::JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fields_form ON public.form_fields(form_id, sort_order);

CREATE TABLE public.form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.form_definitions(id) ON DELETE CASCADE,
  source public.submission_source NOT NULL DEFAULT 'manual',
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  submitted_by UUID REFERENCES auth.users(id),
  source_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_submissions_form ON public.form_submissions(form_id);

-- ============================================================
-- LOGS
-- ============================================================
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  action TEXT NOT NULL,
  before_data JSONB,
  after_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_actor ON public.audit_log(actor_id);
CREATE INDEX idx_audit_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_date ON public.audit_log(created_at DESC);

CREATE TABLE public.webhook_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  source TEXT NOT NULL,
  endpoint TEXT,
  http_method TEXT,
  status_code INTEGER,
  request_headers JSONB,
  request_body JSONB,
  response_body JSONB,
  error_message TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_webhook_source ON public.webhook_log(source);
CREATE INDEX idx_webhook_date ON public.webhook_log(created_at DESC);

CREATE TABLE public.webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source TEXT NOT NULL UNIQUE,
  description TEXT,
  field_mapping JSONB NOT NULL DEFAULT '{}'::JSONB,
  target_table TEXT,
  secret_key TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notify_on_failure BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TIMESTAMP TRIGGERS
-- ============================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'districts','cities','communities','yeshivas','profiles','students','staff',
    'events','graphics_tasks','inspector_reports','vendors','form_definitions','webhook_endpoints'
  ])
  LOOP
    EXECUTE format('CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t);
  END LOOP;
END $$;

-- ============================================================
-- GRANTS
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.districts, public.cities, public.communities, public.yeshivas,
  public.profiles, public.user_roles, public.permissions, public.role_permissions, public.user_permissions,
  public.students, public.staff, public.staff_contracts, public.events, public.event_expense_items,
  public.graphics_tasks, public.graphics_revisions, public.inspector_reports, public.vendors,
  public.form_definitions, public.form_fields, public.form_submissions,
  public.audit_log, public.webhook_log, public.webhook_endpoints TO authenticated;

GRANT ALL ON public.districts, public.cities, public.communities, public.yeshivas,
  public.profiles, public.user_roles, public.permissions, public.role_permissions, public.user_permissions,
  public.students, public.staff, public.staff_contracts, public.events, public.event_expense_items,
  public.graphics_tasks, public.graphics_revisions, public.inspector_reports, public.vendors,
  public.form_definitions, public.form_fields, public.form_submissions,
  public.audit_log, public.webhook_log, public.webhook_endpoints TO service_role;

GRANT USAGE, SELECT ON SEQUENCE public.events_serial_number_seq TO authenticated, service_role;

-- Public form submissions (via public_token) - anon insert only
GRANT INSERT ON public.form_submissions TO anon;
GRANT SELECT ON public.form_definitions, public.form_fields TO anon;

-- ============================================================
-- ENABLE RLS
-- ============================================================
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yeshivas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_expense_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graphics_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graphics_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspector_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- Simple model for MVP: any authenticated user with at least one role can read most data;
-- super_admin / finance / secretary can write everything.
-- Scope-based filtering will be enforced in server functions for now.
-- ============================================================

-- Profiles: users see own; super_admin sees all
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- User roles: only super_admin manages; users can read their own
CREATE POLICY "user_roles_read_own" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- Permissions catalog: any authenticated read; super_admin write
CREATE POLICY "perms_read" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "perms_admin" ON public.permissions FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "role_perms_read" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "role_perms_admin" ON public.role_permissions FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "user_perms_read" ON public.user_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "user_perms_admin" ON public.user_permissions FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- Generic policy template: authenticated read all, authenticated write all (refined later via server functions)
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'districts','cities','communities','yeshivas',
    'students','staff','staff_contracts','events','event_expense_items',
    'graphics_tasks','graphics_revisions','inspector_reports','vendors',
    'form_definitions','form_fields','webhook_endpoints'
  ])
  LOOP
    EXECUTE format('CREATE POLICY "%I_read" ON public.%I FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));', t, t);
    EXECUTE format('CREATE POLICY "%I_write" ON public.%I FOR ALL TO authenticated USING (public.has_any_role(auth.uid())) WITH CHECK (public.has_any_role(auth.uid()));', t, t);
  END LOOP;
END $$;

-- Form submissions: anon can insert via public link; authenticated read all
CREATE POLICY "submissions_anon_insert" ON public.form_submissions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "submissions_auth_insert" ON public.form_submissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "submissions_read" ON public.form_submissions FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "submissions_admin" ON public.form_submissions FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- Public read for active public forms (anon)
CREATE POLICY "forms_public_read" ON public.form_definitions FOR SELECT TO anon USING (is_public = true AND is_active = true);
CREATE POLICY "fields_public_read" ON public.form_fields FOR SELECT TO anon USING (
  EXISTS (SELECT 1 FROM public.form_definitions f WHERE f.id = form_id AND f.is_public = true AND f.is_active = true)
);

-- Logs: read for super_admin/developer/finance; insert by anyone authenticated (for triggers/server fns)
CREATE POLICY "audit_read_admin" ON public.audit_log FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(), 'developer') OR public.has_role(auth.uid(), 'finance'));
CREATE POLICY "audit_insert" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "webhook_log_read_admin" ON public.webhook_log FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(), 'developer'));
CREATE POLICY "webhook_log_insert" ON public.webhook_log FOR INSERT TO authenticated WITH CHECK (true);
