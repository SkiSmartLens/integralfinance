
-- 1) Force cash on INSERT and forbid client-side UPDATE of cash on game_members.
-- The place-order edge function uses the service_role key, which bypasses this trigger.
CREATE OR REPLACE FUNCTION public.enforce_game_members_cash()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_role text := current_setting('request.jwt.claims', true)::json->>'role';
BEGIN
  IF current_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT starting_cash INTO NEW.cash FROM public.games WHERE id = NEW.game_id;
    IF NEW.cash IS NULL THEN
      NEW.cash := 100000;
    END IF;
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

DROP TRIGGER IF EXISTS enforce_game_members_cash_trg ON public.game_members;
CREATE TRIGGER enforce_game_members_cash_trg
BEFORE INSERT OR UPDATE ON public.game_members
FOR EACH ROW EXECUTE FUNCTION public.enforce_game_members_cash();

-- 2) Restrict profiles SELECT to authenticated users only.
DROP POLICY IF EXISTS "profiles readable" ON public.profiles;
CREATE POLICY "profiles readable"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);
