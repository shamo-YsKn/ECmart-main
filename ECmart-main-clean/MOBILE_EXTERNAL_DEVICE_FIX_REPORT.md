# スマホ／外部端末 カート・工房修正レポート

## 対象
`ECmart-main-mobile-walk-map-price.zip` を基準に、外部端末で発生していた以下を修正しました。

1. 商品をカゴへ入れるとエラーになる場合がある
2. スマホのAI提案から「工作台へ読み込む」が工作台へ遷移しない
3. 自由ポーズが工房遷移の途中でリセットされたように見える可能性

## 原因と修正

### 1. モバイルカート
スマホ互換UIではPOSTフォームも `mobile-enhance.js` がAjax化していました。カートはCookie更新を伴うため、LAN上のSafari等を含め、重要操作をfetchに依存させない方が堅牢です。

- カート追加／数量変更はネイティブHTML POSTへ変更
- `mobile-enhance.js` でも `/api/mobile/cart` をAjax対象外に設定
- POST後のLocationを相対URLにし、アクセス元IP/ホストをそのまま維持
- 失敗時は `/ ?tab=cart&cartError=1`（実際は空白なし）へ戻し、ユーザー向けエラーを表示

### 2. AI提案 → アイテム工作
`/api/mobile/workbench-draft` はsessionStorageへ工作案を書き込むHTML中継ページを返しますが、Ajax取得では返却HTML内のscriptが実行されませんでした。

- 工作台中継POSTをAjax対象外へ変更
- AI提案フォームへ `data-no-ajax="true"` を追加
- 提案した工作データだけでなく、その候補のRobotConfigも一緒に工作台へ引き継ぐよう変更
- 工作を保存して「ロボットに持たせる」を押すと、元の提案キャラ／色／向き／ポーズを保って工房へ戻る

### 3. 自由ポーズ保持
スマホから自由ポーズ画面へ渡したURLデータより、古いsessionStorageの編集ドラフトを先に読む場合がありました。

- スマホから明示的に渡されたURLのRobotConfigを最優先
- sessionStorageはPC版などURL設定がない場合のフォールバックに変更
- `poseState` はスマホ工房のリンク／フォーム／保存経路で引き続きJSONとして保持
- 通常の「アイテム工作台を開く」でも現在のRobotConfigを工作台へ渡すよう変更
- そのため自由ポーズ作成後に工作へ移り、自作アイテムを装備して戻っても自由ポーズを保持

## 主な変更ファイル
- `components/mobile/mobile-site.tsx`
- `public/mobile-enhance.js`
- `app/api/mobile/cart/route.ts`
- `app/api/mobile/workbench-draft/route.ts`
- `components/workbench/custom-item-workshop.tsx`
- `components/robot/robot-pose-studio.tsx`
- `scripts/validate-mobile-external-fixes.mjs`
- `scripts/validate-mobile-workbench.mjs`
- `package.json`

## 検証結果
- 今回専用: 11/11 PASS
- スマホ工作: 11/11 PASS
- スマホまち歩き＋価格: 8/8 PASS
- 自由ポーズ最終仕様: PASS
- 自由ポーズruntime: PASS
- AI提案: 25 checks PASS
- 自作アイテム提案: 14 checks PASS
- 外部AI: 10 checks PASS
- 価格: 12 checks PASS
- 価格校正: 8代表例 PASS
- ゲスト: 29/29 PASS
- TS/TSX構文: 95ファイル / エラー0

## 未実施
依存パッケージ一式がこの検証環境に展開されていないため、プロジェクト全体の `npm run typecheck` / `npm run build` は未実施です。今回変更したTS/TSXはTypeScriptのtranspile構文検査で確認しています。
