CREATE TABLE IF NOT EXISTS public.portfolio_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.game_members(id) ON DELETE CASCADE,
  equity numeric NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS portfolio_snapshots_member_idx ON public.portfolio_snapshots (member_id, recorded_at);
GRANT SELECT, INSERT ON public.portfolio_snapshots TO authenticated;
GRANT ALL ON public.portfolio_snapshots TO service_role;
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner reads snapshots" ON public.portfolio_snapshots FOR SELECT TO authenticated USING (public.owns_member(member_id));
CREATE POLICY "admins read snapshots" ON public.portfolio_snapshots FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "owner records snapshots" ON public.portfolio_snapshots FOR INSERT TO authenticated WITH CHECK (public.owns_member(member_id));