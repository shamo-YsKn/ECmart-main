# Windowsでの起動手順

## 事前準備

- Node.js 22以上をインストールしてください。
- PowerShellまたはWindows Terminalを使います。

## 1. ZIPを展開

古いプロジェクトへ上書きせず、たとえば次のような新しいフォルダへ展開します。

```text
C:\Users\Owner\Desktop\PBL\ECmart-main-clean
```

## 2. PowerShellでプロジェクトへ移動

```powershell
cd "$env:USERPROFILE\Desktop\PBL\ECmart-main-clean"
```

## 3. npmの接続先を確認

```powershell
npm config get registry
```

次が表示されれば正常です。

```text
https://registry.npmjs.org/
```

## 4. 依存パッケージをインストール

```powershell
npm install
```

## 5. 開発サーバーを起動

```powershell
npm run dev
```

ブラウザで次を開きます。

```text
http://localhost:3000
```

## Supabase機能も使う場合

1. `.env.example` をコピーして `.env.local` を作ります。
2. SupabaseのURLとPublishable keyを記入します。
3. 新規設定なら `supabase/setup.sql`、以前の設定に機能追加する場合は `supabase/robot-storage-migration.sql` をSQL Editorで実行します。
4. AuthenticationのURL設定に `http://localhost:3000` を追加します。

Supabase未設定でも、サイト本体は起動します。アカウント・プロフィール・お気に入りだけ利用できません。

## インストールに失敗した場合

開発サーバーを停止し、Node.jsを終了してから実行します。

```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm cache verify
npm install
```


## 別PC・スマホからネットワークURLで開く

このプロジェクトではNext.jsを `0.0.0.0` で待ち受けるようにしてあります。

```powershell
npm run dev:network
```

起動後、同じネットワーク上の端末から次を開けます。

```text
http://157.19.67.219:3000
```

ページ自体が開かない場合は、Windows Defender FirewallでTCP 3000番への受信を許可してください。
管理者PowerShellでは、必要に応じて次のような規則を追加できます。

```powershell
New-NetFirewallRule -DisplayName "Next.js dev 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

学校・研究室・社内ネットワークでは端末間通信がネットワーク機器側で禁止されている場合があります。
その場合はPC側の設定だけでは外部端末から到達できません。

### Supabase認証も使う場合

Supabase Dashboard の **Authentication > URL Configuration** で、少なくとも次を Redirect URLs に追加してください。

```text
http://localhost:3000/**
http://157.19.67.219:3000/**
```

開発中に Site URL を localhost のままにしていても、この版では新規登録時に現在開いているURLを `emailRedirectTo` として渡します。
ただし、そのURLがSupabaseの Redirect URLs に登録されていない場合は許可されないため、上記設定は必要です。

> 注意: `http://<IPアドレス>` はブラウザ上ではSecure Contextではありません。
> Webカメラ・位置情報などHTTPS必須の機能を今後追加する場合は、HTTPS化または正式なホスト名での公開を推奨します。
