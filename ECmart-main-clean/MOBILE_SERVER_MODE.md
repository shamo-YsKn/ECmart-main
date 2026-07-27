# スマホ互換モード

スマホでは、React/Next.js のクライアント Hydration が失敗しても主要操作が止まらないよう、User-Agent を見てサーバー駆動のHTML画面を返します。

- 下部タブ、ショップ絞り込み、商品表示: 通常リンク
- カート操作: HTML form -> `/api/mobile/cart`
- ログイン: HTML form -> `/api/mobile/auth/login` -> Next.jsサーバーからSupabase Authへ接続
- お気に入り: HTML form -> `/api/mobile/favorite`
- ロボット工房: 2D固定、設定はクエリパラメータで再描画
- ロボット保存: HTML form -> `/api/mobile/robot`
- PC: 従来のReact UIと2D/3D切替を維持

スマホの認証Cookieは永続期限を付けないセッションCookieです。新しいブラウザセッションでは再ログインする設計です。
