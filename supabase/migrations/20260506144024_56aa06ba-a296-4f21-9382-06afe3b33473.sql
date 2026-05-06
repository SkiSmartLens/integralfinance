-- Profiles
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles readable" on public.profiles for select using (true);
create policy "users insert own profile" on public.profiles for insert with check (auth.uid() = user_id);
create policy "users update own profile" on public.profiles for update using (auth.uid() = user_id);

-- Games
create table public.games (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  starting_cash numeric not null default 100000,
  commission numeric not null default 0,
  allow_short boolean not null default false,
  join_code text not null unique default upper(substring(md5(random()::text) from 1 for 6)),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.games enable row level security;
create policy "games readable to authed" on public.games for select to authenticated using (true);
create policy "users create games" on public.games for insert to authenticated with check (auth.uid() = created_by);
create policy "creator updates game" on public.games for update to authenticated using (auth.uid() = created_by);
create policy "creator deletes game" on public.games for delete to authenticated using (auth.uid() = created_by);

-- Game members
create table public.game_members (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  cash numeric not null default 100000,
  joined_at timestamptz not null default now(),
  unique (game_id, user_id)
);
alter table public.game_members enable row level security;

-- Helper: is the current user a member of the given game?
create or replace function public.is_game_member(_game_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.game_members where game_id = _game_id and user_id = auth.uid());
$$;

create policy "members readable to fellow members" on public.game_members for select to authenticated
  using (public.is_game_member(game_id) or user_id = auth.uid());
create policy "users join game" on public.game_members for insert to authenticated with check (auth.uid() = user_id);
create policy "users update own membership" on public.game_members for update to authenticated using (auth.uid() = user_id);
create policy "users leave game" on public.game_members for delete to authenticated using (auth.uid() = user_id);

-- Positions
create table public.positions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.game_members(id) on delete cascade,
  symbol text not null,
  shares numeric not null default 0,
  avg_cost numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (member_id, symbol)
);
alter table public.positions enable row level security;

create or replace function public.owns_member(_member_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.game_members where id = _member_id and user_id = auth.uid());
$$;

create or replace function public.member_in_my_game(_member_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.game_members m
    where m.id = _member_id
      and exists (select 1 from public.game_members me where me.game_id = m.game_id and me.user_id = auth.uid())
  );
$$;

create policy "positions visible to game" on public.positions for select to authenticated
  using (public.member_in_my_game(member_id));
create policy "owner inserts positions" on public.positions for insert to authenticated with check (public.owns_member(member_id));
create policy "owner updates positions" on public.positions for update to authenticated using (public.owns_member(member_id));
create policy "owner deletes positions" on public.positions for delete to authenticated using (public.owns_member(member_id));

-- Orders
create type public.order_side as enum ('buy', 'sell');
create type public.order_type as enum ('market', 'limit', 'stop');
create type public.order_status as enum ('pending', 'filled', 'cancelled');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.game_members(id) on delete cascade,
  symbol text not null,
  side public.order_side not null,
  order_type public.order_type not null default 'market',
  shares numeric not null check (shares > 0),
  limit_price numeric,
  stop_price numeric,
  status public.order_status not null default 'pending',
  filled_price numeric,
  filled_at timestamptz,
  after_hours boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.orders enable row level security;
create policy "orders visible to owner" on public.orders for select to authenticated using (public.owns_member(member_id));
create policy "owner creates orders" on public.orders for insert to authenticated with check (public.owns_member(member_id));
create policy "owner updates orders" on public.orders for update to authenticated using (public.owns_member(member_id));
create policy "owner deletes orders" on public.orders for delete to authenticated using (public.owns_member(member_id));

-- Transactions (immutable log)
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.game_members(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  symbol text not null,
  side public.order_side not null,
  shares numeric not null,
  price numeric not null,
  commission numeric not null default 0,
  created_at timestamptz not null default now()
);
alter table public.transactions enable row level security;
create policy "tx visible to game" on public.transactions for select to authenticated using (public.member_in_my_game(member_id));
create policy "owner inserts tx" on public.transactions for insert to authenticated with check (public.owns_member(member_id));

-- Auto profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- updated_at trigger fn
create or replace function public.tg_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger profiles_updated before update on public.profiles for each row execute function public.tg_updated_at();
create trigger positions_updated before update on public.positions for each row execute function public.tg_updated_at();

create index orders_pending_idx on public.orders (status) where status = 'pending';
create index orders_member_idx on public.orders (member_id, created_at desc);
create index tx_member_idx on public.transactions (member_id, created_at desc);