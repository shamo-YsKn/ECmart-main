# Foundation Check Report

実施日: 2026-08-17

## 実施済み

- `node scripts/validate-foundation.mjs` : PASS
- `node --check next.config.mjs` : PASS
- 新規基盤型 (`types.ts`, `robot-config.ts`, `robot-customization.ts`, `creation-model.ts`) の strict TypeScript check : PASS
- `tsc --noEmit --noCheck` によるプロジェクト全体の構文解析 : PASS
- `normalizeRobotConfig()` / `parseSavedRobotRow()` の簡易ランタイムテスト : PASS
- ガチャ基準SQLに `on conflict on constraint user_gacha_inventory_pkey` が含まれることを確認
- staleな固定LAN IPを `next.config.mjs` から除去
- `.env.local`, `node_modules`, `.next`, `tsconfig.tsbuildinfo` を配布ZIPへ含めない方針を確認

## この環境で未完了

`npm install --no-audit --no-fund` は実行環境の通信待ちでタイムアウトしました。
そのため依存パッケージを展開した状態での以下は、この環境では未実行です。

```text
npm run typecheck
npm run build
```

手元のWindows環境では、ZIP展開後に次を実行してください。

```powershell
npm install
npm run check
npm run build
npm run start:network
```

## Supabase

今回の「安定化 + 共通データ設計」ではDBスキーマを変更していません。
既に購入・ポイント・ガチャ・ロボット保存用SQLを適用済みなら、新しいSQL実行は不要です。
