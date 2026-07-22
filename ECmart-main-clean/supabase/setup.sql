-- マチノワ：アカウント、プロフィール、お気に入り用セットアップ
-- Supabase Dashboard > SQL Editor に貼り付けて実行してください。

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 40),
  bio text check (char_length(bio) <= 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index if not exists favorites_user_id_created_at_idx
  on public.favorites (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.favorites enable row level security;

-- 再実行しやすいよう、同名ポリシーを一度削除します。
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "favorites_select_own" on public.favorites;
drop policy if exists "favorites_insert_own" on public.favorites;
drop policy if exists "favorites_delete_own" on public.favorites;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "favorites_select_own"
on public.favorites
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "favorites_insert_own"
on public.favorites
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "favorites_delete_own"
on public.favorites
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- 新規アカウント作成時にプロフィール行を自動作成します。
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- updated_atを自動更新します。
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ===== 自作ロボット保存・アカウントアイコン =====
-- マチノワ：自作ボルタ／ナッティ保存・アカウントアイコン機能
-- すでに profiles / favorites を作成済みのプロジェクトでは、
-- このファイルだけを Supabase Dashboard > SQL Editor で実行してください。

create extension if not exists pgcrypto;

create table if not exists public.saved_robots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  config jsonb not null check (jsonb_typeof(config) = 'object'),
  is_avatar boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_robots_user_id_updated_at_idx
  on public.saved_robots (user_id, updated_at desc);

-- 1ユーザーにつき、アカウントアイコンは最大1体です。
create unique index if not exists saved_robots_one_avatar_per_user_idx
  on public.saved_robots (user_id)
  where is_avatar = true;

alter table public.saved_robots enable row level security;

grant select on public.saved_robots to anon;
grant select, insert, update, delete on public.saved_robots to authenticated;

drop policy if exists "saved_robots_select_own" on public.saved_robots;
drop policy if exists "saved_robots_select_public_avatar" on public.saved_robots;
drop policy if exists "saved_robots_insert_own" on public.saved_robots;
drop policy if exists "saved_robots_update_own" on public.saved_robots;
drop policy if exists "saved_robots_delete_own" on public.saved_robots;

-- 本人は、自分が保存した全ロボットを閲覧できます。
create policy "saved_robots_select_own"
on public.saved_robots
for select
to authenticated
using ((select auth.uid()) = user_id);

-- アイコンに設定した1体だけは、将来レビュー欄などで表示できるよう公開します。
-- 公開されるのはロボットの名前・外観設定・ユーザーIDなどで、メールアドレスは含まれません。
create policy "saved_robots_select_public_avatar"
on public.saved_robots
for select
to anon, authenticated
using (is_avatar = true);

create policy "saved_robots_insert_own"
on public.saved_robots
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "saved_robots_update_own"
on public.saved_robots
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "saved_robots_delete_own"
on public.saved_robots
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- updated_at を自動更新します。
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists saved_robots_set_updated_at on public.saved_robots;
create trigger saved_robots_set_updated_at
  before update on public.saved_robots
  for each row execute procedure public.set_updated_at();

-- アイコン切り替えを1回の処理で安全に行います。
create or replace function public.set_robot_avatar(target_robot_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.saved_robots
    where id = target_robot_id
      and user_id = current_user_id
  ) then
    raise exception 'Robot not found or access denied' using errcode = '42501';
  end if;

  update public.saved_robots
  set is_avatar = false
  where user_id = current_user_id
    and is_avatar = true
    and id <> target_robot_id;

  update public.saved_robots
  set is_avatar = true
  where id = target_robot_id
    and user_id = current_user_id;
end;
$$;

revoke all on function public.set_robot_avatar(uuid) from public;
grant execute on function public.set_robot_avatar(uuid) to authenticated;

