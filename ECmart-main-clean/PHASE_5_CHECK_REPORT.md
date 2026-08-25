# Phase 5 Check Report

検証日: 2026-08-25

## 対象

Phase 4 ジオラマ版を基準に、Phase 5「室蘭マップ・スポット別壁画・レビュー共有」を追加した版。

## 実装確認

- 室蘭デフォルメマップ: 12スポット
- スポットID重複: なし
- 店舗スポット `relatedShopId`: 既存 `lib/data.ts` と全件対応
- 壁画テーマ: 11種類すべて `MuralBackground` に描画実装あり
- スポット別NPC: 日付 + spotId seed、実投稿数に応じた人数調整
- NPCはDB保存せず、レビュー / 作者 / いいねを持たない
- 公開壁画投稿: RobotConfig + 必要なCustomItemDocumentを投稿時スナップショット保存
- 店舗スポット: 既存EC商品 / カートへ接続
- いいね: raw liker一覧を公開せず、`get_mural_like_counts` RPCで件数と自分の状態のみ取得
- スマホ互換表示: スポット / NPC / 公開レビュー / 店舗商品を閲覧可能

## 自動検証

以下はすべてPASS。

```text
validate-foundation
validate-phase2-1
validate-phase2
validate-phase3
validate-phase4
validate-phase5
```

Phase 5 validator result:

```text
PHASE5_VALIDATE_OK
```

TypeScript / TSX 構文チェック:

```text
TRANSPILE_FILES=68 ERRORS=0
```

Phase 5データ層 (`mural-spots.ts`, `mural-model.ts`, `mural-npc.ts`) は strict TypeScript チェックPASS。

追加静的整合性チェック:

```text
SPOT_COUNT=12
SPOT_ID_DUPLICATES=0
RELATED_SHOP_MISSING=0
MURAL_THEME_RENDERER_MISSING=0
```

## Supabase

既存環境では `supabase/mural-community-migration.sql` を1回実行する。

追加:

- `public.mural_posts`
- `public.mural_post_likes`
- `public.get_mural_like_counts(text)`

RLSにより、投稿変更 / 削除 / いいね変更は本人だけ。壁画投稿自体は共有ページのため公開閲覧。いいねの生データは本人のみ読み取り可能で、公開UIは集計RPCを使用する。

## 完全buildについて

依存パッケージを含む `npm install --ignore-scripts --no-audit --no-fund` を試行したが、この実行環境では180秒でタイムアウトしたため、`next build` の完全実行は未確認。

`node_modules` は成果物へ含めていない。手元では以下で最終確認可能。

```powershell
npm install
npm run check
npm run build
npm run start:network
```
