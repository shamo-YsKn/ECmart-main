# Phase 2-1 Check Report

## 実施した確認

- `lib/custom-item-model.ts` を含む共通データ層の strict TypeScript check: PASS
- Phase 2-1で変更/追加したTS/TSXの構文transpile check: PASS
- `scripts/validate-foundation.mjs`: PASS
- `scripts/validate-phase2-1.mjs`: PASS
- `custom_items` migrationにRLS/own-user条件があることを確認: PASS
- node_modules / .next / .git / .env.local をZIPへ含めないことを確認

## 完全buildについて

この実行環境にはプロジェクト依存パッケージが導入されていないため、`next build` の完全確認は未実施です。
手元では以下を実行してください。

```powershell
npm install
npm run check
npm run build
npm run start:network
```

## Supabase追加作業

`supabase/custom-items-migration.sql` をSQL Editorで1回実行してください。
既存の購入・ガチャ・ロボット保存SQLを再実行する必要はありません。
