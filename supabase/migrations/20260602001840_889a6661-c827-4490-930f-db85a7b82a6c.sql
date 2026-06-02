
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_roles(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_dev(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_finance_or_admin(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_coordinator_or_admin(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_roles(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_or_dev(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_finance_or_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_coordinator_or_admin(uuid) TO authenticated, service_role;

-- Make graphics bucket private — files will be accessed via signed URLs
UPDATE storage.buckets SET public = false WHERE id = 'graphics';
