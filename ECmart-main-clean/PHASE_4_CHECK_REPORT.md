# Phase 4 Check Report

対象: Phase 4-1 / 4-2 マイジオラマエディタ初版

## 実装確認

- ガチャで獲得したジオラマ背景を選択可能
- 初期背景「ボルタ工房」を常時利用可能
- 保存済みボルタ / ナッティを複数回配置可能
- 保存済み自作アイテムを複数回配置可能
- 各配置に position / rotationDeg / scale / layer(z) を保存
- ドラッグ移動、回転、拡大縮小、前後順、複製、削除に対応
- ジオラマ名を付けてSupabaseへ保存 / 上書き / 別名保存可能
- マイページで保存済みジオラマをプレビュー / 再編集 / 削除可能
- 使用中の保存ロボット・自作アイテムは先にジオラマから外さない限り削除不可
- ガチャ結果のジオラマ背景から直接エディタへ移動可能
- スマホ互換モードではPC版エディタ利用案内を表示

## Supabase

新規SQL:

`supabase/dioramas-migration.sql`

既存の購入 / ポイント / ガチャ / saved_robots / custom_items テーブルは変更しない。

## 検証結果

- `scripts/validate-foundation.mjs`: PASS
- `scripts/validate-phase2-1.mjs`: PASS
- `scripts/validate-phase2.mjs`: PASS
- `scripts/validate-phase3.mjs`: PASS
- `scripts/validate-phase4.mjs`: PASS
- TypeScript transpile syntax check: 62 TS/TSX files, 0 syntax errors
- ZIP作成前に node_modules / .next / .git / .env.local / tsconfig.tsbuildinfo / package-lock.json が含まれていないことを確認

## 未実施

この実行環境では `npm install` がタイムアウトしたため、依存パッケージを導入した状態での `npm run typecheck` / `next build` は完了していない。
ローカル環境では `npm install` 後に `npm run check` と `npm run build` を実行すること。
