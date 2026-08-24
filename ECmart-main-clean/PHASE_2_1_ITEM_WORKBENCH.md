# Phase 2-1: 2Dアイテム工作エディタ

## 実装済み

- 基本工作パーツ11種類
  - 六角ナット / ワッシャー / ボルト / 皿ねじ / なべねじ
  - 金属棒 / 針金 / ばね
  - 赤LED / 緑LED / 黄LED
- SVG工作台へパーツ追加
- Pointer Eventsによるドラッグ移動
- Z回転 -180〜180°
- 均一スケール 40〜250%
- 手前 / 奥の重なり順変更
- パーツ複製 / 削除
- 最大60パーツ
- 作品名の設定
- Supabase `custom_items` への保存 / 上書き / 別作品保存 / 削除
- アカウント画面で自作アイテム一覧を確認
- 保存作品を工作台へ再読み込みして編集

## Supabase

`supabase/custom-items-migration.sql` をSQL Editorで1回実行します。

このSQLは `custom_items` テーブルと、自分のデータだけを読み書きできるRLS policyを追加します。
既存の購入・ポイント・ガチャ・ロボット保存テーブルは変更しません。

## 保存形式

既存の `lib/creation-model.ts` の `CustomItemDocument` を使用します。

- `position`: 工作台のローカル座標
- `rotationDeg[2]`: 2D回転
- `scale`: XYZへ同じ値を入れた均一スケール
- `parts[]` の配列順: 2D描画の奥→手前

## 次のPhase

Phase 2-2では `attachedTo` と接続ソケットを利用し、パーツ同士を近づけるとカチッと接続されるスナップ機能を追加します。
Phase 2-3では完成した自作アイテムをボルタ / ナッティへ持たせます。

## モバイル互換モード

現在のスマホ版はReact hydrationに依存しないサーバー/Ajax互換モードのため、Phase 2-1の自由ドラッグ工作はPC版で提供します。既存のスマホEC・ロボット・購入・ガチャ機能は維持しています。
