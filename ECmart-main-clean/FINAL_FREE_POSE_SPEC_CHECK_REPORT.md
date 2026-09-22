# 自由ポージング最終仕様 固定版チェックレポート

## 基準
この版は、ユーザーが提示した最終方針を自由ポージング仕様として固定します。

- 腕と脚を同じ疑似3D `{x,y,z}` モデルで扱う
- 正面 = `{x,z}`
- 側面 = `{y,z}`
- 正面編集時はY保持、側面編集時はX保持
- Zのみ両ビューで共有
- 腕専用 `armPlanarVector()` / `seededArmSpatial()` / `projectedHorizontalFromSpatial()` は使わない
- 上腕→肘→前腕→手、太もも→膝→すね→足の親子関係を維持
- 一点投影時はドラッグ復帰処理を利用
- pointerdownだけでは関節座標を更新しない

## 正常版との直接比較
`ECmart-main-mobile-ajax-phase5-arm-leg-unified-pose.zip` と以下をバイト単位で比較し、すべて一致しました。

- `components/robot/robot-pose-editor.tsx` : SAME
- `components/robot/robot-pose-studio.tsx` : SAME
- `components/robot/robot-fallback.tsx` : SAME
- `lib/robot-pose-2d.ts` : SAME
- `lib/types.ts` : SAME

## 検証結果
- Foundation: PASS
- Phase 2: PASS
- Phase 2-1: PASS
- Phase 3: PASS
- Phase 4: PASS
- Phase 5: PASS
- Phase 5 refinement: PASS
- Diorama view/stage2: PASS
- Mural view/stage2: PASS
- Mural research panorama: PASS
- Arm/leg unified: PASS
- Final pose spec: PASS
- Pose hotfix: PASS
- Pose sync: PASS
- XZ/YZ sync: PASS

## 今回追加・更新した検証
- `scripts/validate-final-pose-spec.mjs`
  - 腕専用旧ロジックの再混入を禁止
  - XZ/YZ直接投影、X/Y独立、Z共有、一点投影復帰を確認
  - 自由ポーズ主要TS/TSXの構文チェック
  - XZ/YZ投影の数値サニティチェック
- `scripts/validate-mural-view-stage2.mjs`
  - 室工大研究パノラマ再設計後の背景識別方法に更新

## 補足
この作業環境では Next.js / React / Supabase 等の依存パッケージが完全にはインストールされていないため、プロジェクト全体の `tsc --noEmit` 完走は確認対象外です。
