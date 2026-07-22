# ロボット工房 3D実装

## 追加した操作

- マウスドラッグ／タッチスワイプ: 360度回転
- マウスホイール／2本指ピンチ: 拡大・縮小
- 正面／側面／背面ボタン: 基準視点を切り替え
- ボディ色、アクセント色、サイズ、ボルタ／ナッティ、ポーズ、持ち物を3Dモデルへ反映

## 保存データ互換性

Supabaseへ保存する `RobotConfig` の形式は変更していません。

```ts
{
  base,
  size,
  bodyColor,
  accentColor,
  pose,
  item,
  view,
  name,
}
```

3D表示専用の回転角やズーム値は一時的な画面状態として扱い、保存データには追加しません。

## セットアップ

```bash
npm install
npm run typecheck
npm run build
```

依存関係は `package.json` に記載され、レジストリは `.npmrc` で公開npmを指定しています。
