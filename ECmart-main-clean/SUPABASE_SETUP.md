# Supabase 初期設定

このプロジェクトには、次の機能を組み込んであります。

- メールアドレス＋パスワードによる新規登録
- ログイン／ログアウト
- 表示名と「ひとこと」のプロフィール保存
- 商品のお気に入り保存
- 同じアカウントでログインした別端末とのお気に入り共有

## 1. Supabaseプロジェクトを作成

Supabaseで新しいプロジェクトを作成します。試作段階はFreeプランで構いません。

## 2. テーブルとアクセス制御を作成

Supabase Dashboardの **SQL Editor** を開き、プロジェクト内の次のファイルを貼り付けて実行します。

```text
supabase/setup.sql
```

このSQLは以下を作成します。

- `profiles` テーブル
- `favorites` テーブル
- Row Level Security（自分のデータだけ読み書き可能）
- 新規登録時のプロフィール自動作成トリガー

## 3. 環境変数を設定

`.env.example` をコピーして `.env.local` を作成します。

```bash
cp .env.example .env.local
```

Supabase Dashboardの **Connect** 画面に表示されるProject URLとPublishable keyを設定します。

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx
```

`service_role`／Secret keyはブラウザ側へ置かないでください。この実装では不要です。

## 4. 認証設定

Supabase Dashboardの **Authentication > URL Configuration** で、開発時は以下をSite URLまたはRedirect URLに追加します。

```text
http://localhost:3000
```

Vercelへ公開したあとは、実際のVercel URLも追加してください。

メール確認を有効にしている場合、新規登録後に確認メールが届きます。確認リンクを開いてからログインします。試作中だけ確認メールを省略したい場合は、Supabase DashboardのAuthentication設定でEmail confirmationを変更できます。

## 5. パッケージのインストールと起動

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

### favorites

| 列 | 内容 |
|---|---|
| `user_id` | お気に入りを登録したユーザー |
| `product_id` | `lib/data.ts` 内の商品ID |
| `created_at` | 登録日時 |

商品本体は現時点では `lib/data.ts` の固定データです。そのため `product_id` は文字列として保存しています。将来、商品もSupabaseへ移す場合は外部キーへ変更できます。
