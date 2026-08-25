-- Phase 4-1: マイジオラマ保存テーブル
-- Supabase SQL Editorで1回実行してください。

create extension if not exists pgcrypto;

create table if not exists public.dioramas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  document jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dioramas_user_updated_idx
  on public.dioramas(user_id, updated_at desc);

alter table public.dioramas enable row level security;

drop policy if exists "dioramas_select_own" on public.dioramas;
create policy "dioramas_select_own"
  on public.dioramas for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "dioramas_insert_own" on public.dioramas;
create policy "dioramas_insert_own"
  on public.dioramas for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "dioramas_update_own" on public.dioramas;
create policy "dioramas_update_own"
  on public.dioramas for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "dioramas_delete_own" on public.dioramas;
create policy "dioramas_delete_own"
  on public.dioramas for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.dioramas to authenticated;
