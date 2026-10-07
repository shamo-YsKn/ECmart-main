# LAN / 別端末で「リンクだけ動き、ボタンが反応しない」場合の修正

## 原因

上部ナビなどの `<a href>` は React が起動していなくてもブラウザ標準機能で遷移できます。
一方、工房・カート・ガチャなどの多くの操作は React の `onClick` に依存します。
そのため、LAN 経由の別端末で Next.js の hydration が完了しないと、
「上のリンクは動くのに本文のボタンが反応しない」という見え方になります。

## 今回追加した対策

- `sec-ch-ua-mobile` も使ってスマホ判定を補強。
- `?compat=1` で明示的にサーバー互換UIを選べるようにした。
- React版には hydration 完了マーカーを追加。
- 4.5秒以内に hydration しなかった場合、`runtime-compat.js` が同じURLの `?compat=1` へ自動退避。
- サーバー互換UIは通常リンク / HTML form を中心に動くため、Reactが起動できない端末でも主要操作を継続できる。

## 推奨起動方法

別端末・スマホから操作確認するときは development ではなく production を使います。

```powershell
npm install
npm run build
npm run start:network
```

同じLANの別端末から:

```text
http://<PCのIPv4アドレス>:3000
```

もしReact版だけ操作不能なら、手動でも次を付けると互換UIに切り替えられます。

```text
http://<PCのIPv4アドレス>:3000/?compat=1
```

## 注意

サーバー互換UIでは、自由ドラッグを多用する2Dアイテム工作・ジオラマ編集など一部機能はPC React版を優先しています。
モダンなPC/ブラウザでは production 起動で通常React版を使うのが第一選択です。
