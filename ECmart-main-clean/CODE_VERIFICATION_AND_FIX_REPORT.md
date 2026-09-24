# 左右側面追加 実装・検証レポート（2026-09-24）

対象：フェーズ6版から更新した左右側面対応版。腕動作の再調整は対象外。

- 保存値 `side` を既存の左側面として保持し、`side-right` を追加。
- 工房・自由ポーズ・ジオラマ・壁画・スマホ表示に対応。3Dは共通の向き定義を通じて左右の回転値に対応。
- 右側面は共通YZ投影の反転で表示し、ドラッグ入力は共通座標へ逆変換。
- 腕・脚の手前／奥と持ち物の描画順を反転。保存された関節IDや装備する手は変更しない。
- 公開スナップショットの読み込みも新しい向きを保持。
- 追加SQL `supabase/robot-side-views-migration.sql` は壁画の向き制約だけを拡張し、公開権限や既存行を保持。

検証：新規側面26項目、旧フェーズ6との比較30パターン、DB46項目、既存17個のvalidator、型チェック、本番ビルドを実行。実SVGから生成した4方向の静止画も目視確認。

旧版比較では、正面・従来側面・背面の全関節座標とSVGの描画部品が一致することを確認。腕・脚の共通XYZ計算と既存ポーズを保持している。

ブラウザのドラッグ操作・実Supabaseへの適用・本番デプロイは未実施。導入手順は `SIDE_VIEWS_SETUP.md`。以下はフェーズ6実装時の履歴。

---

# フェーズ6 実装・検証レポート（2026-09-22）

対象: フェーズ5の添付ZIPを基準に更新したフェーズ6版。

## 実装内容

- ジオラマ公開／非公開、作品名・説明文、公開内容の明示更新。
- 公開用スナップショットを制作データから分離。配置ロボットとその持ち物、自作アイテムをサーバーでコピー。
- ギャラリー、作品詳細、新着順／いいね順、作者別一覧、ページ送り。
- 1人1作品1回のいいねと取り消し。重複送信でも件数が増えない方式。
- 壁画レビューの本人編集と削除確認・失敗時表示の改善。
- ジオラマ／壁画への通報、管理者の対応一覧、非表示／解除／対応不要、理由・履歴保存。
- スマホ互換表示でのギャラリー・詳細・作者一覧・いいね・作品通報。
- メニュー項目増加への対応。狭い画面のナビゲーションを横スクロールに変更。

## 検証結果

| 確認 | 結果 | 範囲 |
| --- | --- | --- |
| TypeScript | PASS | 3D関連を含むプロジェクト全体 |
| 既存の17個のvalidator | PASS | 自由ポーズの数値動作を含む |
| Phase 6データベース検証 | 44項目PASS | 独立したPostgreSQLエンジン（PGlite）、実際のmigration SQLとRLSを実行 |
| Next.js本番ビルド | PASS | 全ルートのビルド完走 |
| サイト起動・HTTPスモーク確認 | PASS | PC応答、スマホ一覧・詳細、不正URL、作者の空一覧、いいねの303リダイレクト、Ajax通報、他originからのPOST拒否 |
| ブラウザのクリック操作・見た目のQA | 未完了 | この実行環境で検証用ブラウザが起動できなかったため |
| 実Supabase・公開サイト | 未実施 | 実環境へのSQL適用、管理者登録、デプロイは行っていない |

HTTP確認は、ローカルのテスト用API応答を接続したNext.jsで行いました。実Supabaseとの接続確認とは区別してください。ブラウザ操作が検証済みであるとは扱っていません。

データベース検証には以下を含みます。

- 既定で非公開／他人の制作データのRLS維持。
- 匿名・他人による公開禁止／公開テーブルへの直接改変禁止。
- 関連する持ち物だけを含め、無関係な非公開素材を含めない。
- 下書き・素材編集によって公開スナップショットが変化しない。
- 公開更新時のID維持／非公開時の一覧・詳細・直接参照の遮断。
- いいね・取り消し・重複通報の冪等性。
- 一般ユーザーの通報閲覧・管理者昇格・管理操作を拒否。
- 非表示後に作者が公開更新で解除できない。
- 管理者が解除しても作者の非公開設定を維持。
- 壁画レビューの本人編集、非表示の公開読み取り・集計からの除外。
- 投稿削除に伴う公開作品削除、管理画面での削除済み対象の扱い。
- 所有権違反の素材参照で公開に失敗した際、従前の公開内容を保持。

## 依存関係とその他の修正

元の `react: ^19` は実行時に19.3.0を選び、`@react-three/fiber@9.6.1` のpeer条件 `>=19 <19.3` と衝突しました。ReactとReact DOMを対応範囲内の19.2.8へ固定し、`package-lock.json` を追加しました。強制インストールやpeer依存の無視は使用していません。

検証用に `@electric-sql/pglite` をdevDependenciesへ追加し、`npm run check` にPhase 6のデータベース検証を組み込みました。

スマホの新しいPOST処理ではOriginと実際のHostを確認します。Next.js内部URLがlocalhostへ置き換わるLAN環境でも正しい送信を拒否しないようにし、リダイレクト先は確認済みの同一ホスト内に限定しました。

## 導入に必要な操作

1. 既存プロジェクトとデータベースをバックアップし、現在の `.env.local` を引き継ぐ。
2. Phase 5までのSQLが適用済みのSupabaseで、`supabase/phase6-community-migration.sql` を最後に実行。
3. `PHASE_6_SETUP.md` に従って管理者のユーザーUUIDを登録。
4. `npm ci` → `npm run check` → `npm run build` → `npm run dev`。
5. 実環境で、作者・別ユーザー・未ログインの3パターンを確認してから本番反映。

スマホ互換表示での制作・公開設定、壁画編集・通報、管理画面は今回追加していません。これらはPC版を使用します。季節イベント・コメント・フォロー・通知・3D高度化は対象外です。

下記は受領したフェーズ5版の履歴です。現在の検証状況は上記を参照してください。

---

# フェーズ5 コード確認・バグ修正レポート（受領時の履歴）

対象: `ECmart-main-mobile-ajax-phase5-final-pose-spec-fixed.zip`

## 実施した確認

- `app/`, `components/`, `lib/` 配下の TypeScript / TSX 70ファイルを `transpileModule` で構文確認: **PASS**
- `@/...` のローカル import 参照先確認: **PASS**
- 既存の全バリデーションスクリプトを実行: **全PASS**
- 自由ポーズについて、`lib/robot-pose-2d.ts` を実際にトランスパイルして数値動作を実行する `validate-pose-runtime.mjs` を追加し、以下を確認: **PASS**
  - 脚を奥行き方向へ向けたとき正面投影が一点近くになる
  - 腕を奥行き方向へ向けたとき正面投影が一点近くになる
  - 正面=XZ / 側面=YZ の直交投影
  - 太もも→膝→すね→足の親子リンク
  - 上腕→肘→前腕→手の親子リンク
  - spatial更新時に反対ビューの角度を不用意に書き換えない
- TypeScript 5.7.3で型チェックを実施。手元にあった依存パッケージを利用して、3D依存以外のエラーを確認・修正。
- Next.js buildも実行したが、この検証環境では `registry.npmjs.org` に接続できず、必要なSWC/不足依存の取得段階で停止したため、本番ビルド完走は未確認。

## 修正したバグ

1. `components/robot/robot-pose-editor.tsx`
   - `RobotJointAngles` を使用しているのに型importが欠けており、TypeScriptエラーになる問題を修正。

2. `components/diorama/diorama-workshop.tsx`
   - `useEffect` 内のイベントハンドラで `drag` が `null` の可能性ありと判定される問題を修正。
   - effect開始時の `drag` を `activeDrag` に固定し、ドラッグ中の参照を安定化。

3. `components/robot/robot-pose-studio.tsx`
   - `resetPose()` 内で `config` が `null` の可能性ありと判定される問題を修正。
   - `setConfig(current => ...)` 内で安全に現在値からリセットする形へ変更。

4. `lib/workbench-snap.ts`
   - `translatePartTree()` の `position` が `number[]` と推論され、`Vec3` (`[number, number, number]`) と不一致になる問題を修正。
   - 戻り値型を `CustomItemPartPlacement[]` と明示し、positionを3要素タプルとして保持。

5. `scripts/validate-arm-sync-refinement.mjs`
   - すでに撤去済みの旧腕専用ロジック `seededArmSpatial()` / `armPlanarVector()` を「必須」としていた古い検証条件を修正。
   - 現在の腕・脚統一XYZ仕様を検証する内容へ更新。

6. 一部validatorのTypeScript import
   - 開発環境固有の `/opt/nvm/.../typescript.js` を直接参照していたため、別環境で壊れる問題を修正。
   - `import ts from "typescript"` へ統一。

7. `package.json` の `check`
   - 最近追加したジオラマ向き、まち歩き向き、室工大研究壁画、最終自由ポーズ仕様のvalidatorが総合checkに含まれていなかったため追加。
   - 実動作の自由ポーズ数値検証 `validate:pose-runtime` も追加。

## 自由ポーズへの影響

今回の修正では、正常版として固定している自由ポーズの計算仕様は変更していません。

- 腕・脚共通 `{x,y,z}`
- 正面 = XZ
- 側面 = YZ
- 正面操作時はY保持
- 側面操作時はX保持
- Z共有
- 一点投影時のドラッグ復帰

を維持しています。

## 検証結果

以下はすべてPASSしました。

- Foundation
- Phase 2-1
- Phase 2
- Phase 3
- Phase 4
- Phase 5
- Phase 5 Refinement
- Pose Hotfix
- Pose Sync Fix
- XZ/YZ Sync
- Arm Sync Refinement（現仕様へ更新）
- Arm/Leg Unified
- Diorama View Stage2
- Mural View Stage2
- Mural Research Panorama
- Final Pose Spec
- Pose Runtime

## 未確認事項

完全な `next build` は、この実行環境からnpmレジストリへ接続できずSWC取得に失敗したため完走できていません。
また、この環境に元から存在した依存セットには `@react-three/fiber` / `three` が含まれていなかったため、3D部分を含む完全な依存解決後TypeScriptチェックは未完了です。

ただし、3Dファイル以外で検出されたTypeScriptエラーは今回すべて修正済みで、全TS/TSXの構文チェックと全ローカルimport、既存・追加validatorはPASSしています。
