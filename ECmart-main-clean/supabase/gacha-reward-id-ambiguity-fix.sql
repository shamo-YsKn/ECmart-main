-- ガチャ reward_id 曖昧参照エラー修正パッチ
-- Supabase Dashboard > SQL Editor で、このファイルを全文実行してください。
-- 既存ポイント・所持品・抽選履歴は削除されません。
-- 修正内容：ON CONFLICT の列指定を主キー制約名での指定へ変更。

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
