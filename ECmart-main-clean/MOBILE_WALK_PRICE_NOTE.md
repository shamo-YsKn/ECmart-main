# スマホ版 まち歩き・参考価格表示 更新

## 1. まち歩きのスマホ表示
- PC版と同じ `MURORAN_SPOTS[].mapPosition` を使ったデフォルメ室蘭マップをスマホ版へ追加。
- マップ上のピンをタップしてスポットを切り替え可能。
- 各スポットのユーザー投稿件数をピン／一覧へ表示。
- PC版と同じ `MuralBackground` を利用して、選択したスポットの壁画背景をスマホでも表示。
- 投稿ロボットは保存済み `position_x / position_y / scale / rotation_deg / robot_view` を利用して壁画内へ配置。
- 💬付きの投稿ロボットから、その投稿レビューへページ内移動可能。
- 従来のスポット一覧・室工大ステージ切替・関連商品表示も維持。

## 2. スマホ版ロボット工房の参考価格
- PC版と同じ `estimateRobotReferencePrice()` / `formatReferencePrice()` を使用。
- ロボットプレビュー直下へ「参考価格」を表示。
- 自作アイテム装備時は、本体価格 + 工作加算、Tier、価格スコアを表示。
- 色・通常ポーズ等で独自のスマホ価格補正は加えず、PC版と同一ロジック。

## 3. 追加ファイル
- `components/mobile/mobile-muroran-map.tsx`
- `components/mobile/mobile-mural-stage.tsx`
- `scripts/validate-mobile-mural-price.mjs`

## 4. 主な変更ファイル
- `components/mobile/mobile-site.tsx`
- `lib/mobile-server.ts`

追加DB migration・追加APIキーは不要です。
