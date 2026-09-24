-- Apply after Phase 6. Existing side values retain the legacy left-side view.
-- Only widens a CHECK constraint; no data or RLS policies are rewritten.
begin;
alter table public.mural_posts drop constraint if exists mural_posts_robot_view_check;
alter table public.mural_posts add constraint mural_posts_robot_view_check
  check (robot_view in ('front', 'side', 'side-right', 'back'));
commit;
