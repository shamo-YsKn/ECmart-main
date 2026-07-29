# ボルタ・ナッティ ガチャ機能

## 概要

- ガチャ1回: 100pt
- 景品: ボディカラー、目の色、持ちもの
- 抽選・ポイント消費・所持品保存はSupabase上の1トランザクションで処理
- 同じ抽選IDを再送してもポイントは二重消費されません
- 重複景品は `quantity` が増えます
- 獲得物はアカウント画面で一覧確認できます
- 工房では初期装備と獲得済み景品だけを選択できます
- 過去に保存したロボットの設定は互換性維持のため、そのまま読み込み可能です

## Supabase設定

購入・ポイント機能の設定後、Supabase DashboardのSQL Editorで次を実行します。

```text
supabase/gacha-inventory-migration.sql
```

必要な環境変数は購入機能と共通です。

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY` に `NEXT_PUBLIC_` を付けないでください。

## 追加テーブル

- `gacha_rewards`: 景品マスタと抽選重み
- `gacha_rolls`: 抽選履歴
- `user_gacha_inventory`: ユーザーごとの所持品と所持数

## 主なファイル

- `lib/gacha.ts`: 景品カタログと表示用ヘルパー
- `app/api/gacha/route.ts`: 認証・サーバー抽選API
- `components/views/gacha-view.tsx`: PC版の演出・結果画面
- `components/mobile/mobile-site.tsx`: スマホ版ガチャ・所持品画面
- `supabase/gacha-inventory-migration.sql`: DB/RPC設定
