# Phase 2: アイテム工作 完成版

Phase 2-1 / 2-2 / 2-3 をまとめて実装した基準版です。

## Phase 2-1: 2D工作エディタ

- 六角ナット / ワッシャー / ボルト / 皿ねじ / なべねじ
- 金属棒 / 針金 / ばね
- 赤 / 緑 / 黄LED
- ドラッグ移動、回転、拡大縮小
- 重なり順、複製、削除
- Supabase `custom_items` への保存 / 再編集 / 削除

## Phase 2-2: スナップ接続

- 各工作パーツに複数の接続ソケットを定義
- パーツを近づけると最寄りのソケットへ吸着
- スナップ ON / OFF を切り替え可能
- 接続済みパーツは `attachedTo` に接続元/接続先socketを保存
- 親パーツを移動すると接続済みの子パーツも一緒に移動
- 回転 / 拡大縮小後も接続点を再計算
- 選択パーツから接続解除可能
- 移動中は接続候補をオレンジのポイントで表示

保存形式:

```ts
attachedTo: {
  instanceId: string      // 接続先パーツ
  socketId: string        // 接続先socket
  ownSocketId: string     // 自分側socket
}
```

## Phase 2-3: ボルタ / ナッティへの装備

`RobotConfig` に `heldItem` を追加しました。

```ts
heldItem:
  | { kind: "builtin", item: RobotItem }
  | {
      kind: "custom",
      customItemId: string,
      adjustment: {
        offsetX: number,
        offsetY: number,
        rotationDeg: number,
        scale: number
      }
    }
```

- ロボット工房の「持たせるモノ」にマイアイテム一覧を追加
- 自作アイテムを選ぶと右手へ追従
- 自由ポーズで手を動かしても自作アイテムが追従
- 大きさ / 回転 / 左右位置 / 上下位置を微調整可能
- 装備状態も `saved_robots.config` 内へ保存
- 保存済みロボットやアバターの2D表示にも自作アイテムを反映
- 装備中の自作アイテムは誤削除を防止

自作アイテムは現段階では2D制作物のため、装備中は3Dプレビューを無効化しています。3D工作・3D装備はPhase 7で扱います。

## Supabase

Phase 2-1で `supabase/custom-items-migration.sql` を実行済みなら追加SQLは不要です。
`heldItem` は既存 `saved_robots.config` JSON内へ保存するため、テーブル変更はありません。

## 次の段階

Phase 3: ガチャ拡張

- 特殊工作素材
- 特殊色 / 特殊LED
- 特殊ナット / ワッシャー
- ジオラマ背景

を既存の100ptガチャへ追加していきます。

## 操作導線

保存済みの自作アイテムは工作画面の「ロボットに持たせる」からロボット工房へ渡せます。ロボット工房ではマイアイテム一覧から別作品へ切り替えることもできます。
