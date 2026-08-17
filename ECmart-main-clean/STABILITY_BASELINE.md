# 現状安定化ベースライン

## 今回整理した点

### ロボット設定

`lib/robot-config.ts` を唯一の正規化入口にしました。

対象:

- PC工房の保存
- PCアカウントの保存済みロボット読み込み
- スマホ工房のURLパラメータ
- スマホ保存API
- スマホ側Supabase保存
- スマホ側保存済みロボット読み込み

不正なサイズ、未知のpose/item/view、壊れた色文字列などは安全な既定値へ戻します。

### ガチャ解放条件

`lib/robot-customization.ts` に以下を集約しました。

- ボディ色
- 目の色
- 各色に対応するガチャreward ID
- 持ち物に対応するreward ID

PC版とスマホ版が同じ定義を使います。

### 工房

- 保存時の不要な重複 `setSubmitting(false)` を削除
- sessionStorageから読み込む下書きを正規化
- 古いSafari系でもmatchMedia変更監視が動くフォールバックを追加

### LAN開発

`next.config.mjs` に残っていた特定IP固定の `allowedDevOrigins` を削除しました。

通常のLANアクセスは起動hostnameを使い、追加originが必要な場合だけ `.env.local` に

```env
MACHINOWA_ALLOWED_DEV_ORIGINS=dev.example.local,*.example.local
```

のように指定できます。

### Supabase

既存テーブル形式は変更していません。

今回の基盤整理だけのために新しいSQLを実行する必要はありません。

## 推奨確認コマンド

```powershell
npm install
npm run check
npm run build
```

`npm run check` はTypeScriptチェックと基盤整合性チェックを実行します。
