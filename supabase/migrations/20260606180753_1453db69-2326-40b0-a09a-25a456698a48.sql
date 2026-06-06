-- Restrict games visibility so private games' join codes are not enumerable
DROP POLICY IF EXISTS "games readable to authed" ON public.games;

CREATE POLICY "games readable to members or public"
ON public.games
FOR SELECT
TO authenticated
USING (
  is_public
  OR created_by = auth.uid()
  OR public.is_game_member(id)
);

-- Allow joining a private game via its code without exposing all rows
CREATE OR REPLACE FUNCTION public.join_game_by_code(_code text)
RETURNS TABLE (id uuid, starting_cash numeric, join_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g public.games%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT * INTO g FROM public.games WHERE join_code = upper(_code) LIMIT 1;
  IF g.id IS NULL THEN
    RAISE EXCEPTION 'game not found';
  END IF;

  INSERT INTO public.game_members (game_id, user_id, cash)
  VALUES (g.id, auth.uid(), g.starting_cash)
  ON CONFLICT (game_id, user_id) DO NOTHING;

  RETURN QUERY SELECT g.id, g.starting_cash, g.join_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_game_by_code(text) TO authenticated;