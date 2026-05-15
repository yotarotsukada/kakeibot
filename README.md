# kakeibot

LINE メッセージから支出を自動記録する家計簿ボット。Cloudflare Workers 上で動作します。

## 前提条件

- **Node.js** v22+
- **pnpm** v9+
- **Cloudflare アカウント**（デプロイ時）

## セットアップ

```bash
# 依存インストール
pnpm install

# 環境変数ファイルの作成
cp .dev.vars.example .dev.vars
```

`.dev.vars.example` はデフォルトで全モックが有効になっており、外部 API の認証情報なしでローカル開発を始められます。

## ローカル開発

### 開発サーバー起動

```bash
pnpm dev
```

`http://localhost:5173` で起動します。Cloudflare の `workerd` ランタイム上で実行されるため、本番と同じ環境で開発できます。

### モックの 3 軸切り替え

ローカル開発では、外部依存（LINE / Gemini / Google Sheets / LINE Login）をそれぞれ独立にモック化できます。`.dev.vars` のフラグで制御します。

| フラグ | `true` のとき | `false` のとき |
|--------|--------------|--------------|
| `USE_MOCK_LINE` | MockLineClient（返信はコンソール出力、画像取得はプレースホルダ） | 本物の LINE Messaging API を呼ぶ |
| `USE_MOCK_AI` | MockReceiptParser（キーワード一致で固定値を返す） | 本物の Gemini API を呼ぶ |
| `USE_MOCK_STORAGE` | MockStorage（プロセス内メモリ。再起動で消える） | 本物の Google Sheets を読み書きする |
| `USE_MOCK_AUTH` | LINE Login をスキップし `U_MOCK_USER_A` として認証済み扱い | 本物の LINE Login OAuth を実行 |

組み合わせ例：

- **すべて `true`（既定）** — 認証情報ゼロでフル機能を試せる。AI / Storage / LINE への通信は一切発生しない。
- **`USE_MOCK_AI=false` のみ** — Gemini の解析精度を実環境で確認したいとき。`GEMINI_API_KEY` を設定すること。
- **`USE_MOCK_STORAGE=false` のみ** — 開発用スプレッドシートに書き込んで挙動を確認したいとき。`GOOGLE_*` と `SPREADSHEET_ID` を設定すること。

`MockStorage` は Vite プロセス内でシングルトンとして生存するため、開発サーバーを再起動するまでデータは保持されます（`app/infra/factory.ts`）。

### モック Webhook の送信

開発サーバーが起動した状態で、別のターミナルから実行します。

```bash
# テキストメッセージ（デフォルト: 「スーパーで買い物 2500円」）
./scripts/mock-webhook.sh text

# カスタムテキスト
./scripts/mock-webhook.sh text "ランチ 1500円"

# 画像メッセージ（プレースホルダー画像が使われます）
./scripts/mock-webhook.sh image

# 実画像を使ってメッセージを送信（モック環境のまま本物の画像データを後続処理に流せる）
# 推奨配置場所: scripts/mock-images/ 配下
./scripts/mock-webhook.sh image ./scripts/mock-images/sample-receipt.jpg
```

スクリプトは `.dev.vars.example` と同じ `test-channel-secret` で HMAC 署名を計算するため、署名検証を通過します。処理結果は開発サーバーのコンソールログで確認できます。

### テスト / 型 / Lint の実行

```bash
# Vitest（Unit / Component テスト）
pnpm test
pnpm test:watch
pnpm test:coverage

# TypeScript 型チェック
pnpm typecheck

# Biome（lint + format、--write 付き）
pnpm check
```

## 環境変数

| 変数名 | 説明 | モック時 |
|--------|------|---------|
| `LINE_CHANNEL_SECRET` | LINE Messaging API チャネルシークレット | `test-channel-secret` |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API アクセストークン | 任意の文字列 |
| `LINE_LOGIN_CHANNEL_ID` | LINE Login チャネル ID | 不要 |
| `LINE_LOGIN_CHANNEL_SECRET` | LINE Login チャネルシークレット | 不要 |
| `LINE_LOGIN_CALLBACK_URL` | LINE Login コールバック URL | 不要 |
| `JWT_SECRET` | セッション JWT 署名鍵 | 任意の文字列 |
| `GEMINI_API_KEY` | Google Gemini API キー | 不要 |
| `GEMINI_MODEL` | Gemini のモデル名（省略時は `gemini-2.5-flash-lite`） | 不要 |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service Account メールアドレス | 不要 |
| `GOOGLE_PRIVATE_KEY` | Service Account 秘密鍵（PEM） | 不要 |
| `SPREADSHEET_ID` | Google Spreadsheet ID | 不要 |
| `USE_MOCK_LINE` | `true` → MockLineClient | `true` |
| `USE_MOCK_AI` | `true` → MockReceiptParser | `true` |
| `USE_MOCK_STORAGE` | `true` → MockStorage | `true` |
| `USE_MOCK_AUTH` | `true` → LINE Login をスキップ | `true` |

## デプロイ

```bash
# ビルド + Cloudflare Workers にデプロイ
pnpm deploy
```

### 本番用シークレットの設定

```bash
wrangler secret put LINE_CHANNEL_SECRET
wrangler secret put LINE_CHANNEL_ACCESS_TOKEN
wrangler secret put LINE_LOGIN_CHANNEL_ID
wrangler secret put LINE_LOGIN_CHANNEL_SECRET
wrangler secret put JWT_SECRET
wrangler secret put GEMINI_API_KEY
wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
wrangler secret put GOOGLE_PRIVATE_KEY
wrangler secret put SPREADSHEET_ID
```

本番環境では `USE_MOCK_*` を設定しない（未設定 = `"true"` 以外 = 本番モード）。

### LINE Webhook URL の設定

[LINE Developers Console](https://developers.line.biz/) → チャネル設定 → Messaging API → Webhook URL に以下を設定:

```
https://kakeibot.<your-subdomain>.workers.dev/webhook
```

### Google Sheets の準備

1. GCP で Service Account を作成し、JSON キーをダウンロード
2. スプレッドシートを作成し、Service Account のメールアドレスに編集権限を付与
3. 「元帳」「ユーザーマスタ」シートを手動で作成
4. ユーザーマスタに LINE ユーザー ID とアクター名を登録

## ディレクトリ構成

```
app/
├── domain/          型定義 + インターフェース（外部依存禁止）
│   ├── errors.ts        AppError 階層（LineApiError, GeminiApiError 等）
│   ├── result.ts        Result 型（features 層の返却型）
│   ├── ledger/          元帳ドメイン（LedgerEntry, ParsedEntry, ReceiptParser IF）
│   ├── line/            LINE ドメイン（LineClient IF, ExtractedMessage 等）
│   ├── budget/          予算ドメイン
│   └── storage/         Storage IF, SHEET_NAMES
├── infra/           技術軸の具象実装（mock は各技術ディレクトリ内に配置）
│   ├── line/            GoogleLineClient, MockLineClient, 署名検証
│   ├── gemini/          GeminiReceiptParser, MockReceiptParser
│   ├── google/          GoogleSheetsStorage, MockStorage
│   └── factory.ts       3 軸モック切り替えのコンポジションルート
├── features/        ドメイン軸のユースケース（Result 型を返す）
│   ├── ledger/          元帳登録ユースケース
│   └── budget/          ダッシュボード / 予算管理
├── components/      UI コンポーネント
└── routes/          ルーティング + Composition Root（DI）
```

## ドキュメントとエージェントへの指示

- 仕様・設計判断・C4 図は `docs/` 配下を参照（[docs/README.md](docs/README.md) が索引）。
- エージェント（Claude Code 等）への指示は `CLAUDE.md` と `.claude/skills/` 配下にあります。
