-- Phase 2-1: 2Dアイテム工作エディタ用保存テーブル
-- Supabase SQL Editorで1回実行してください。

create extension if not exists pgcrypto;

create table if not exists public.custom_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  document jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists custom_items_user_updated_idx
  on public.custom_items(user_id, updated_at desc);

alter table public.custom_items enable row level security;

drop policy if exists "custom_items_select_own" on public.custom_items;
create policy "custom_items_select_own"
  on public.custom_items for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "custom_items_insert_own" on public.custom_items;
create policy "custom_items_insert_own"
  on public.custom_items for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "custom_items_update_own" on public.custom_items;
create policy "custom_items_update_own"
  on public.custom_items for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "custom_items_delete_own" on public.custom_items;
create policy "custom_items_delete_own"
  on public.custom_items for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.custom_items to authenticated;
