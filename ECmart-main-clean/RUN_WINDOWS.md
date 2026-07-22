# Windowsでの起動手順

## 事前準備

- Node.js 20.9以上をインストールしてください。
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
3. Supabase SQL Editorで `supabase/setup.sql` を実行します。
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
