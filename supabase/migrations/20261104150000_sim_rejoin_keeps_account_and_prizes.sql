-- Simulator: leaving a game no longer wipes your account in it, and games can
-- have prizes.
--
-- Applied through Lovable (or pasted into its SQL editor, which runs as
-- postgres). Safe to run more than once.
--
-- 1. Leaving deleted the player's membership, and with it their stocks and
--    trade history, so leaving and joining again started them over with the
--    starting cash and no rank ("N/A"). Now a player deleting their own
--    membership only marks it as left (left_at): it drops out of their games
--    and the leaderboard, and joining again (code, invite link or the public
--    list) brings back the same account. An admin removing someone else, and
--    deleting a game, still delete for real.
-- 2. games.prizes: what each place wins, 1st place first. Set when creating a
--    game, shown at the top of the simulator, and admins can change them in
--    the dev console (admin_update_game, which now also saves show_holdings).

ALTER TABLE public.game_members ADD COLUMN IF NOT EXISTS left_at timestamptz;

-- A player leaving on their own keeps their account. Not while the game itself
-- is being deleted, which takes its members with it.
CREATE OR REPLACE FUNCTION public.sim_leave_keeps_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF auth.uid() IS NOT NULL AND OLD.user_id = auth.uid()
     AND EXISTS (SELECT 1 FROM public.games WHERE id = OLD.game_id) THEN
    UPDATE public.game_members SET left_at = coalesce(left_at, now()) WHERE id = OLD.id;
    RETURN NULL;
  END IF;
  RETURN OLD;
END
$fn$;

DROP TRIGGER IF EXISTS game_members_leave_keeps_member ON public.game_members;
CREATE TRIGGER game_members_leave_keeps_member
BEFORE DELETE ON public.game_members
FOR EACH ROW EXECUTE FUNCTION public.sim_leave_keeps_member();

-- Joining a game you left brings your old account back instead of adding a
-- new one. Only for yourself: anyone else's insert goes on to the usual checks.
CREATE OR REPLACE FUNCTION public.sim_rejoin_restores_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RETURN NEW;
  END IF;
  UPDATE public.game_members SET left_at = NULL
  WHERE game_id = NEW.game_id AND user_id = NEW.user_id AND left_at IS NOT NULL;
  IF FOUND THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS game_members_rejoin_restores_member ON public.game_members;
CREATE TRIGGER game_members_rejoin_restores_member
BEFORE INSERT ON public.game_members
FOR EACH ROW EXECUTE FUNCTION public.sim_rejoin_restores_member();

REVOKE EXECUTE ON FUNCTION public.sim_leave_keeps_member() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sim_rejoin_restores_member() FROM PUBLIC, anon, authenticated;

-- The leaderboard leaves out players who have left.
CREATE OR REPLACE FUNCTION public.sim_leaderboard(_game_id uuid)
RETURNS TABLE (member_id uuid, is_me boolean, display_name text, cash numeric, traded boolean, positions jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT
    gm.id,
    gm.user_id = auth.uid(),
    coalesce(p.display_name, 'Player'),
    coalesce(public.sim_ledger_cash(gm.id), gm.cash),
    EXISTS (SELECT 1 FROM public.transactions t WHERE t.member_id = gm.id AND upper(t.symbol) <> '$CASH'),
    coalesce(
      (SELECT jsonb_agg(jsonb_build_object('symbol', pos.symbol, 'shares', pos.shares, 'avg_cost', pos.avg_cost) ORDER BY pos.symbol)
       FROM public.positions pos
       WHERE pos.member_id = gm.id AND pos.shares <> 0),
      '[]'::jsonb
    )
  FROM public.game_members gm
  LEFT JOIN public.profiles p ON p.user_id = gm.user_id
  WHERE gm.game_id = _game_id
    AND gm.left_at IS NULL
    AND auth.uid() IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.game_members me WHERE me.game_id = _game_id AND me.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'admin')
    )
$fn$;

REVOKE ALL ON FUNCTION public.sim_leaderboard(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sim_leaderboard(uuid) TO authenticated;

-- Prizes: a list of what each place wins, 1st place first ("$20 gift card").
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS prizes jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_prizes_list;
ALTER TABLE public.games ADD CONSTRAINT games_prizes_list
  CHECK (jsonb_typeof(prizes) = 'array' AND jsonb_array_length(prizes) <= 10 AND length(prizes::text) <= 2000);

-- Same as before, plus show_holdings and prizes.
CREATE OR REPLACE FUNCTION public.admin_update_game(_game_id uuid, _changes jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v numeric;
BEGIN
  PERFORM public.sim_require_admin();
  IF NOT EXISTS (SELECT 1 FROM public.games WHERE id = _game_id) THEN RAISE EXCEPTION 'Game not found'; END IF;
  IF _changes ? 'name' AND length(trim(coalesce(_changes->>'name', ''))) NOT BETWEEN 1 AND 60 THEN
    RAISE EXCEPTION 'Game name must be 1-60 characters';
  END IF;
  IF _changes ? 'starting_cash' THEN
    v := NULLIF(_changes->>'starting_cash', '')::numeric;
    IF v IS NULL OR v <= 0 OR v > 1000000000 THEN RAISE EXCEPTION 'Starting cash must be between $1 and $1,000,000,000'; END IF;
  END IF;
  IF _changes ? 'leverage' THEN
    v := NULLIF(_changes->>'leverage', '')::numeric;
    IF v IS NULL OR v < 1 OR v > 10 THEN RAISE EXCEPTION 'Leverage must be between 1x and 10x'; END IF;
  END IF;
  IF _changes ? 'min_price' THEN
    v := NULLIF(_changes->>'min_price', '')::numeric;
    IF v IS NOT NULL AND v < 0 THEN RAISE EXCEPTION 'Minimum price must be $0 or more'; END IF;
  END IF;
  IF _changes ? 'max_position_pct' THEN
    v := NULLIF(_changes->>'max_position_pct', '')::numeric;
    IF v IS NOT NULL AND (v <= 0 OR v > 100) THEN RAISE EXCEPTION 'Max position must be between 1%% and 100%%'; END IF;
  END IF;
  IF _changes ? 'prizes' AND (
    jsonb_typeof(_changes->'prizes') <> 'array'
    OR jsonb_array_length(_changes->'prizes') > 10
    OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(_changes->'prizes') e
      WHERE jsonb_typeof(e) <> 'string' OR length(trim(e #>> '{}')) NOT BETWEEN 1 AND 120
    )
  ) THEN
    RAISE EXCEPTION 'Prizes must be up to 10, each 1-120 characters';
  END IF;

  UPDATE public.games SET
    name = CASE WHEN _changes ? 'name' THEN trim(_changes->>'name') ELSE name END,
    starting_cash = CASE WHEN _changes ? 'starting_cash' THEN (_changes->>'starting_cash')::numeric ELSE starting_cash END,
    leverage = CASE WHEN _changes ? 'leverage' THEN (_changes->>'leverage')::numeric ELSE leverage END,
    allow_short = CASE WHEN _changes ? 'allow_short' THEN (_changes->>'allow_short')::boolean ELSE allow_short END,
    is_public = CASE WHEN _changes ? 'is_public' THEN (_changes->>'is_public')::boolean ELSE is_public END,
    show_holdings = CASE WHEN _changes ? 'show_holdings' THEN (_changes->>'show_holdings')::boolean ELSE show_holdings END,
    min_price = CASE WHEN _changes ? 'min_price' THEN NULLIF(_changes->>'min_price', '')::numeric ELSE min_price END,
    max_position_pct = CASE WHEN _changes ? 'max_position_pct' THEN NULLIF(_changes->>'max_position_pct', '')::numeric ELSE max_position_pct END,
    ends_at = CASE WHEN _changes ? 'ends_at' THEN NULLIF(_changes->>'ends_at', '')::timestamptz ELSE ends_at END,
    prizes = CASE WHEN _changes ? 'prizes' THEN _changes->'prizes' ELSE prizes END
  WHERE id = _game_id;

  -- A new starting cash shifts everyone's trade-history cash.
  IF _changes ? 'starting_cash' THEN
    PERFORM public.sim_sync_cash(id) FROM public.game_members WHERE game_id = _game_id;
  END IF;
END
$fn$;

REVOKE ALL ON FUNCTION public.admin_update_game(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_game(uuid, jsonb) TO authenticated;

-- Make the changes visible to the API right away.
NOTIFY pgrst, 'reload schema';
