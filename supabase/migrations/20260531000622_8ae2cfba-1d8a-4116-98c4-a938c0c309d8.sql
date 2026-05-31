
-- 1) Extend role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ceo';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'employee';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'student';

-- 2) National ID on profiles (link auth user to a person)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS national_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_national_id_key
  ON public.profiles (national_id) WHERE national_id IS NOT NULL;

-- 3) Unique national_id on students & staff (when present)
CREATE UNIQUE INDEX IF NOT EXISTS students_national_id_key
  ON public.students (national_id) WHERE national_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS staff_national_id_key
  ON public.staff (national_id) WHERE national_id IS NOT NULL;

-- 4) Helper: list user's roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COALESCE(array_agg(role::text), ARRAY[]::text[]) FROM public.user_roles WHERE user_id = _user_id $$;
