CREATE OR REPLACE FUNCTION public.enforce_game_members_cash() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_role text := current_setting('request.jwt.claims', true)::json->>'role';
BEGIN
  IF current_role = 'service_role' OR session_user IN ('postgres','supabase_admin') AND current_setting('request.jwt.claims', true) IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    SELECT starting_cash INTO NEW.cash FROM public.games WHERE id = NEW.game_id;
    IF NEW.cash IS NULL THEN NEW.cash := 100000; END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.cash IS DISTINCT FROM OLD.cash THEN
      RAISE EXCEPTION 'cash can only be modified by the trading engine';
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;