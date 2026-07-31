-- マチノワ：100ptガチャ・獲得アイテム保存
-- Supabase Dashboard > SQL Editor で、このファイルを1回実行してください。
-- 前提：supabase/purchase-points-migration.sql が実行済みで profiles.points が存在すること。

create extension if not exists pgcrypto;

create table if not exists public.gacha_rewards (
  id text primary key,
  category text not null check (category in ('body_color', 'accent_color', 'item')),
  label text not null,
  value text not null,
  rarity text not null check (rarity in ('normal', 'rare', 'special')),
  weight integer not null check (weight > 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.gacha_rolls (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_id text not null references public.gacha_rewards(id),
  cost_points bigint not null default 100 check (cost_points > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.user_gacha_inventory (
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_id text not null references public.gacha_rewards(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  first_acquired_at timestamptz not null default now(),
  last_acquired_at timestamptz not null default now(),
  primary key (user_id, reward_id)
);

create index if not exists gacha_rolls_user_created_idx
  on public.gacha_rolls (user_id, created_at desc);
create index if not exists user_gacha_inventory_user_idx
  on public.user_gacha_inventory (user_id, last_acquired_at desc);

alter table public.gacha_rewards enable row level security;
alter table public.gacha_rolls enable row level security;
alter table public.user_gacha_inventory enable row level security;

grant select on public.gacha_rewards to anon, authenticated;
grant select on public.gacha_rolls, public.user_gacha_inventory to authenticated;

drop policy if exists "gacha_rewards_read" on public.gacha_rewards;
drop policy if exists "gacha_rolls_select_own" on public.gacha_rolls;
drop policy if exists "gacha_inventory_select_own" on public.user_gacha_inventory;

create policy "gacha_rewards_read"
on public.gacha_rewards
for select
to anon, authenticated
using (is_active = true);

create policy "gacha_rolls_select_own"
on public.gacha_rolls
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "gacha_inventory_select_own"
on public.user_gacha_inventory
for select
to authenticated
using ((select auth.uid()) = user_id);

insert into public.gacha_rewards (id, category, label, value, rarity, weight, sort_order, is_active)
values
  ('body-silver', 'body_color', 'しろがね', '#eceeef', 'normal', 12, 10, true),
  ('body-dark-steel', 'body_color', 'くろがね', '#8d9194', 'normal', 12, 20, true),
  ('body-hagane', 'body_color', 'はがね', '#8a8f96', 'normal', 10, 30, true),
  ('body-brick', 'body_color', 'レンガ', '#e8842f', 'rare', 7, 40, true),
  ('body-blue', 'body_color', 'あおがね', '#5b8c9c', 'rare', 7, 50, true),
  ('body-green', 'body_color', 'もえぎ', '#7ba05b', 'rare', 7, 60, true),
  ('body-pink', 'body_color', 'うすべに', '#d98aa0', 'special', 3, 70, true),
  ('eye-gray', 'accent_color', '濃いグレー', '#777777', 'normal', 12, 110, true),
  ('eye-yellow', 'accent_color', 'たまご', '#ffcf4d', 'normal', 10, 120, true),
  ('eye-blue', 'accent_color', 'みずいろ', '#5fb6d1', 'rare', 7, 130, true),
  ('eye-green', 'accent_color', 'わかば', '#6fbf73', 'rare', 7, 140, true),
  ('eye-pink', 'accent_color', 'さくら', '#e86a8f', 'rare', 6, 150, true),
  ('eye-orange', 'accent_color', 'だいだい', '#f08a3c', 'special', 3, 160, true),
  ('item-wrench', 'item', 'スパナ', 'wrench', 'normal', 11, 210, true),
  ('item-gear', 'item', '歯車', 'gear', 'normal', 10, 220, true),
  ('item-flower', 'item', 'お花', 'flower', 'rare', 6, 230, true),
  ('item-heart', 'item', 'ハート', 'heart', 'special', 3, 240, true)
on conflict (id) do update set
  category = excluded.category,
  label = excluded.label,
  value = excluded.value,
  rarity = excluded.rarity,
  weight = excluded.weight,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

-- サーバーだけが呼び出す、ポイント消費・抽選・所持品保存の一括処理。
-- 同じp_roll_idが再送された場合は同じ結果を返し、ポイントを二重に消費しません。
create or replace function public.spin_gacha_for_user(
  p_roll_id uuid,
  p_user_id uuid
)
returns table (
  roll_id uuid,
  reward_id text,
  reward_category text,
  reward_label text,
  reward_value text,
  reward_rarity text,
  inventory_quantity integer,
  points_balance bigint,
  was_duplicate boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.gacha_rolls%rowtype;
  v_reward public.gacha_rewards%rowtype;
  v_points bigint;
  v_previous_quantity integer;
  v_quantity integer;
begin
  select gr.* into v_existing
  from public.gacha_rolls as gr
  where gr.id = p_roll_id and gr.user_id = p_user_id;

  if found then
    select gr.* into v_reward from public.gacha_rewards as gr where gr.id = v_existing.reward_id;
    select inv.quantity into v_quantity
    from public.user_gacha_inventory as inv
    where inv.user_id = p_user_id and inv.reward_id = v_existing.reward_id;
    select pr.points into v_points from public.profiles as pr where pr.user_id = p_user_id;

    return query select
      v_existing.id,
      v_reward.id,
      v_reward.category,
      v_reward.label,
      v_reward.value,
      v_reward.rarity,
      coalesce(v_quantity, 1),
      coalesce(v_points, 0),
      coalesce(v_quantity, 1) > 1,
      v_existing.created_at;
    return;
  end if;

  insert into public.profiles (user_id, points)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  select pr.points into v_points
  from public.profiles as pr
  where pr.user_id = p_user_id
  for update;

  -- ロック待ちの間に同じ抽選IDが処理済みになっていないか再確認。
  select gr.* into v_existing
  from public.gacha_rolls as gr
  where gr.id = p_roll_id and gr.user_id = p_user_id;

  if found then
    select gr.* into v_reward from public.gacha_rewards as gr where gr.id = v_existing.reward_id;
    select inv.quantity into v_quantity
    from public.user_gacha_inventory as inv
    where inv.user_id = p_user_id and inv.reward_id = v_existing.reward_id;
    return query select
      v_existing.id,
      v_reward.id,
      v_reward.category,
      v_reward.label,
      v_reward.value,
      v_reward.rarity,
      coalesce(v_quantity, 1),
      v_points,
      coalesce(v_quantity, 1) > 1,
      v_existing.created_at;
    return;
  end if;

  if coalesce(v_points, 0) < 100 then
    raise exception 'insufficient_points';
  end if;

  -- weightが大きい景品ほど選ばれやすい重み付き抽選。
  select gr.* into v_reward
  from public.gacha_rewards as gr
  where gr.is_active = true
  order by (-ln(greatest(random(), 0.0000001)) / gr.weight::numeric) asc
  limit 1;

  if v_reward.id is null then
    raise exception 'gacha_reward_not_configured';
  end if;

  select inv.quantity into v_previous_quantity
  from public.user_gacha_inventory as inv
  where inv.user_id = p_user_id and inv.reward_id = v_reward.id;

  update public.profiles
  set points = points - 100,
      updated_at = now()
  where user_id = p_user_id
  returning points into v_points;

  insert into public.gacha_rolls (id, user_id, reward_id, cost_points)
  values (p_roll_id, p_user_id, v_reward.id, 100)
  returning * into v_existing;

  insert into public.user_gacha_inventory (
    user_id, reward_id, quantity, first_acquired_at, last_acquired_at
  )
  values (p_user_id, v_reward.id, 1, now(), now())
  on conflict on constraint user_gacha_inventory_pkey do update
  set quantity = public.user_gacha_inventory.quantity + 1,
      last_acquired_at = now()
  returning quantity into v_quantity;

  return query select
    v_existing.id,
    v_reward.id,
    v_reward.category,
    v_reward.label,
    v_reward.value,
    v_reward.rarity,
    v_quantity,
    v_points,
    v_previous_quantity is not null,
    v_existing.created_at;
end;
$$;

revoke all on function public.spin_gacha_for_user(uuid, uuid) from public, anon, authenticated;
grant execute on function public.spin_gacha_for_user(uuid, uuid) to service_role;
