-- Plan/limit columns must only be changed server-side; clients may edit display fields only.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, avatar_url) ON public.profiles TO authenticated;
-- Assessment results are immutable from the browser; users may only toggle "saved".
REVOKE UPDATE ON public.analyses FROM authenticated;
GRANT UPDATE (is_saved) ON public.analyses TO authenticated;
-- Preferences: only the user-controlled settings.
REVOKE UPDATE ON public.data_preferences FROM authenticated;
GRANT UPDATE (history_enabled, retention_days) ON public.data_preferences TO authenticated;