CREATE TABLE public.pending_storage_deletions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL DEFAULT 'screenshots',
  path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.pending_storage_deletions TO service_role;
ALTER TABLE public.pending_storage_deletions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.purge_expired_analyses()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int;
BEGIN
  WITH policy AS (
    SELECT p.id AS user_id,
      LEAST(
        coalesce(dp.retention_days, 100000),
        CASE p.plan_code WHEN 'free' THEN 7 WHEN 'personal' THEN 30 ELSE 365 END
      ) AS days
    FROM public.profiles p LEFT JOIN public.data_preferences dp ON dp.user_id = p.id
  ), expired AS (
    SELECT a.id, a.screenshot_storage_path FROM public.analyses a
    JOIN policy ON policy.user_id = a.user_id
    WHERE a.created_at < now() - make_interval(days => policy.days)
  ), queued AS (
    INSERT INTO public.pending_storage_deletions (path)
    SELECT screenshot_storage_path FROM expired WHERE screenshot_storage_path IS NOT NULL
  ), del AS (
    DELETE FROM public.analyses WHERE id IN (SELECT id FROM expired) RETURNING 1
  )
  SELECT count(*) INTO v_count FROM del;
  DELETE FROM public.account_deletion_carryover WHERE period_start < date_trunc('month', now()) - interval '1 month';
  RETURN v_count;
END; $$;
REVOKE ALL ON FUNCTION public.purge_expired_analyses() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_analyses() TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('fraudshield-retention-hourly', '7 * * * *', $c$SELECT public.purge_expired_analyses();$c$);