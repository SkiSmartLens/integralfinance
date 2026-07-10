GRANT SELECT, INSERT, UPDATE, DELETE ON public.games TO authenticated;
GRANT ALL ON public.games TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_members TO authenticated;
GRANT ALL ON public.game_members TO service_role;
GRANT SELECT ON public.games TO anon;