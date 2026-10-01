# ⑤-1〜⑤-4 イメージ提案機能 実装・検証レポート（2026-10-01）

対象: 価格算出校正版を基準に更新。

## 実装内容

- 外部APIを使わない `lib/robot-idea-engine.ts` を追加。
- 文章から約25テーマを判定し、3つの `RobotIdeaCandidate` を生成。
- ボルタ／ナッティ、向き、プリセットポーズ、既存持ち物、一部カラーの明示指定を優先。
- ガチャ未解放の色・持ち物は現在利用可能な構成へフォールバック。
- PC工房に文章入力、例文、3候補カード、「この案で作る」を追加。
- スマホ互換工房にもGETベースの文章提案と候補反映を追加。
- 候補価格は校正済み `price-estimator` を再利用。別の価格式は作っていない。
- PC版にAI接続ON/OFF設定を追加。現在は接続先未設定のためONでもルールへフォールバック。
- ルールエンジンに `fetch()` / 外部API URLはなく、現時点でAPI料金は発生しない。
- 追加SQL・APIキー不要。

## 検証結果

- `validate:idea-assistant`: **25項目 PASS**
- `lib/robot-idea-engine.ts` と依存する純粋ロジックをstrict TypeScriptで単独確認: **PASS**
- app/components/lib のTS/TSX: **85ファイル構文確認 PASS**
- ローカルimport参照: **PASS**
- 価格算出: **12/12 PASS**
- 価格校正: **8/8 PASS**
- ゲスト機能: **29/29 PASS**
- アイテム3方向: **11/11 PASS**
- 自由ポーズ実動作: **PASS**（検証用にTypeScriptのみ一時参照）

## 未確認

この環境では `npm install` が途中でタイムアウト／npm側エラーとなり依存一式を揃えられなかったため、今回変更後のプロジェクト全体 `npm run typecheck` / `npm run build` は未完了。`tsc`を部分依存状態で実行した際のエラーはReact/Node/Three等の型定義不足で、今回の提案ロジック由来の型エラーを示すものではない。

ブラウザ実操作、実Supabase、本番デプロイは未実施。

## 今後

- ⑤-5: 自作アイテム工作データの提案生成
- ⑤-6: 外部AIアダプタ実装

詳細: `ROBOT_IDEA_ASSISTANT_SETUP.md`

---

# 参考価格スコア式 作例校正・検証追記（2026-10-01）

## 実装内容

- 価格モデルを `official-anchor-2026-10-v2-calibrated` へ更新。
- 本体基準はボルタ1,150円、ナッティ1,250円。ポーズ・色・標準持ち物は通常価格内として加算しない。
- 自作アイテムは部品数、接続数、特殊部品、部品種類、奥行き、最大拡大率、面・立体の広がりを0〜100点へスコア化。
- 0〜17点=通常、18〜44点=詳細小物(+750円)、45点以上=高複雑度(+1,050円)。
- 最長一辺 `sizeRatio` と、2番目に大きい軸比 `spreadRatio` を分離。長いだけの単純形状を大型と誤判定しにくくした。
- 大型判定はサイズ単独ではなく、部品数・spreadRatio・サイズ以外の構造スコアを組み合わせる。大型は+2,250円。
- 代表8作例でv1を校正し、クラリネット風／バイク風／長い単純構造の誤判定を修正。
- ガチャ限定色／素材、ブランド・イベント価値は構造難度と分離し、スコアへ含めない。
- 工作台UIに最大外形比と2軸広がり比を併記。
- Supabase schema変更はなし。

## 検証

- `scripts/validate-price-estimator.mjs`: **12/12 PASS**
  - 公式基準価格
  - 通常／詳細／高複雑度／大型の代表ケース
  - 色違いvariantだけでは価格を上げないこと
  - ボルタ／ナッティの本体価格との合成
  - 空アイテムの加算0円
  - 工作台／ロボット工房のUI接続
- `scripts/validate-price-calibration.mjs`: **8/8 PASS**
  - 超シンプル小物 → 通常
  - 簡単な釣竿 → 通常
  - フライパン風 → 通常
  - 楽器（クラリネット風） → 詳細小物
  - やきとり風 → 高複雑度
  - 複雑な機械風 → 高複雑度
  - バイク風 → 大型・機械構造
  - 大きいけど単純 → 通常
- `lib/price-estimator.ts` とローカル依存を strict TypeScript で単独型検証: **PASS**
- `app/`, `components/`, `lib/` のTS/TSX **83ファイル**を `transpileModule` で構文確認: **PASS**
- 同83ファイルのローカルimport参照確認: **PASS**
- アイテム3方向検証: **11/11 PASS**
- ゲスト機能検証: **29/29 PASS**
- 自由ポーズ実動作: **PASS**

## 今回の未確認事項

依存パッケージの再取得がこの実行環境でタイムアウトし、`next` / `react` まで完全に復元できなかったため、今回の変更後の `npm run typecheck` と `npm run build` は完走できていません。構文・ローカルimportと、価格／アイテム／ゲスト／自由ポーズの専用検証は上記の通りPASSしています。

詳細な式と調整箇所は `PRICE_ESTIMATOR_SETUP.md` を参照してください。

---

# ゲスト利用 実装・検証レポート（2026-09-30）

対象：アイテム工作3方向対応版を基準に、ロードマップ④「ゲストアカウント / ゲスト利用」を追加した版。

## 実装内容

- Supabase匿名ユーザーを作らず、未ログインの一時ワークスペースとしてゲストモードを追加。
- PC React版でゲストロボット / ゲストジオラマを `sessionStorage` に一時保存。
- 一時作品へ安定したUUIDを割り当て、ログイン後に同じIDのまま `saved_robots` / `dioramas` へ引き継ぐ。
- ジオラマではゲストロボットを一時 `SavedRobot` として扱い、未ログインでも配置可能。
- マイページにゲスト作品の引き継ぎ / 破棄UIを追加。
- PC / スマホ互換版にゲスト購入を追加。
- 配送先は購入確認時にのみ受け取り、このアプリではDB・Cookie・Web Storageへ永続保存しない。成功レスポンスにも配送先を含めない。
- ゲスト購入はサーバー側で商品・送料を再計算し、ポイントは0。会員用購入RPC / 注文DBから分離。
- お気に入り・ガチャ・作品公開など所有権を必要とする機能はログイン必須を維持。
- 追加SQLなし。

## 検証結果

- `app/` / `components/` / `lib/` のTS/TSX 82ファイルをTypeScript `transpileModule` で構文確認：PASS。
- 同82ファイルの `@/...` / 相対ローカルimport参照確認：PASS。
- `validate-guest-account.mjs`：29項目 PASS。
  - sessionStorage限定のゲスト作品
  - stable UUID / ログイン後import
  - ゲストロボットを使うジオラマ
  - ゲスト購入のサーバー側再計算
  - Supabase購入処理 / orders書き込みからの分離
  - 配送先を成功レスポンスへ含めない
  - ポイント0
  - PC / スマホ購入導線
- `validate-pose-runtime.mjs`：PASS（既存の自由ポーズ数値仕様を回帰確認）。
- `validate-custom-item-views.mjs`：11項目 PASS（直前のアイテム3方向対応を回帰確認）。

## 制約 / 未確認事項

- スマホ互換モードは既存仕様どおり自由配置ジオラマ編集がPC限定。ゲストジオラマ編集もPC React版が対象。
- ゲストワークスペースは `sessionStorage` のため、同じタブの再読み込みには耐えるが、タブを閉じると原則消える。
- 現在のECはデモ用途。ゲスト購入はDBへ実注文を作らない。実配送 / 実決済を行う場合は配送先保持方針を別途設計する。
- この作業環境では `npm ci` が完走せず、`next` / `react` / `@types` などの依存が揃わなかったため、今回の変更後のプロジェクト全体 `npm run typecheck` / `npm run build` は未完了。配布元の直前版では左右側面版の本番ビルドがPASSしており、今回の変更は全TS/TSX構文・import参照・専用validator・主要回帰validatorで確認した。

導入・仕様詳細は `GUEST_ACCOUNT_SETUP.md` を参照。

---

# アイテム工作3方向対応 実装・検証レポート（2026-09-24）

対象：左右側面対応版を基準に、ロードマップ③「アイテム工作の正面・側面・背面」を追加した版。

## 実装内容

- `CustomItemDocument` を `item-workbench-v2` へ拡張。X=左右 / Y=上下 / Z=奥行きとして単一の3D位置を保持。
- 工作台に正面 / 側面 / 背面を追加。正面=XY、側面=ZY、背面=-XYを編集。
- 旧 `item-workbench-v1` は座標値を変えずv2へ正規化し、従来の正面作品を維持。
- 11種類の工作パーツに側面シルエットと基準奥行き `depth` を追加。背面は実物の後ろ側として左右反転。
- 回転は3軸を保持し、正面/背面はZ軸、側面はX軸を編集。
- socket接続を3D座標化。スナップ・親子追従・回転/拡大縮小後の再配置をX/Y/Zで計算。
- 正面/背面と左右側面で、奥行きに応じた描画順を使用。右側面では自作アイテム内部の前後関係も反転。
- ロボット装備中の自作アイテムを、ロボットの正面 / 側面 / 背面表示へ追従。
- `npm run check` に `validate:item-views` を追加。

## 検証結果

- TS/TSX 80ファイルのTypeScript `transpileModule` 構文確認：PASS。
- `@/...` と相対ローカルimportの参照先確認：PASS。
- 新規の純粋ロジック（creation model / item view / normalization / 3D socket）：strict TypeScript確認 PASS。
- `validate-custom-item-views.mjs`：17項目 PASS。
  - v1→v2の正面互換。
  - 正面/側面/背面の直交投影。
  - ビュー編集時に隠れ軸を保持。
  - 正面/背面Z軸回転・側面X軸回転。
  - 前後の描画順と反対側側面での反転。
  - 3D socketの一致と側面スナップ候補。
  - 工作台UI・プレビュー・ロボット装備側の方向連携。
  - 旧左右側面版との正面SVG分岐比較（ナット、ワッシャー、ボルト、金属棒、針金、ばね）一致。
- `docs/item-views-preview.png` を生成し、ボルト・ナット・ばね・LEDを正面/側面/背面で目視確認。側面は専用形状、背面は正面の後ろ側として反転。

## 今回未完了の確認

この実行環境では `registry.npmjs.org` のDNS解決ができず、展開した配布ZIPには `node_modules` を含めていないため、今回の変更後にプロジェクト全体の `npm run typecheck` と `npm run build` を再実行できていません。直前の左右側面版では型チェック・既存validator・本番ビルドがPASSしています。

今回変更した非UIロジックはstrict TypeScript、UIを含む全TS/TSXは構文確認、追加17テストで確認しています。依存取得可能な環境では `npm ci` → `npm run check` → `npm run build` を実行してください。

追加SQLはありません。導入・座標仕様は `ITEM_VIEWS_SETUP.md` を参照してください。

---

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

## 2026-10-01 ⑤-5 自作アイテム文章提案・工作台連携

### 追加内容

- `lib/custom-item-idea-engine.ts` を追加。
- 外部APIを使わず、文章と⑤のテーマhintから既存工作パーツだけで `CustomItemDocument` を生成。
- 17種類の工作テンプレートを追加（釣竿、ギター、クラリネット、やきとり串、バイク、カメラ、本、杖、スキー、筆、トレー、望遠鏡、刀、槍、フライパン、プレゼント箱、スポーツ用具）。
- RobotIdea候補へ `customItemProposal` を接続。
- PC候補カードへ「工作台へ読み込む」を追加し、`sessionStorage` 経由で既存工作台へ受け渡し。
- 元の候補 `RobotConfig` も同時退避し、工作後に工房へ戻った際に復元できるようにした。
- 工作案生成直後から既存価格モデルでTier・工作加算・装備時参考価格を表示。
- スマホ互換版では工作案と価格を表示するが、自由配置工作台は既存仕様どおりPC限定と明示。
- 追加SQL・APIキー・外部通信なし。

### 安全なフォールバック

- 未知の物体名は `null` とし、存在しない工作部品を捏造しない。
- ガチャ限定variantは自動生成に使用しない。
- `robot-idea-engine` / `custom-item-idea-engine` に `fetch()`・外部API URLなし。

### 検証

- ⑤-5専用 `validate:item-idea-assistant`: **14/14 PASS**
- 既存 `validate:idea-assistant`: **25項目 PASS**
- 価格基本: **12/12 PASS**
- 価格校正: **8/8 PASS**
- アイテム3方向: **11/11 PASS**
- ゲスト: **29/29 PASS**
- 価格・提案・工作ロジックをまとめた strict TypeScriptチェック: **PASS**

### 代表生成のTier

- 釣竿: standard
- ギター: detailed
- クラリネット: detailed
- やきとり串: complex
- バイク: large
- カメラ / 望遠鏡 / フライパン: standard

### 未確認

この配布ZIPは `node_modules` を含めないため、依存パッケージを完全取得した状態での `next build` は今回未確認。npmレジストリへの接続は検証環境で `EAI_AGAIN` となった。

### 追加の全体構文確認

- `app/`, `components/`, `lib/` の TypeScript / TSX **86ファイル**を `transpileModule` で構文確認: **PASS**
- `@/...` および相対importのローカル参照先確認: **PASS**


## 2026-10-01 ⑤-6 外部AI（Gemini）アダプタ

### 実装内容

- PC版「AI接続 ON」で `/api/idea-assistant` を呼ぶ実装を追加。
- 既定モデルを `gemini-3.1-flash-lite` とした。
- Gemini APIキーは `GEMINI_API_KEY` / `MACHINOWA_GEMINI_API_KEY` のサーバー環境変数のみから読む。
- ブラウザからGoogle APIを直接呼ばず、APIキーを `NEXT_PUBLIC_` へ出さない。
- Geminiへは入力文（最大240文字）と現在利用可能な部品・色・基本設定だけを送信。
- JSON Schemaでちょうど3候補を要求し、返答をさらにアプリ側でruntime検証。
- base / pose / item / view / color は許可値へ再正規化し、未解放item・色を拒否。
- customItemHintは⑤-5の既存工作テンプレートに一致した場合だけ工作データへ変換。
- AI出力を直接DB保存・コード実行しない。
- APIキーなし、通信失敗、9秒タイムアウト、HTTP 429、JSON形式不正時はルールベースへフォールバック。
- same-originチェックと簡易IPレート制限（既定10回/分）を追加。
- UIに無料枠の外部送信・製品改善利用に関する注意を追加。
- スマホ互換版は従来どおりルールベースのみ。
- DB / Supabase追加SQLなし。

### 検証

- `validate:external-ai`: **10/10 PASS**
  - 構造化JSONの正常パース
  - 3候補の安全な変換
  - enum外値の拒否
  - 未解放色 / item の除外
  - same-origin / rate limit / context sanitize の存在
  - APIキーをURLやNEXT_PUBLICへ出さない
  - APIキー未設定時のルールフォールバック
  - Gemini成功応答をモックした外部AI経路
- `validate:idea-assistant`: **25項目 PASS**
- `validate:item-idea-assistant`: **14項目 PASS**
- `validate:price-estimator`: **12項目 PASS**
- `validate:price-calibration`: **8作例 PASS**

### 全体型チェック / build

配布ZIPは `node_modules` を含まない。今回も依存パッケージ再取得が検証環境でタイムアウトし、`npm run typecheck` / `next build` の完全実行は未完了。変更部分はtranspile構文確認・ローカルimport確認・専用validatorで検証する。

### ⑤-6 最終回帰確認（2026-10-01）

- `validate:external-ai`: **10/10 PASS**
- `validate:idea-assistant`: **25項目 PASS**
- `validate:item-idea-assistant`: **14項目 PASS**
- `validate:price-estimator`: **12項目 PASS**
- `validate:price-calibration`: **8/8作例 PASS**
- `validate:item-views`: **11項目 PASS**
- `validate:guest`: **29/29 PASS**
- `validate:pose-runtime`: **PASS**
- `app/`, `components/`, `lib/` のTS/TSX **89ファイル**を `transpileModule` で構文確認: **PASS**
- `@/...` / 相対import のローカル参照: **PASS**

`npm install` は検証環境でタイムアウトし、完全依存を再構築できなかったため、`npm run typecheck` / `next build` は未完了。途中生成された不完全な `node_modules` は配布ZIPへ含めない。
