# ⑤-6 外部AI（Gemini）接続セットアップ

更新日: 2026-10-01

## 概要

⑤-1〜⑤-5のルールベース提案を残したまま、PC版の「AI接続 ON」で Google Gemini API を使えるようにした。

- 既定モデル: `gemini-3.1-flash-lite`
- APIキー未設定: 自動でルールベースへフォールバック
- API失敗 / タイムアウト / 429: 自動でルールベースへフォールバック
- APIキーはブラウザへ渡さず、Next.jsサーバー側からのみ利用
- AI出力を直接保存せず、JSON Schema + サーバー側の再検証を通してから `RobotConfig` へ変換
- 自作アイテムは既存⑤-5テンプレートに一致した場合だけ `CustomItemDocument` を生成

Google公式の2026-10-01時点の料金表では Gemini 3.1 Flash-Lite に無料枠がある。ただし料金・無料枠・レート制限は将来変更される可能性があるため、公開運用前に公式料金ページを再確認する。

公式:
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/structured-output
- https://ai.google.dev/api

## 1. APIキーを取得

Google AI Studio でGemini APIキーを作成する。

APIキーは `.env.local` にのみ設定し、Gitへコミットしない。

```env
GEMINI_API_KEY=xxxxxxxxxxxxxxxx
```

互換用に `MACHINOWA_GEMINI_API_KEY` でも読めるが、通常は `GEMINI_API_KEY` を推奨。

**`NEXT_PUBLIC_GEMINI_API_KEY` のように `NEXT_PUBLIC_` を付けないこと。**
付けるとブラウザへ公開される可能性がある。

## 2. モデル変更（任意）

既定値:

```env
MACHINOWA_GEMINI_MODEL=gemini-3.1-flash-lite
```

未指定でもこのモデルを使う。
モデルを変える場合は、構造化出力に対応しているGeminiモデルを指定する。

## 3. 無料枠保護用レート制限（任意）

既定は1端末（IP目安）あたり10回/分。

```env
MACHINOWA_AI_RATE_LIMIT_PER_MINUTE=10
```

1〜60回/分へ変更可能。
この制限はアプリ側の簡易防御であり、複数サーバーインスタンス全体を厳密に共有する分散レート制限ではない。
本格公開時はVercel/Cloudflare等のレート制限も併用すると安全。

## 4. UI動作

PC版ボルタ工房の「AI接続」ボタン:

### OFF

- 外部通信なし
- ⑤-1〜⑤-5のルールベースのみ
- APIキー不要
- API利用料金なし

### ON

1. `/api/idea-assistant` に同一オリジンPOST
2. Next.jsサーバーがGemini APIへ問い合わせ
3. GeminiはJSON Schemaに沿って3候補を返す
4. サーバー側で再度、タイプ・ポーズ・向き・色・持ち物を検証
5. 許可された `RobotConfig` に正規化
6. `customItemHint` が⑤-5テンプレートに一致した場合だけ工作案を生成
7. 価格モデルで参考価格を算出

Geminiが失敗した場合も画面操作は止めず、ルールベース3候補を返す。

## 5. 外部へ送る情報

Geminiへ送るのは以下のみ。

- ユーザーが提案欄へ入力した文章（最大240文字）
- 現在のタイプ / ポーズ / 持ち物 / 向き / サイズ / 色
- 現在利用可能なbuilt-in持ち物一覧
- 現在利用可能な色一覧

以下はGeminiへ送らない。

- SupabaseユーザーID
- メールアドレス
- 配送先
- 購入履歴
- ポイント残高
- 保存済み作品一覧
- APIキー

ただし、ユーザーが自分で入力欄に個人情報を書いた場合、その文章自体はAI接続ON時にGeminiへ送信される。

## 6. 無料枠のプライバシー注意

2026-10-01時点のGoogle公式料金ページでは、Gemini Developer APIの無料枠について「Used to improve our products: Yes」と記載されている。
そのためUIにも、無料枠では送信内容がGoogleの製品改善に利用される場合がある旨を表示する。

機密情報や個人情報を入力させない運用を推奨する。
より強いデータ保護要件が必要な本番運用では、有料枠や別の契約形態を含めて再検討する。

## 7. フォールバック

次の場合はすべてルールベースへ戻る。

- APIキーなし
- Gemini APIの通信失敗
- 9秒タイムアウト
- 429 / 無料枠・レート上限
- JSONが壊れている
- 3候補でない
- enum外の値を含む
- サイト形式へ安全に変換できない
- アプリ側の10回/分レート制限に到達

## 8. セキュリティ

- APIキーは `x-goog-api-key` ヘッダーでサーバーから送信
- URLクエリへAPIキーを入れない
- ブラウザからGoogle APIを直接呼ばない
- APIルートはsame-originチェック
- 入力最大240文字
- 色 / item / pose / view / base は許可値へ制限
- 外部AIが未解放built-in itemや色を返しても採用しない
- 外部AIが任意JavaScriptやURLを返しても実行しない

## 9. スマホ互換版

現行スマホ互換表示は⑤-1〜⑤-5のルールベースを継続する。
外部AI ON/OFFはPC版から利用する。
スマホ側へ外部AIを広げる場合も同じ `/api/idea-assistant` を利用できる。

## 10. 追加SQL

不要。
