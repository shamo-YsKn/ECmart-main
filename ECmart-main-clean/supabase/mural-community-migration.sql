-- Phase 5: 室蘭マップ / スポット別壁画 / レビュー / いいね
-- Supabase Dashboard > SQL Editor で1回実行してください。

create extension if not exists pgcrypto;

create table if not exists public.mural_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  spot_id text not null check (char_length(spot_id) between 1 and 80),
  saved_robot_id uuid not null,
  author_name text not null check (char_length(author_name) between 1 and 40),
  robot_name text not null check (char_length(robot_name) between 1 and 40),
  robot_config jsonb not null check (jsonb_typeof(robot_config) = 'object'),
  robot_view text not null default 'front' check (robot_view in ('front', 'side', 'back')),
  mural_variant text not null default 'default' check (char_length(mural_variant) between 1 and 40),
  custom_item_document jsonb,
  review text not null check (char_length(review) between 1 and 400),
  position_x numeric not null default 50 check (position_x between 0 and 100),
  position_y numeric not null default 62 check (position_y between 0 and 100),
  scale numeric not null default 0.9 check (scale between 0.4 and 1.6),
  rotation_deg numeric not null default 0 check (rotation_deg between -30 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, spot_id, mural_variant, saved_robot_id)
);

create table if not exists public.mural_post_likes (
  post_id uuid not null references public.mural_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists mural_posts_spot_created_idx
  on public.mural_posts (spot_id, created_at desc);
create index if not exists mural_posts_user_created_idx
  on public.mural_posts (user_id, created_at desc);
create index if not exists mural_post_likes_post_idx
  on public.mural_post_likes (post_id, created_at desc);

alter table public.mural_posts enable row level security;
alter table public.mural_post_likes enable row level security;

grant select on public.mural_posts to anon, authenticated;
grant select on public.mural_post_likes to authenticated;
grant insert, update, delete on public.mural_posts to authenticated;
grant insert, delete on public.mural_post_likes to authenticated;

-- 壁画は街の共有空間なので、投稿内容は未ログインでも閲覧可能です。
drop policy if exists "mural_posts_select_public" on public.mural_posts;
create policy "mural_posts_select_public"
  on public.mural_posts for select
  to anon, authenticated
  using (true);

-- 投稿の追加・編集・削除は本人だけ。
drop policy if exists "mural_posts_insert_own" on public.mural_posts;
create policy "mural_posts_insert_own"
  on public.mural_posts for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "mural_posts_update_own" on public.mural_posts;
create policy "mural_posts_update_own"
  on public.mural_posts for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "mural_posts_delete_own" on public.mural_posts;
create policy "mural_posts_delete_own"
  on public.mural_posts for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- いいねの生データ（誰が押したか）は本人だけ読めます。
-- 公開画面には下の集計RPCで件数だけ返し、他ユーザーのUUIDを公開しません。
drop policy if exists "mural_likes_select_public" on public.mural_post_likes;
drop policy if exists "mural_likes_select_own" on public.mural_post_likes;
create policy "mural_likes_select_own"
  on public.mural_post_likes for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "mural_likes_insert_own" on public.mural_post_likes;
create policy "mural_likes_insert_own"
  on public.mural_post_likes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "mural_likes_delete_own" on public.mural_post_likes;
create policy "mural_likes_delete_own"
  on public.mural_post_likes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- 公開用いいね集計。件数と「自分がいいね済みか」だけを返します。
create or replace function public.get_mural_like_counts(target_spot_id text)
returns table (
  post_id uuid,
  like_count bigint,
  liked_by_me boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    posts.id as post_id,
    count(likes.user_id)::bigint as like_count,
    coalesce(bool_or(likes.user_id = (select auth.uid())), false) as liked_by_me
  from public.mural_posts as posts
  left join public.mural_post_likes as likes on likes.post_id = posts.id
  where posts.spot_id = target_spot_id
  group by posts.id;
$$;

revoke all on function public.get_mural_like_counts(text) from public;
grant execute on function public.get_mural_like_counts(text) to anon, authenticated;

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

drop trigger if exists mural_posts_set_updated_at on public.mural_posts;
create trigger mural_posts_set_updated_at
  before update on public.mural_posts
  for each row execute procedure public.set_updated_at();
