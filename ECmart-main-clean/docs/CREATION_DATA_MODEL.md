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
  name,
  poseState?
}
```

旧データには `poseState` がありませんが、読み込み時に自動補完します。既存キーは変更していません。

`robotConfigToCreationDocument()` と `creationDocumentToRobotConfig()` を移行アダプタとして用意しています。

自由ポーズ導入時に、既存ロボットは自動的に

```text
mode = preset
preset = 既存の pose
joints = {}
axes.front = {}
axes.side = {}
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
  // Phase 1-2 v1互換。front軸のエイリアス
  joints: Partial<Record<RobotJointId, number>>
  axes?: {
    front?: Partial<Record<RobotJointId, number>>
    side?: Partial<Record<RobotJointId, number>>
  }
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

- `front`: 正面の左右方向。背面でも同じ物理ポーズを共有する
- `side`: 側面から見た前後方向
- `joints`: 旧Phase 1-2データとの互換用で、`front` として読み込む

固定ポーズを初期角度として展開し、変更された関節だけ保存します。背面は別データを持たずfront軸を鏡像表示するため、正面と背面でポーズが食い違いません。

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

2D自由ポーズ編集と `saved_robots.config.poseState` 保存は実装済みです。以下は今後のPhaseです。

- 自作アイテム編集UI
- custom item テーブル
- ジオラマ編集UI
- diorama テーブル
- 壁画共有テーブル

次のPhaseで、この共通形式を使って順番に実装します。

## 頭部姿勢（Phase 1-2 v3）

ロボット設定には次の頭部姿勢を追加しています。

```ts
headPose: {
  yaw: number       // 左右 ±30°
  pitch: number     // 上下 ±15°
  eyeYaw: number    // 目ねじ左右 ±15°
  eyePitch: number  // 目ねじ上下 ±8°
}
```

2D/3Dで同じ値を使います。旧 `RobotConfig` に `headPose` が無い場合はすべて0°として読み込みます。
