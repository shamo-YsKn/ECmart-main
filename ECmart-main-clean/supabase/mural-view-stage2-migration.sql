-- Phase 5 extension: まち歩きの正面/側面/背面配置 + 室工大第2壁画ステージ
-- 既に mural-community-migration.sql を実行済みの環境で、このSQLを1回実行してください。

alter table public.mural_posts
  add column if not exists robot_view text not null default 'front';

alter table public.mural_posts
  add column if not exists mural_variant text not null default 'default';

-- 既存データはすべて正面・通常ステージとして扱います。
update public.mural_posts set robot_view = 'front' where robot_view is null;
update public.mural_posts set mural_variant = 'default' where mural_variant is null or btrim(mural_variant) = '';

alter table public.mural_posts
  drop constraint if exists mural_posts_robot_view_check;
alter table public.mural_posts
  add constraint mural_posts_robot_view_check
  check (robot_view in ('front', 'side', 'back'));

alter table public.mural_posts
  drop constraint if exists mural_posts_mural_variant_check;
alter table public.mural_posts
  add constraint mural_posts_mural_variant_check
  check (char_length(mural_variant) between 1 and 40);

-- 旧仕様では「同じ場所に同じロボットは1回」でした。
-- 第2壁画を追加したため「同じ場所・同じ壁画ステージに同じロボットは1回」へ変更します。
alter table public.mural_posts
  drop constraint if exists mural_posts_user_id_spot_id_saved_robot_id_key;

create unique index if not exists mural_posts_user_spot_variant_robot_uidx
  on public.mural_posts (user_id, spot_id, mural_variant, saved_robot_id);

create index if not exists mural_posts_spot_variant_created_idx
  on public.mural_posts (spot_id, mural_variant, created_at desc);
