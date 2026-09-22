# 自由ポージング 最終仕様固定メモ

この版では、自由ポージングの挙動を次の仕様として固定しています。

- 腕と脚は同じ疑似3D `{x, y, z}` モデルで更新する。
- 正面表示は `{x, z}`、側面表示は `{y, z}` を直接投影する。
- 正面操作では X と Z を更新し、Y は保持する。
- 側面操作では Y と Z を更新し、X は保持する。
- 上腕→肘→前腕→手、太もも→膝→すね→足の親子関係を維持する。
- 腕専用 `armPlanarVector()` / `seededArmSpatial()` / `projectedHorizontalFromSpatial()` は使用しない。
- 投影長がほぼ0になった場合のみ、操作用の既定部材長を使ってドラッグ復帰できるようにする。
- pointerdown の瞬間には座標を更新せず、pointermove から更新する。

## 今回の扱い
直近の `mural-research-panorama` 版を `arm-leg-unified-pose` 版と比較したところ、自由ポージング主要ファイルは完全一致していました。
そのため、正常な挙動を壊すロジック変更は行わず、最終仕様を検証する `scripts/validate-final-pose-spec.mjs` を追加しています。
