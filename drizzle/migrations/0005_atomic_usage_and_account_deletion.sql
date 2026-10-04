CREATE OR REPLACE FUNCTION public.reserve_analysis_usage(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_limit int; v_used int; v_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('usage:' || _user_id::text));
  SELECT monthly_analysis_limit INTO v_limit FROM public.profiles WHERE id = _user_id FOR UPDATE;
  IF v_limit IS NULL THEN v_limit := 10; END IF;
  SELECT coalesce(sum(units), 0) INTO v_used FROM public.usage_events
    WHERE user_id = _user_id AND event_type = 'analysis' AND created_at >= date_trunc('month', now());
  IF v_used >= v_limit THEN
    RETURN jsonb_build_object('ok', false, 'used', v_used, 'limit', v_limit);
  END IF;
  INSERT INTO public.usage_events (user_id, event_type, units) VALUES (_user_id, 'analysis', 1) RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok', true, 'used', v_used, 'limit', v_limit, 'reservation_id', v_id);
END; $$;
REVOKE ALL ON FUNCTION public.reserve_analysis_usage(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_analysis_usage(uuid) TO service_role;

CREATE TABLE public.account_deletion_carryover (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_hash text NOT NULL,
  period_start timestamptz NOT NULL,
  units integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.account_deletion_carryover TO service_role;
ALTER TABLE public.account_deletion_carryover ENABLE ROW LEVEL SECURITY;
CREATE INDEX account_deletion_carryover_hash_idx ON public.account_deletion_carryover (email_hash, period_start);

CREATE OR REPLACE FUNCTION public.delete_user_data(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text; v_units int;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = _user_id;
  SELECT coalesce(sum(units), 0) INTO v_units FROM public.usage_events
    WHERE user_id = _user_id AND event_type = 'analysis' AND created_at >= date_trunc('month', now());
  IF v_email IS NOT NULL AND v_units > 0 THEN
    INSERT INTO public.account_deletion_carryover (email_hash, period_start, units)
    VALUES (encode(extensions.digest(lower(v_email), 'sha256'), 'hex'), date_trunc('month', now()), v_units);
  END IF;
  DELETE FROM public.reports WHERE user_id = _user_id;
  DELETE FROM public.alerts WHERE user_id = _user_id;
  DELETE FROM public.analyses WHERE user_id = _user_id;
  DELETE FROM public.usage_events WHERE user_id = _user_id;
  DELETE FROM public.data_preferences WHERE user_id = _user_id;
  DELETE FROM public.subscriptions WHERE user_id = _user_id;
  DELETE FROM public.security_events WHERE user_id = _user_id;
  DELETE FROM public.profiles WHERE id = _user_id;
END; $$;
REVOKE ALL ON FUNCTION public.delete_user_data(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_data(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare v_carry int;
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.raw_user_meta_data->>'avatar_url');
  insert into public.subscriptions (user_id) values (new.id);
  insert into public.data_preferences (user_id) values (new.id);
  insert into public.security_events (user_id, event_type) values (new.id, 'account_created');
  if new.email is not null then
    select coalesce(sum(units), 0) into v_carry from public.account_deletion_carryover
      where email_hash = encode(extensions.digest(lower(new.email), 'sha256'), 'hex')
        and period_start = date_trunc('month', now());
    if v_carry > 0 then
      insert into public.usage_events (user_id, event_type, units) values (new.id, 'analysis', v_carry);
    end if;
  end if;
  return new;
end; $function$;