# 制作機能 共通データモデル

## 目的

自由ポーズ、自作アイテム、ジオラマ、壁画共有を別々の独自形式で作ると、後から相互利用できなくなります。

そこで `lib/creation-model.ts` を、今後の制作機能で共通利用するデータ契約として定義します。

## 既存データとの関係

現在のSupabase `saved_robots.config` は `RobotConfig` です。

```ts
{
  base,
  size,
  bodyColor,
  accentColor,
  pose,
  item,
  view,
  name
}
```

これは現在の画面・既存ユーザーデータとの互換性のため、今回変更しません。

`robotConfigToCreationDocument()` と `creationDocumentToRobotConfig()` を移行アダプタとして用意しています。

自由ポーズ導入時に、既存ロボットは自動的に

```text
mode = preset
preset = 既存の pose
joints = {}
```

として読み込めます。

## SceneTransform

制作物の配置は共通して以下を使います。

```ts
interface SceneTransform {
  position: [x, y, z]
  rotationDeg: [x, y, z]
  scale: [x, y, z]
}
```

### ルール

- rotationは永続化時にdegree
- 描画時にThree.jsなどがradianを必要とする場合だけ変換
- positionはブラウザ画面のpxを直接保存しない
- 各エディタのローカル座標を保存
- 2Dではzを0として扱える

これによりスマホとPCで画面サイズが違っても、作品そのものの配置は変わりません。

## RobotPoseState

```ts
interface RobotPoseState {
  mode: "preset" | "custom"
  preset: RobotPose
  joints: Partial<Record<RobotJointId, number>>
}
```

関節ID:

- leftShoulder
- leftElbow
- rightShoulder
- rightElbow
- leftHip
- leftKnee
- rightHip
- rightKnee

関節角もdegreeで保存します。

自由ポーズ実装時は、固定ポーズを初期角度として展開し、変更された関節だけ `joints` に保存する方式を基本とします。

## 自作アイテム

`CustomItemDocument` は複数の工作パーツを持ちます。

各パーツは:

- instanceId
- partType
- transform
- variantId
- attachedTo

を持ちます。

`attachedTo` は将来の「近づけるとカチッと接続する」スナップ機能用です。

## ジオラマ

`DioramaDocument` は:

- stage
- robots
- items
- camera

を持ちます。

ロボット本体をコピーして埋め込むのではなく、原則として `savedRobotId` を参照します。

ただし公開作品で「後からロボットを編集しても展示作品を変えたくない」という要件が出た場合は、公開時にスナップショットを持つ方式へ拡張します。

## バージョニング

すべての新しい制作ドキュメントは `schemaVersion` を持ちます。

初版:

```text
schemaVersion = 1
```

将来形式を変更する場合は、保存済みデータを破壊せず `v1 -> v2` の変換関数を用意します。

## 現段階で未実装のもの

このファイルは設計基盤であり、以下のUI/DB保存はまだ実装していません。

- 自由ポーズ編集UI
- custom pose のSupabase保存
- 自作アイテム編集UI
- custom item テーブル
- ジオラマ編集UI
- diorama テーブル
- 壁画共有テーブル

次のPhaseで、この共通形式を使って順番に実装します。
