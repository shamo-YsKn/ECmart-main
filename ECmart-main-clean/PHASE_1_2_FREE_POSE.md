# Phase 1-2: 2D自由ポージング 実装メモ

今回の実装内容:

- 2Dプレビュー上で肩・ひじ・股関節・ひざをドラッグして調整できる自由ポーズ機能を追加
- 既存の `wave / stand / cheer / point` はプリセットポーズとして維持
- 保存データは既存 `RobotConfig` 互換を保ちながら `poseState` を追加して保持
- 3Dプレビューは当面プリセットポーズ専用とし、自由ポーズ編集中は2D編集へ誘導

## 追加した主なファイル

- `lib/robot-pose-2d.ts`
  - 2D関節角度・プリセット角度・SVG用レイアウト計算
- `components/robot/robot-pose-editor.tsx`
  - 2D自由ポーズ編集UI

## 変更した主なファイル

- `lib/types.ts`
  - `RobotPoseState` と `RobotJointAngles` を追加
- `lib/robot-config.ts`
  - `poseState` の正規化に対応
- `components/robot/robot-fallback.tsx`
  - 関節角度ベースの2D描画へ更新
- `components/robot/robot-workshop.tsx`
  - プリセット / 自由ポーズ切り替えUIを追加
- `lib/creation-model.ts`
  - 将来形式への変換時に `poseState` を引き継ぐよう調整

## 仕様メモ

- 自由ポーズ編集ハンドルは **2D / 正面表示** で有効
- 側面・背面は見た目確認用
- 保存時は `config.pose` に基準プリセット、`config.poseState` にカスタム角度を保存
- 既存データは `poseState` が無くても自動的に `preset` モードとして読める
