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

## 開発

### 開発サーバー起動

```bash
pnpm dev
```

`http://localhost:5173` で起動します。Cloudflare の `workerd` ランタイム上で実行されるため、本番と同じ環境で開発できます。

### モック Webhook の送信

開発サーバーが起動した状態で、別のターミナルから実行します。

```bash
# テキストメッセージ（デフォルト: 「スーパーで買い物 2500円」）
./scripts/mock-webhook.sh text

# カスタムテキスト
./scripts/mock-webhook.sh text "ランチ 1500円"

# 画像メッセージ（プレースホルダー画像が使われます）
./scripts/mock-webhook.sh image

# 実画像を使ってメッセージを送信（デモ用、実在のレシート画像パスを指定）
# 推奨配置場所: scripts/mock-images/ 配下に画像を置くと管理しやすいです
./scripts/mock-webhook.sh image ./scripts/mock-images/sample-receipt.jpg
```

スクリプトは `.dev.vars.example` と同じ `test-channel-secret` で HMAC 署名を計算するため、署名検証を通過します。処理結果は開発サーバーのコンソールログで確認できます。

### コード品質チェック

```bash
# Biome（lint + format）
pnpm check

# TypeScript 型チェック
pnpm typecheck
```

## 環境変数

| 変数名 | 説明 | モック時 |
|--------|------|---------|
| `LINE_CHANNEL_SECRET` | LINE Messaging API チャネルシークレット | `test-channel-secret` |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API アクセストークン | 任意の文字列 |
| `GEMINI_API_KEY` | Google Gemini API キー | 不要 |
| `GEMINI_MODEL` | Gemini のモデル名（省略時は `gemini-2.5-flash-lite`） | 不要 |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service Account メールアドレス | 不要 |
| `GOOGLE_PRIVATE_KEY` | Service Account 秘密鍵（PEM） | 不要 |
| `SPREADSHEET_ID` | Google Spreadsheet ID | 不要 |
| `USE_MOCK_LINE` | `true` → MockLineClient | `true` |
| `USE_MOCK_AI` | `true` → MockReceiptParser | `true` |
| `USE_MOCK_STORAGE` | `true` → MockStorage | `true` |

## デプロイ

```bash
# ビルド + Cloudflare Workers にデプロイ
pnpm deploy
```

### 本番用シークレットの設定

```bash
wrangler secret put LINE_CHANNEL_SECRET
wrangler secret put LINE_CHANNEL_ACCESS_TOKEN
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
│   ├── ledger/          元帳ドメイン（LedgerEntry, ParsedEntry, ReceiptParser IF）
│   ├── line/            LINE ドメイン（LineClient IF, ExtractedMessage 等）
│   └── storage/         Storage IF, SHEET_NAMES
├── infra/           技術軸の具象実装（mock は各技術ディレクトリ内に配置）
│   ├── line/            GoogleLineClient, MockLineClient, 署名検証
│   ├── gemini/          GeminiReceiptParser, MockReceiptParser
│   └── google/          GoogleSheetsStorage, MockStorage
├── features/        ドメイン軸のユースケース
│   └── ledger/          元帳登録ユースケース（registerLedgerEntries）
└── routes/          ルーティング + Composition Root（DI）
```

## ドキュメント

- [docs/SPEC.md](docs/SPEC.md) — プロダクト仕様書
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — 技術スタック選定
- [docs/C4.md](docs/C4.md) — C4 モデル
