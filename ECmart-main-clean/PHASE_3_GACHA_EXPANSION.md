# Phase 3: ガチャ拡張（工作素材・室蘭ジオラマ背景）

## 実装内容

既存の100ptガチャへ2カテゴリを追加しました。

- `workbench_part`: ガチャ限定の特殊工作素材
- `diorama_stage`: Phase 4で使う室蘭ジオラマ背景

基本工作パーツは今まで通り無料・無制限で使用できます。特殊素材は一度獲得すると工作台で何度でも使用できます。重複した場合は従来どおり所持数だけ増えます。

## ガチャ限定工作素材

- 金色六角ナット
- 黒鉄六角ナット
- 真鍮ボルト
- 銅色の針金
- 黒ばね
- 青LED
- 紫LED

`CustomItemPartPlacement.variantId` を利用しているため、Phase 2の保存形式を壊していません。

## ジオラマ背景

最初から使える予定の「ボルタ工房」に加え、ガチャで次を獲得できます。

- 室蘭港
- 室蘭工業大学
- 地球岬
- 測量山
- 白鳥大橋
- 室蘭工場夜景

Phase 3では所持・表示までを実装し、各背景にはPhase 4でも再利用できる簡易2Dプレビューを用意しています。実際にロボットや自作アイテムを配置する編集機能はPhase 4で追加します。

## Supabase

既にガチャSQLを実行済みの場合は、次だけを1回実行します。

```text
supabase/phase3-gacha-expansion-migration.sql
```

新規環境では更新済みの `supabase/gacha-inventory-migration.sql` を実行すればPhase 3景品も含まれます。

追加テーブルはありません。既存の以下を利用します。

- `gacha_rewards`
- `gacha_rolls`
- `user_gacha_inventory`

## 主要ファイル

- `lib/gacha.ts`
- `lib/workbench-variants.ts`
- `lib/diorama-stages.ts`
- `components/workbench/workbench-part-shape.tsx`
- `components/workbench/custom-item-workshop.tsx`
- `components/views/gacha-view.tsx`
- `components/views/account-view.tsx`
- `supabase/phase3-gacha-expansion-migration.sql`
