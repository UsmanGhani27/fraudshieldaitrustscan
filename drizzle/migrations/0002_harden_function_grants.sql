REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.owns_analysis(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_analysis(uuid) TO authenticated;