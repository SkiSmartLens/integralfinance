-- Pin search_path on the trigger fn
create or replace function public.tg_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

-- Revoke public execute on security-definer helpers (still callable from RLS policies which run as definer-owner)
revoke execute on function public.is_game_member(uuid) from public, anon, authenticated;
revoke execute on function public.owns_member(uuid) from public, anon, authenticated;
revoke execute on function public.member_in_my_game(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;