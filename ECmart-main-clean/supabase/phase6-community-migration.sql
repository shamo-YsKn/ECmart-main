-- Phase 6. Run AFTER all Phase 5 migrations. Transactional and re-runnable.
-- No private source table is made public. Snapshots are constructed on the server.
begin;

create table if not exists public.community_moderators (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.community_moderators enable row level security;
revoke all on public.community_moderators from anon, authenticated;

create or replace function public.is_community_moderator()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.community_moderators where user_id = auth.uid());
$$;
revoke all on function public.is_community_moderator() from public;
grant execute on function public.is_community_moderator() to anon, authenticated;

create table if not exists public.community_moderation (
  target_kind text not null check (target_kind in ('diorama', 'mural')),
  target_id uuid not null,
  hidden boolean not null default false,
  reason text not null check (char_length(reason) between 1 and 500),
  moderator_id uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (target_kind, target_id)
);
alter table public.community_moderation enable row level security;
revoke all on public.community_moderation from anon, authenticated;

create or replace function public.community_is_hidden(kind text, target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.community_moderation where target_kind = kind and target_id = target and hidden);
$$;
revoke all on function public.community_is_hidden(text, uuid) from public;
grant execute on function public.community_is_hidden(text, uuid) to anon, authenticated;

create table if not exists public.diorama_publications (
  id uuid primary key default gen_random_uuid(),
  diorama_id uuid not null unique references public.dioramas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 40),
  description text not null default '' check (char_length(description) <= 1000),
  author_name text not null check (char_length(author_name) between 1 and 40),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  is_public boolean not null default false,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists diorama_publications_public_idx on public.diorama_publications(published_at desc, id) where is_public;
create index if not exists diorama_publications_author_idx on public.diorama_publications(user_id);
alter table public.diorama_publications enable row level security;
revoke all on public.diorama_publications from anon, authenticated;
grant select on public.diorama_publications to anon, authenticated;
drop policy if exists publications_read on public.diorama_publications;
create policy publications_read on public.diorama_publications for select to anon, authenticated
using ((is_public and not public.community_is_hidden('diorama', id)) or user_id = auth.uid() or public.is_community_moderator());

create table if not exists public.diorama_publication_likes (
  publication_id uuid not null references public.diorama_publications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (publication_id, user_id)
);
alter table public.diorama_publication_likes enable row level security;
revoke all on public.diorama_publication_likes from anon, authenticated;
-- Only aggregate RPC results are public. No raw liker identity is exposed.

create or replace function public.publish_diorama(target_diorama_id uuid, work_title text, work_description text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  source public.dioramas%rowtype;
  robots jsonb;
  items jsonb;
  result_id uuid;
  author text;
begin
  if actor is null then raise exception 'ログインが必要です。'; end if;
  if work_title is null or char_length(btrim(work_title)) not between 1 and 40 or work_description is null or char_length(work_description) > 1000 then
    raise exception '作品名は1〜40文字、説明は1000文字以内で入力してください。';
  end if;
  select * into source from public.dioramas where id = target_diorama_id and user_id = actor for update;
  if not found then raise exception '自分の保存済みジオラマを選択してください。'; end if;
  if exists(select 1 from public.diorama_publications p where p.diorama_id = source.id and public.community_is_hidden('diorama', p.id)) then
    raise exception '管理者により非表示になっています。公開内容は更新できません。';
  end if;
  if jsonb_typeof(source.document->'robots') is distinct from 'array' or jsonb_typeof(source.document->'items') is distinct from 'array' then
    raise exception '保存データを工房で保存し直してください。';
  end if;
  if jsonb_array_length(source.document->'robots') > 24 or jsonb_array_length(source.document->'items') > 32 then
    raise exception '配置数が上限を超えています。';
  end if;
  if exists (
    select 1 from jsonb_array_elements(source.document->'robots') placement
    where not exists(select 1 from public.saved_robots r where r.id::text = placement->>'savedRobotId' and r.user_id = actor)
  ) then raise exception '参照先のロボットが見つかりません。'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name, 'config', r.config)), '[]'::jsonb)
    into robots from public.saved_robots r where r.user_id = actor and r.id::text in
      (select placement->>'savedRobotId' from jsonb_array_elements(source.document->'robots') placement);
  -- Include both placed items and custom items held by the robots. Never include unrelated assets.
  with needed as (
    select placement->>'customItemId' as id from jsonb_array_elements(source.document->'items') placement
    union
    select robot->'config'->'heldItem'->>'customItemId' from jsonb_array_elements(robots) robot
      where robot->'config'->'heldItem'->>'kind' = 'custom'
  ) select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'name', i.name, 'document', i.document)), '[]'::jsonb)
    into items from public.custom_items i where i.user_id = actor and i.id::text in (select id from needed);
  if exists (
    select 1 from (
      select placement->>'customItemId' id from jsonb_array_elements(source.document->'items') placement
      union select robot->'config'->'heldItem'->>'customItemId' from jsonb_array_elements(robots) robot
        where robot->'config'->'heldItem'->>'kind' = 'custom'
    ) needed where not exists(select 1 from jsonb_array_elements(items) i where i->>'id' = needed.id)
  ) then raise exception '参照先の自作アイテムが見つかりません。'; end if;
  select left(coalesce(nullif(btrim(display_name), ''), 'マチノワユーザー'), 40) into author from public.profiles where user_id = actor;
  insert into public.diorama_publications(diorama_id, user_id, title, description, author_name, snapshot, is_public)
  values(source.id, actor, btrim(work_title), btrim(work_description), coalesce(author, 'マチノワユーザー'),
    jsonb_build_object('schemaVersion', 1, 'document', source.document, 'robots', robots, 'customItems', items), true)
  on conflict (diorama_id) do update set title = excluded.title, description = excluded.description,
    author_name = excluded.author_name, snapshot = excluded.snapshot, is_public = true, updated_at = now()
  returning id into result_id;
  return result_id;
end;
$$;

create or replace function public.unpublish_diorama(target_diorama_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'ログインが必要です。'; end if;
  if not exists(select 1 from public.dioramas where id = target_diorama_id and user_id = auth.uid()) then
    raise exception '作品が見つかりません。';
  end if;
  update public.diorama_publications set is_public = false, updated_at = now()
    where diorama_id = target_diorama_id and user_id = auth.uid();
end;
$$;

create or replace function public.list_diorama_gallery(
  sort_order text default 'new', author_id uuid default null, page_offset integer default 0,
  page_size integer default 12, work_id uuid default null
)
returns table(id uuid, user_id uuid, title text, description text, author_name text, snapshot jsonb,
  published_at timestamptz, updated_at timestamptz, like_count bigint, liked_by_me boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, p.user_id, p.title, p.description, p.author_name, p.snapshot, p.published_at, p.updated_at,
    (select count(*) from public.diorama_publication_likes l where l.publication_id = p.id) as like_count,
    exists(select 1 from public.diorama_publication_likes l where l.publication_id = p.id and l.user_id = auth.uid())
  from public.diorama_publications p
  where p.is_public and not public.community_is_hidden('diorama', p.id)
    and (author_id is null or p.user_id = author_id) and (work_id is null or p.id = work_id)
  order by case when sort_order = 'popular' then (select count(*) from public.diorama_publication_likes l where l.publication_id = p.id) end desc,
    p.published_at desc, p.id
  limit greatest(1, least(coalesce(page_size, 12), 24)) offset greatest(0, coalesce(page_offset, 0));
$$;

create or replace function public.set_diorama_like(target_publication_id uuid, desired boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'ログインが必要です。'; end if;
  perform 1 from public.diorama_publications where id = target_publication_id and is_public
    and not public.community_is_hidden('diorama', id) for share;
  if not found then raise exception '作品は非公開または削除されています。'; end if;
  if desired then
    insert into public.diorama_publication_likes(publication_id, user_id) values(target_publication_id, auth.uid()) on conflict do nothing;
  else delete from public.diorama_publication_likes where publication_id = target_publication_id and user_id = auth.uid(); end if;
end;
$$;

create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  target_kind text not null check (target_kind in ('diorama', 'mural')),
  target_id uuid not null,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(btrim(reason)) between 1 and 500),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique(target_kind, target_id, reporter_id)
);
create index if not exists community_reports_queue_idx on public.community_reports(status, created_at desc);
alter table public.community_reports enable row level security;
revoke all on public.community_reports from anon, authenticated;

create table if not exists public.community_moderation_audit (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.community_reports(id) on delete set null,
  target_kind text not null,
  target_id uuid not null,
  action text not null check (action in ('hide', 'restore', 'dismiss')),
  reason text not null check (char_length(reason) between 1 and 500),
  moderator_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.community_moderation_audit enable row level security;
revoke all on public.community_moderation_audit from anon, authenticated;

create or replace function public.report_community_content(kind text, target uuid, report_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare owner_id uuid;
begin
  if auth.uid() is null then raise exception 'ログインが必要です。'; end if;
  if report_reason is null or char_length(btrim(report_reason)) not between 1 and 500 then raise exception '通報理由は1〜500文字で入力してください。'; end if;
  if kind = 'diorama' then
    select user_id into owner_id from public.diorama_publications where id = target and is_public;
  elsif kind = 'mural' then select user_id into owner_id from public.mural_posts where id = target;
  else raise exception '対象の種類が不正です。'; end if;
  if owner_id is null or public.community_is_hidden(kind, target) then raise exception '公開中の投稿が見つかりません。'; end if;
  if owner_id = auth.uid() then raise exception '自分の投稿は編集・削除してください。'; end if;
  -- Serialize per reporter so simultaneous requests cannot bypass the daily limit.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if exists(select 1 from public.community_reports where target_kind = kind and target_id = target and reporter_id = auth.uid()) then return; end if;
  if (select count(*) from public.community_reports where reporter_id = auth.uid() and created_at > now() - interval '1 day') >= 20 then
    raise exception '本日の通報上限に達しました。';
  end if;
  insert into public.community_reports(target_kind, target_id, reporter_id, reason) values(kind, target, auth.uid(), btrim(report_reason));
end;
$$;

create or replace function public.list_community_reports(queue_status text default 'open', page_offset integer default 0)
returns table(id uuid, target_kind text, target_id uuid, reason text, status text, created_at timestamptz,
  hidden boolean, target_content jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_community_moderator() then raise exception '管理者権限が必要です。'; end if;
  return query select r.id, r.target_kind, r.target_id, r.reason, r.status, r.created_at,
    public.community_is_hidden(r.target_kind, r.target_id),
    case when r.target_kind = 'diorama' then
      (select jsonb_build_object('title', p.title, 'description', p.description, 'author_name', p.author_name, 'snapshot', p.snapshot) from public.diorama_publications p where p.id = r.target_id)
    else (select jsonb_build_object('robot_name', p.robot_name, 'review', p.review, 'author_name', p.author_name, 'spot_id', p.spot_id) from public.mural_posts p where p.id = r.target_id) end
  from public.community_reports r where r.status = queue_status
  order by r.created_at desc, r.id limit 20 offset greatest(0, coalesce(page_offset, 0));
end;
$$;

create or replace function public.moderate_community_report(report_id uuid, action text, decision_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare target_report public.community_reports%rowtype;
begin
  if not public.is_community_moderator() then raise exception '管理者権限が必要です。'; end if;
  if action is null or action not in ('hide', 'restore', 'dismiss') or decision_reason is null or char_length(btrim(decision_reason)) not between 1 and 500 then
    raise exception '操作と対応理由を確認してください。';
  end if;
  select * into target_report from public.community_reports where id = report_id for update;
  if not found then raise exception '通報が見つかりません。'; end if;
  insert into public.community_moderation_audit(report_id, target_kind, target_id, action, reason, moderator_id)
    values(target_report.id, target_report.target_kind, target_report.target_id, action, btrim(decision_reason), auth.uid());
  if action <> 'dismiss' then
    insert into public.community_moderation(target_kind, target_id, hidden, reason, moderator_id)
    values(target_report.target_kind, target_report.target_id, action = 'hide', btrim(decision_reason), auth.uid())
    on conflict(target_kind, target_id) do update set hidden = excluded.hidden, reason = excluded.reason, moderator_id = excluded.moderator_id, updated_at = now();
  end if;
  update public.community_reports set status = case when action = 'dismiss' then 'dismissed' else 'resolved' end, resolved_at = now() where id = report_id;
end;
$$;

-- Hidden mural posts disappear from public reads (including the mobile server path).
drop policy if exists mural_posts_select_public on public.mural_posts;
create policy mural_posts_select_public on public.mural_posts for select to anon, authenticated
using (not public.community_is_hidden('mural', id) or user_id = auth.uid() or public.is_community_moderator());
create or replace function public.get_mural_like_counts(target_spot_id text)
returns table(post_id uuid, like_count bigint, liked_by_me boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, count(l.user_id)::bigint, coalesce(bool_or(l.user_id = auth.uid()), false)
  from public.mural_posts p left join public.mural_post_likes l on l.post_id = p.id
  where p.spot_id = target_spot_id and (not public.community_is_hidden('mural', p.id) or p.user_id = auth.uid() or public.is_community_moderator())
  group by p.id;
$$;
drop policy if exists mural_likes_insert_own on public.mural_post_likes;
create policy mural_likes_insert_own on public.mural_post_likes for insert to authenticated
with check (user_id = auth.uid() and exists(select 1 from public.mural_posts p where p.id = post_id and not public.community_is_hidden('mural', p.id)));

revoke all on function public.publish_diorama(uuid, text, text) from public;
revoke all on function public.unpublish_diorama(uuid) from public;
revoke all on function public.list_diorama_gallery(text, uuid, integer, integer, uuid) from public;
revoke all on function public.set_diorama_like(uuid, boolean) from public;
revoke all on function public.report_community_content(text, uuid, text) from public;
revoke all on function public.list_community_reports(text, integer) from public;
revoke all on function public.moderate_community_report(uuid, text, text) from public;
grant execute on function public.publish_diorama(uuid, text, text), public.unpublish_diorama(uuid), public.set_diorama_like(uuid, boolean), public.report_community_content(text, uuid, text), public.list_community_reports(text, integer), public.moderate_community_report(uuid, text, text) to authenticated;
grant execute on function public.list_diorama_gallery(text, uuid, integer, integer, uuid) to anon, authenticated;
commit;
