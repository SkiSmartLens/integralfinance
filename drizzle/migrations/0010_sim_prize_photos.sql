-- Simulator: prizes can have a small photo.
--
-- Applied through Lovable (or pasted into its SQL editor, which runs as
-- postgres). Safe to run more than once. Needs 20261104150000 (games.prizes).
--
-- Each prize in games.prizes is either its name as text (as before), or
-- {"text": name, "image": photo}, where the photo is a small square picture
-- the page crops and shrinks (a data: URL of a PNG, JPEG or WebP, at most
-- 60,000 characters) and the name may be blank. sim_prizes_valid checks both
-- the table (for creators, who save their own game's prizes directly) and
-- admin_update_game (for admins, in any game).

CREATE OR REPLACE FUNCTION public.sim_prizes_valid(_prizes jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $fn$
BEGIN
  IF _prizes IS NULL OR jsonb_typeof(_prizes) <> 'array' THEN RETURN false; END IF;
  IF jsonb_array_length(_prizes) > 10 OR length(_prizes::text) > 400000 THEN RETURN false; END IF;
  RETURN NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(_prizes) e
    WHERE NOT CASE jsonb_typeof(e)
      WHEN 'string' THEN length(trim(e #>> '{}')) BETWEEN 1 AND 120
      WHEN 'object' THEN
        (e - 'text' - 'image') = '{}'::jsonb
        AND coalesce(jsonb_typeof(e->'text'), 'string') = 'string'
        AND length(coalesce(e->>'text', '')) <= 120
        AND (
          e->'image' IS NULL
          OR (
            jsonb_typeof(e->'image') = 'string'
            AND length(e->>'image') <= 60000
            AND e->>'image' ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$'
          )
        )
        AND (length(trim(coalesce(e->>'text', ''))) > 0 OR e->'image' IS NOT NULL)
      ELSE false
    END
  );
END
$fn$;

ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_prizes_list;
ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_prizes_valid;
ALTER TABLE public.games ADD CONSTRAINT games_prizes_valid CHECK (public.sim_prizes_valid(prizes));

-- Same as 20261104150000, with prize photos allowed.
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
  IF _changes ? 'prizes' AND NOT public.sim_prizes_valid(_changes->'prizes') THEN
    RAISE EXCEPTION 'Prizes must be up to 10, each with a name of up to 120 characters or a small photo';
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