# Supabase 初期設定

このプロジェクトには、次の機能を組み込んであります。

- メールアドレス＋パスワードによる新規登録
- ログイン／ログアウト
- 表示名と「ひとこと」のプロフィール保存
- 商品のお気に入り保存
- 自作したボルタ／ナッティの保存・再編集
- 保存したロボットをアカウントアイコンに設定
- 同じアカウントでログインした別端末とのデータ共有
- 購入履歴の保存
- 購入100円ごとに200ptのサイト内ポイント付与
- スポット別壁画レビューといいねの公開共有

## すでに以前のSQLを実行済みの場合

ロボット保存機能が未設定の場合は、Supabase Dashboardの **SQL Editor** で次を実行します。

```text
supabase/robot-storage-migration.sql
```

購入・ポイント機能を追加するには、続けて次を実行します。

```text
supabase/purchase-points-migration.sql
```

Phase 5の室蘭マップ・壁画共有を追加する場合は次も1回実行します。

```text
supabase/mural-community-migration.sql
```

既存のアカウント・プロフィール・お気に入り・保存ロボットはそのまま残ります。

## 新しくSupabaseを設定する場合

### 1. Supabaseプロジェクトを作成

Supabaseで新しいプロジェクトを作成します。試作段階はFreeプランで構いません。

### 2. テーブルとアクセス制御を作成

Supabase Dashboardの **SQL Editor** を開き、プロジェクト内の次のファイルを貼り付けて実行します。

```text
supabase/setup.sql
```

このSQLは以下を作成します。

- `profiles` テーブル
- `favorites` テーブル
- `saved_robots` テーブル
- Row Level Security（本人のデータだけ保存・編集・削除可能）
- 新規登録時のプロフィール自動作成トリガー
- アカウントアイコンを1体だけ選択するための関数
- `orders` / `order_items` / `point_transactions` テーブル
- 注文保存とポイント付与を同時に行う購入関数

### 3. 環境変数を設定

`.env.example` をコピーして `.env.local` を作成します。

```bash
cp .env.example .env.local
```

Windows PowerShellでは次のコマンドでも作成できます。

```powershell
Copy-Item .env.example .env.local
```

Supabase Dashboardの **Connect** 画面に表示されるProject URLとPublishable keyを設定します。

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxx
```

`SUPABASE_SERVICE_ROLE_KEY` は購入金額をサーバー側で検証し、安全にポイントを付与するために使用します。`NEXT_PUBLIC_` は絶対に付けず、Gitへコミットしたりブラウザ側のコードへ書いたりしないでください。

### 4. 認証設定

Supabase Dashboardの **Authentication > URL Configuration** で、開発時は以下をSite URLまたはRedirect URLに追加します。

```text
http://localhost:3000/**
http://157.19.67.219:3000/**
```

この実装では確認メールの戻り先に、登録操作を行ったブラウザの `window.location.origin` を使います。
そのため、利用するlocalhost・ネットワークURL・本番URLをRedirect URLsへ登録してください。
Vercelへ公開したあとは、実際のVercel URLも追加してください。

メール確認を有効にしている場合、新規登録後に確認メールが届きます。確認リンクを開いてからログインします。

### 5. パッケージのインストールと起動

```bash
npm install
npm run dev
```

pnpmを利用する場合は次のとおりです。

```bash
pnpm install
pnpm dev
```

## データ構成

### profiles

| 列 | 内容 |
|---|---|
| `user_id` | Supabase AuthのユーザーID |
| `display_name` | サイト上の表示名 |
| `bio` | ひとことプロフィール |
| `points` | サイト内の保有ポイント |

### favorites

| 列 | 内容 |
|---|---|
| `user_id` | お気に入りを登録したユーザー |
| `product_id` | `lib/data.ts` 内の商品ID |
| `created_at` | 登録日時 |

### saved_robots

| 列 | 内容 |
|---|---|
| `id` | 保存ロボット固有のID |
| `user_id` | 作成したユーザー |
| `name` | ロボットの名前 |
| `config` | 種類、色、ポーズ、持ち物、大きさなどの設定（JSON） |
| `is_avatar` | アカウントアイコンとして選択中か |
| `created_at` / `updated_at` | 作成・更新日時 |

本人は自分の保存ロボットをすべて読み書きできます。アカウントアイコンに設定した1体の外観設定だけは、将来レビュー欄などで表示できるよう公開読み取りを許可しています。メールアドレスやパスワードはこのテーブルには保存されません。


### mural_posts / mural_post_likes

`mural_posts` はスポット別壁画の公開レビューを保存します。投稿時のロボット外観をJSONスナップショットとして保持し、元の保存ロボットを後から編集してもレビュー時点の見た目を維持します。

`mural_post_likes` は壁画投稿へのいいねを保存します。閲覧は公開、投稿・削除・いいね操作はRLSで本人だけに制限します。メールアドレスやパスワードは壁画テーブルには保存しません。

### orders / order_items

購入完了時の注文金額と商品明細を保存します。同じ注文IDを再送しても、ポイントが二重に付与されない構成です。

### point_transactions

購入によるポイント付与履歴を保存します。現在の残高は `profiles.points` で確認できます。

## ポイント計算

```text
獲得ポイント = floor(支払合計 ÷ 100) × 200
```

商品合計と送料を含む支払合計を基準に計算します。この購入画面はデモ用の注文確定機能で、クレジットカードなどの実決済サービスはまだ接続していません。
