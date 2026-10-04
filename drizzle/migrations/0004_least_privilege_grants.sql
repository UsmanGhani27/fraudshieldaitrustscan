-- Defense in depth: table grants match RLS policies (server-only writes use the service role).
REVOKE INSERT, UPDATE, DELETE ON public.usage_events, public.subscriptions, public.security_events, public.analysis_categories, public.analysis_signals, public.analysis_actions, public.verification_steps FROM authenticated, anon;
REVOKE INSERT, DELETE ON public.profiles, public.data_preferences FROM authenticated, anon;
REVOKE INSERT ON public.analyses FROM authenticated, anon;
REVOKE UPDATE ON public.reports FROM authenticated, anon;
REVOKE INSERT, UPDATE ON public.alerts FROM authenticated, anon;
GRANT UPDATE (read_at) ON public.alerts TO authenticated;
ALTER TABLE public.data_preferences ADD CONSTRAINT data_preferences_retention_days_allowed CHECK (retention_days IS NULL OR retention_days IN (7, 30, 90, 365));