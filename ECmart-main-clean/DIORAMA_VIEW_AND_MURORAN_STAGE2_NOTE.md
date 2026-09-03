# ジオラマ向き切替 + 室工大第2ステージ 変更メモ

## 追加した内容

### 1. ジオラマ配置ロボットの向き切替
- ジオラマに配置したロボットごとに `front / side / back` を保存できるように変更。
- 既存の保存データは未指定時に `front` として読み込みます。
- 編集画面の「選択中」パネルに **正面 / 側面 / 背面** ボタンを追加しました。
- 保存時は向きも一緒に保存され、マイページのプレビューでも再現されます。

### 2. 室工大ジオラマの第2バリエーション追加
- 新ステージ `muroran-it-tech` を追加。
- ラベル: **室蘭工業大学 研究エリア**
- テーマ: **ロボット / 建築 / 化学**
- ガチャ景品ID: `stage-muroran-it-tech`
- 背景には以下のモチーフを入れています。
  - ロボットアーム
  - 建築図面やブロックを想起させる研究棟
  - フラスコや化学アイコン

### 3. 接地面の追加
- `muroran-it-tech` 用に、以下の配置面を定義。
  - 研究広場の地面
  - 研究棟テラス
  - 別棟の屋上

## 主な変更ファイル
- `lib/creation-model.ts`
- `lib/diorama-model.ts`
- `lib/diorama-stages.ts`
- `lib/gacha.ts`
- `components/diorama/diorama-scene.tsx`
- `components/diorama/diorama-workshop.tsx`
- `components/diorama/diorama-stage-preview.tsx`
- `scripts/validate-diorama-view-stage2.mjs`

## 実装上の要点
- 向きはロボット自体の保存済み設定ではなく、**ジオラマ上の配置情報側**に持たせています。
- そのため、同じ保存ロボットを同一ジオラマ内に複数置いて、
  - 1体目は正面
  - 2体目は側面
  - 3体目は背面
  のように使い分けできます。
- アイテムは今回どおり **回転のみ** で、向きプリセットは付けていません。
