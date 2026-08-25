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
  poseState?,
  headPose?,
  heldItem?
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

`attachedTo` はPhase 2-2で実装済みです。

```ts
attachedTo?: {
  instanceId: string
  socketId: string
  ownSocketId: string
}
```

自分側socketと接続先socketを記録し、親移動・回転・拡大縮小後も接続位置を再計算します。

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

## 現段階の実装状況

2D自由ポーズ、2D自作アイテム編集、スナップ接続、自作アイテムのロボット装備まで実装済みです。

`CustomItemDocument.parts[]` の配列順を2D重なり順として使い、各パーツの `SceneTransform` に位置・Z回転・均一スケールを保存します。接続関係は `attachedTo` へ保存します。

ロボットの装備参照は `RobotConfig.heldItem` で保持します。

```ts
heldItem:
  | { kind: "builtin", item: RobotItem }
  | {
      kind: "custom",
      customItemId: string,
      adjustment: { offsetX, offsetY, rotationDeg, scale }
    }
```

旧保存データに `heldItem` が無い場合は従来の `item` をbuiltin装備として自動補完します。

Phase 3の特殊工作素材・背景と、Phase 4のジオラマ編集UI / `dioramas` テーブルまで実装済みです。

今後は、公開作品用のスナップショット、壁画共有テーブル、3D変換を追加します。

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

## Phase 3: ガチャ限定工作素材とジオラマ背景

`CustomItemPartPlacement.variantId` を、基本パーツの特殊見た目を表す安定IDとして使用します。

- `partType`: 接続socketや基本形状を決める
- `variantId`: ガチャで解放される材質・発光色などを決める

例: `partType: "hex_nut"` + `variantId: "gold-nut"`。

ジオラマ背景は `DioramaStageReference` の `reward` 参照へつなげられるよう、`lib/diorama-stages.ts` で `stageId` と `rewardId` を対応付けます。Phase 3では所持判定まで、Phase 4で `DioramaDocument.stage` に実際の選択結果を保存します。


## Phase 4: DioramaDocument の実運用

ジオラマエディタは `coordinateSpace: "diorama-stage-v1"` の640×360相当ローカル座標を使用します。ブラウザの実pxは保存しません。

```ts
DioramaDocument {
  stage,
  robots: [{ placementId, savedRobotId, transform }],
  items: [{ placementId, customItemId, transform }]
}
```

- `placementId`: ジオラマ内の個体。ひとつのsavedRobotを複数回置くために必要
- `savedRobotId`: アカウントに保存したロボットへの参照
- `customItemId`: アカウントに保存した工作作品への参照
- `position[0/1]`: ステージ中心を原点とするX/Y
- `position[2]`: 2Dの重なり順
- `rotationDeg[2]`: 2D回転
- `scale`: 均一スケール

保存時には、選択背景がガチャで獲得済みか、参照ロボット/アイテムが本人のアカウントに存在するかをクライアント保存層で再検証します。
