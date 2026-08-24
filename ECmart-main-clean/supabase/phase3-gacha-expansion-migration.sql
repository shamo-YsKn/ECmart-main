-- マチノワ Phase 3：ガチャ景品に特殊工作素材・室蘭ジオラマ背景を追加
-- 既に gacha-inventory-migration.sql を実行済みの環境では、このファイルだけを1回実行してください。
-- ポイント消費・抽選関数・既存所持品はそのまま維持します。

begin;

alter table public.gacha_rewards
  drop constraint if exists gacha_rewards_category_check;

alter table public.gacha_rewards
  add constraint gacha_rewards_category_check
  check (category in ('body_color', 'accent_color', 'item', 'workbench_part', 'diorama_stage'));

insert into public.gacha_rewards (id, category, label, value, rarity, weight, sort_order, is_active)
values
  ('workbench-gold-nut', 'workbench_part', '金色六角ナット', 'gold-nut', 'normal', 8, 310, true),
  ('workbench-black-nut', 'workbench_part', '黒鉄六角ナット', 'black-nut', 'normal', 8, 320, true),
  ('workbench-brass-bolt', 'workbench_part', '真鍮ボルト', 'brass-bolt', 'normal', 7, 330, true),
  ('workbench-copper-wire', 'workbench_part', '銅色の針金', 'copper-wire', 'rare', 5, 340, true),
  ('workbench-dark-spring', 'workbench_part', '黒ばね', 'dark-spring', 'rare', 5, 350, true),
  ('workbench-blue-led', 'workbench_part', '青LED', 'blue-led', 'rare', 4, 360, true),
  ('workbench-purple-led', 'workbench_part', '紫LED', 'purple-led', 'special', 2, 370, true),
  ('stage-muroran-port', 'diorama_stage', '室蘭港', 'muroran-port', 'normal', 7, 410, true),
  ('stage-muroran-it', 'diorama_stage', '室蘭工業大学', 'muroran-it', 'rare', 5, 420, true),
  ('stage-chikyu-misaki', 'diorama_stage', '地球岬', 'chikyu-misaki', 'rare', 5, 430, true),
  ('stage-sokuryozan', 'diorama_stage', '測量山', 'sokuryozan', 'rare', 4, 440, true),
  ('stage-hakucho-bridge', 'diorama_stage', '白鳥大橋', 'hakucho-bridge', 'special', 3, 450, true),
  ('stage-factory-night', 'diorama_stage', '室蘭工場夜景', 'factory-night', 'special', 2, 460, true)
on conflict (id) do update set
  category = excluded.category,
  label = excluded.label,
  value = excluded.value,
  rarity = excluded.rarity,
  weight = excluded.weight,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

commit;
