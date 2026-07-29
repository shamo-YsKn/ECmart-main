-- マチノワ：購入履歴・サイト内ポイント機能
-- Supabase Dashboard > SQL Editor で、このファイルを1回実行してください。
-- 100円ごとに200ptを付与します。

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists points bigint not null default 0;

alter table public.profiles
  drop constraint if exists profiles_points_nonnegative;
alter table public.profiles
  add constraint profiles_points_nonnegative check (points >= 0);

create table if not exists public.orders (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'completed' check (status in ('completed')),
  product_total integer not null check (product_total >= 0),
  shipping_total integer not null check (shipping_total >= 0),
  total_amount integer not null check (total_amount >= 0),
  points_awarded bigint not null check (points_awarded >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  shop_id text not null,
  unit_price integer not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total integer not null check (line_total >= 0)
);

create table if not exists public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid unique references public.orders(id) on delete cascade,
  kind text not null default 'purchase' check (kind in ('purchase')),
  points bigint not null check (points > 0),
  created_at timestamptz not null default now()
);

create index if not exists orders_user_id_created_at_idx
  on public.orders (user_id, created_at desc);
create index if not exists order_items_order_id_idx
  on public.order_items (order_id);
create index if not exists point_transactions_user_id_created_at_idx
  on public.point_transactions (user_id, created_at desc);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.point_transactions enable row level security;

grant select on public.orders, public.order_items, public.point_transactions to authenticated;

drop policy if exists "orders_select_own" on public.orders;
drop policy if exists "order_items_select_own" on public.order_items;
drop policy if exists "point_transactions_select_own" on public.point_transactions;

create policy "orders_select_own"
on public.orders
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "order_items_select_own"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders
    where public.orders.id = order_items.order_id
      and public.orders.user_id = (select auth.uid())
  )
);

create policy "point_transactions_select_own"
on public.point_transactions
for select
to authenticated
using ((select auth.uid()) = user_id);

-- Next.jsサーバーだけが呼び出す、注文保存とポイント付与の一括処理です。
-- 同じp_order_idが再送されても、ポイントは二重付与されません。
create or replace function public.complete_purchase_for_user(
  p_order_id uuid,
  p_user_id uuid,
  p_items jsonb,
  p_product_total integer,
  p_shipping_total integer,
  p_total_amount integer,
  p_points_awarded bigint
)
returns table (
  order_id uuid,
  product_total integer,
  shipping_total integer,
  total_amount integer,
  points_awarded bigint,
  points_balance bigint,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  item_sum bigint;
  existing_order public.orders%rowtype;
begin
  if p_user_id is null then
    raise exception 'User is required';
  end if;

  select * into existing_order
  from public.orders
  where id = p_order_id;

  if found then
    if existing_order.user_id <> p_user_id then
      raise exception 'Order id is already in use';
    end if;

    return query
    select
      existing_order.id,
      existing_order.product_total,
      existing_order.shipping_total,
      existing_order.total_amount,
      existing_order.points_awarded,
      coalesce(pr.points, 0),
      existing_order.created_at
    from public.profiles pr
    where pr.user_id = p_user_id;
    return;
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Order items are required';
  end if;

  if p_product_total < 0 or p_shipping_total < 0 or p_total_amount < 0 then
    raise exception 'Invalid order total';
  end if;

  if p_total_amount <> p_product_total + p_shipping_total then
    raise exception 'Order total mismatch';
  end if;

  if p_points_awarded <> floor(p_total_amount::numeric / 100)::bigint * 200 then
    raise exception 'Points calculation mismatch';
  end if;

  select coalesce(sum((item ->> 'line_total')::bigint), 0)
  into item_sum
  from jsonb_array_elements(p_items) item;

  if item_sum <> p_product_total then
    raise exception 'Item total mismatch';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) item
    where
      coalesce(item ->> 'product_id', '') = ''
      or coalesce(item ->> 'product_name', '') = ''
      or coalesce(item ->> 'shop_id', '') = ''
      or (item ->> 'unit_price')::integer < 0
      or (item ->> 'quantity')::integer <= 0
      or (item ->> 'line_total')::integer
        <> (item ->> 'unit_price')::integer * (item ->> 'quantity')::integer
  ) then
    raise exception 'Invalid order item';
  end if;

  insert into public.orders (
    id,
    user_id,
    status,
    product_total,
    shipping_total,
    total_amount,
    points_awarded
  ) values (
    p_order_id,
    p_user_id,
    'completed',
    p_product_total,
    p_shipping_total,
    p_total_amount,
    p_points_awarded
  );

  insert into public.order_items (
    order_id,
    product_id,
    product_name,
    shop_id,
    unit_price,
    quantity,
    line_total
  )
  select
    p_order_id,
    item ->> 'product_id',
    item ->> 'product_name',
    item ->> 'shop_id',
    (item ->> 'unit_price')::integer,
    (item ->> 'quantity')::integer,
    (item ->> 'line_total')::integer
  from jsonb_array_elements(p_items) item;

  insert into public.profiles (user_id, points, updated_at)
  values (p_user_id, p_points_awarded, now())
  on conflict (user_id) do update
  set
    points = public.profiles.points + excluded.points,
    updated_at = now();

  if p_points_awarded > 0 then
    insert into public.point_transactions (user_id, order_id, kind, points)
    values (p_user_id, p_order_id, 'purchase', p_points_awarded);
  end if;

  return query
  select
    o.id,
    o.product_total,
    o.shipping_total,
    o.total_amount,
    o.points_awarded,
    pr.points,
    o.created_at
  from public.orders o
  join public.profiles pr on pr.user_id = o.user_id
  where o.id = p_order_id;
end;
$$;

revoke all on function public.complete_purchase_for_user(uuid, uuid, jsonb, integer, integer, integer, bigint) from public;
revoke all on function public.complete_purchase_for_user(uuid, uuid, jsonb, integer, integer, integer, bigint) from anon;
revoke all on function public.complete_purchase_for_user(uuid, uuid, jsonb, integer, integer, integer, bigint) from authenticated;
grant execute on function public.complete_purchase_for_user(uuid, uuid, jsonb, integer, integer, integer, bigint) to service_role;
