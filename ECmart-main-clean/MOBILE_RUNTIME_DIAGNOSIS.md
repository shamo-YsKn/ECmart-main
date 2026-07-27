# スマホでリンクだけ動き、ボタンが反応しない場合

## 症状

- ページは表示される
- 上下スクロールはできる
- `<a href>` の通常リンクは動く
- 下部タブはURL遷移する
- React の `onClick` ボタン、カート、工房の選択などが反応しない

この組み合わせは、画面上に透明レイヤーが被っている症状ではなく、
React の hydration / bootstrap がスマホ側で完了していないときの挙動と一致します。

## この版での対策

1. Next.js を 16.2.11 へ更新
2. スマホ/LANの確認は `next dev` ではなく production 起動を推奨
3. `npm run start:network` を追加
4. 比較用に `npm run dev:network:webpack` を追加
5. Supabaseは明示的な認証操作まで遅延ロード
6. 新しいタブは未ログイン、ログイン済みの同じタブだけ sessionStorage で復元
7. お気に入り・保存ロボット取得を最大3回再試行
8. 一時的な取得失敗で既存のお気に入り・ロボット一覧を空にしない

## スマホ確認手順

```powershell
npm install
npm run build
npm run start:network
```

スマホから:

```text
http://<PCのIPv4アドレス>:3000
```

`npm run dev:network` は開発用です。PCでの編集確認には便利ですが、
スマホの最終動作判定には production 起動を使ってください。
