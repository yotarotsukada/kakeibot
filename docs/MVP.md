# MVP 実装ドキュメント

本ドキュメントは、kakeibot の MVP（Minimum Viable Product）として実装した「LINE メッセージ → AI 解析 → Google Sheets 記録」フローの全体像を、機能面・技術面・設計判断の 3 つの観点から記録します。

---

## 1. MVP の機能概要

### 実現するユースケース

ユーザーが LINE にテキストまたはレシート画像を送信すると、AI が金額・費目・店名などを自動抽出し、Google Sheets の元帳に 1 行追記します。

```
ユーザー → LINE → /webhook → AI 解析 → Google Sheets 元帳
                                    ↓
                              LINE に確認返信
```

### 入力パターン

| 入力 | 例 | AI の処理 |
|------|-----|----------|
| テキスト | `ランチ 1500円` | 金額・費目をテキストから抽出 |
| 画像 | レシート写真 | OCR + 構造化抽出 |
| テキスト＋画像 | 補足メモ付きレシート | 両方を組み合わせて解析 |

### 出力

- **Google Sheets 元帳** にトランザクション行を追記（9 列: ID, 日時, 区分, 金額, アクター, 費目, 財布, 精算フラグ, メモ）
- **LINE 返信** で登録内容のサマリーを送信（例: `✅ 登録しました\n外食費: ¥1,500`）
- **エラー時**: 解析失敗や未登録ユーザーの場合、LINE で理由を返信

---

## 2. 設計方針と判断軸

### 2.1. レイヤードアーキテクチャ

以下の 4 層構造を採用し、依存の方向を厳格に管理しています。

```
routes → features → domain ← infra
```

| レイヤー | 役割 | 依存ルール |
|---------|------|-----------|
| `domain/` | 型定義＋インターフェース | 外部ライブラリ依存禁止 |
| `infra/` | 技術軸の具象実装 | domain の IF を実装 |
| `features/` | ユースケース（ドメインロジック） | domain の IF のみに依存 |
| `routes/` | Composition Root + ルーティング | infra をインスタンス化して features に DI |

#### 判断軸: なぜこの構造にしたか

- **テスト容易性**: features はインターフェースに依存するため、infra のモック差し替えが容易。
- **技術変更の局所化**: AI プロバイダーを Gemini → OpenAI に変える場合、`infra/gemini/` を `infra/openai/` に追加するだけで features 層は無変更。
- **過剰設計の回避**: routes に直接書くべき単純な処理（ヘルスチェックなど）は、パターン B として許容。features へ移すのは DB アクセスやビジネスロジックを伴う場合のみ。

### 2.2. ディレクトリ構成

```
app/
├── domain/                       ← ドメイン層（型・IF のみ）
│   ├── errors.ts                    AppError 階層（LineApiError, GeminiApiError 等）
│   ├── ledger/                      元帳ドメイン（技術とドメインが交差する中心概念）
│   │   ├── entry.ts                    LedgerEntry, ParsedEntry, ParserInput
│   │   └── receipt-parser.ts           ReceiptParser IF（1 メッセージ = 1 エントリ）
│   ├── line/                        LINE ドメイン
│   │   ├── client.ts                   LineClient IF
│   │   └── event.ts                    LineWebhookBody, ExtractedMessage
│   └── storage/                     汎用ストレージ
│       └── index.ts                    Storage IF, SHEET_NAMES
│
├── infra/                        ← インフラ層（技術軸、mock は同ディレクトリ内）
│   ├── line/                        LINE Messaging API
│   │   ├── webhook.ts                  署名検証・valibot ペイロードパース
│   │   ├── client.ts                   GoogleLineClient
│   │   └── client.mock.ts              MockLineClient
│   ├── gemini/                      Google Gemini API
│   │   ├── receipt-parser.ts           GeminiReceiptParser
│   │   └── receipt-parser.mock.ts      MockReceiptParser
│   └── google/                      Google Workspace API
│       ├── sheets-storage.ts           GoogleSheetsStorage（+ JWT auth）
│       └── sheets-storage.mock.ts      MockStorage
│
├── features/                     ← アプリケーション層（ドメイン軸）
│   └── ledger/                      元帳ドメインのユースケース
│       └── register.ts                 registerLedgerEntries()
│
└── routes/                       ← ルーティング＋Composition Root
    ├── home.tsx                     トップページ（React Router）
    └── webhook.ts                   LINE Webhook エンドポイント（DI）
```

#### 判断軸: infra は技術軸、features はドメイン軸

- `infra/` は「LINE」「Gemini」「Google」という **技術・サービス** で分割。mock も同じディレクトリ内に `*.mock.ts` として配置し、本番と並列に管理する。
- `features/` は「元帳（ledger）」のような **ドメイン概念** で分割。`domain/ledger/` と `features/ledger/` で同じ名前を共有することで、どの層がどのドメインに属するかを一目で把握できる。webhook は技術的な通信手段であり、ドメインの関心事ではないため features の名前には使わない。

### 2.3. パターン A / B の使い分け

| パターン | 条件 | 例 |
|---------|------|-----|
| A: features へ委譲 | DB・外部 API・バリデーション・ビジネスロジックを含む | `registerLedgerEntries` |
| B: routes に直接記述 | 静的応答、リダイレクト、ドメイン知識不要 | `loader` のヘルスチェック応答 |

### 2.4. 3 つのモック軸

外部依存を 3 つのインターフェースに分離し、それぞれ独立にモック切替可能にしています。

| フラグ | 本番 | モック | 判断理由 |
|--------|------|--------|---------|
| `USE_MOCK_LINE` | GoogleLineClient | MockLineClient | LINE API 呼び出しの回避。※ 実画像のパスをモックスクリプトに渡すことで、モック環境のまま本物の画像データを後続の処理に流す機能も備えています |
| `USE_MOCK_AI` | GeminiReceiptParser | MockReceiptParser | Gemini API の課金回避。※ 本番実装（`USE_MOCK_AI=false`）では、`GEMINI_MODEL` 環境変数によりモデル（デフォルト: `gemini-2.5-flash-lite`）を切り替え可能 |
| `USE_MOCK_STORAGE` | GoogleSheetsStorage | MockStorage | Sheets API 認証の省略＋即時確認 |

全て `true` にすると、外部 API を一切呼ばずにローカルだけで全フローが完走します。

---

## 3. 型・バリデーション・エラーの統一

MVP実装において、外部入力の不確実性を排除し、安全にドメインロジックを回すためのルールを敷いています。

### 3.1. スキーマ駆動の型定義 (valibot)

外部入力を扱う際は、**TypeScript の型定義（`interface`）ではなく、`valibot` スキーマを正として型を導出（`InferOutput`）します**。

- **domain層の責務**: 「金額は1以上の整数」「日付はYYYY-MM-DD」といった**ドメイン不変条件**は `domain/` 内で `valibot` スキーマとして宣言します。（例: `ParsedEntrySchema`, `LineWebhookBodySchema`）
- **infra層の責務**: 「Gemini APIのレスポンス構造」のような**インフラ固有の外部仕様**は `infra/` 内でスキーマを定義します。（例: `GeminiResponseSchema`）
- **例外の排除**: JSONのパース結果に対して `as Type` による型キャストは禁止し、必ず `v.safeParse()` を通して検証します。

**判断軸**: 「外部ライブラリ依存禁止」の原則は維持しつつ、`valibot` はインフラ固有のライブラリではなく「型不変条件を表現するための言語的ツール」と位置づけ、`domain/` での使用を許容しています。これにより、「宣言」と「検証」の二重管理を防ぎます。

また、AI に期待しすぎない（プログラマティックに処理できるものはアプリケーション層で行う）という方針に基づき、以下のような工夫を行っています。
- **日付の推測回避**: AI には「レシートに日付がなければ空文字を返す」ように指示し、空文字の場合は `features/ledger/` 層で JST の「今日」の日付を自動補完しています。これにより、モデルによる日付推測のブレを防ぎます。

### 3.2. AppError 階層によるエラーハンドリング

エラーは `AppError` を基底クラスとするカスタムエラー階層（`domain/errors.ts`）で一元管理しています。

```
AppError (base)
├── LineApiError          LINE API 呼び出し失敗
├── GeminiApiError        Gemini API 呼び出し/パース失敗
├── GoogleSheetsError     Sheets API 失敗
├── ValidationError       valibot スキーマ検証失敗
└── UnknownUserError      ユーザーマスタ未登録
```

- **infra層**: `try-catch` で外部API等の例外を捕捉し、適切な `AppError` サブクラスでラップして再スローします。
- **features層**: 呼び出し元（ユースケース）では `instanceof` を用いてエラーを識別し、「ユーザーマスタ未登録なら専用の案内をLINEで返信する」といった、ドメインに適した回復処理・ユーザー通知を行います。

---

## 4. 技術的な実装詳細

### 4.1. Cloudflare Workers 対応

**判断軸**: Cloudflare Workers (workerd ランタイム) は Node.js API を持たないため、全モジュールを Web 標準 API のみで実装する必要がある。

| 項目 | 選択 | 理由 |
|------|------|------|
| HTTP クライアント | `fetch` (Web API) | SDK（google-auth-library 等）は Node.js 依存 |
| HMAC 署名 | `crypto.subtle` (Web Crypto API) | Node.js `crypto` は workerd で不可 |
| JWT 署名 | `jose` | Web Crypto API ベースで workerd 互換 |
| 非同期処理 | `ctx.waitUntil()` | Worker の応答後もバックグラウンド処理を継続可能 |

### 4.2. waitUntil による非同期処理

LINE Webhook は 30 秒以内に応答しないとリトライされます。AI 解析 + Sheets 書き込みには数秒かかるため:

1. 署名検証 → `200 OK` を**即座に**返す
2. `ctx.waitUntil()` 内で AI 解析 → Sheets 書き込み → LINE 返信を実行
3. waitUntil 内の処理は Worker の CPU 時間制限まで実行可能

### 4.3. LINE 署名検証

```
HMAC-SHA256(channelSecret, rawBody) === x-line-signature
```

- **タイミングセーフ比較**: `timingSafeEqual` で定数時間比較し、タイミング攻撃を防止
- **生ボディ**: パース前の文字列で署名を計算（パース後の `JSON.stringify` では値が変わる）

### 4.4. Google Sheets 認証

Service Account の JWT → アクセストークンのフローを `jose` で実装:

1. PEM 秘密鍵を `importPKCS8` で読み込み
2. `SignJWT` で `RS256` 署名した JWT を生成
3. Google OAuth2 Token Endpoint に POST してアクセストークンを取得
4. Sheets API `values:append` で行を追記

---

## 5. テーブル（シート）設計

シート名は `domain/storage.ts` の `SHEET_NAMES` 定数で一元管理しています。

| シート名 | 用途 | MVP での状態 |
|---------|------|------------|
| 元帳 | 全入出金の記録 | ✅ 実装済み（追記） |
| ユーザーマスタ | LINE userId → アクター名 | ✅ 実装済み（参照） |
| 財布マスタ | 財布の定義 | 定数定義のみ |
| 費目マスタ | カテゴリの定義 | 定数定義のみ |
| 予算記録 | 財布×費目の予算 | 定数定義のみ |

新しいテーブルが必要になった場合は `SHEET_NAMES` に追加 → `Storage` インターフェースにメソッド追加 → 各実装に反映、という手順です。

---

## 6. 今後の展開

| 項目 | 優先度 | 概要 |
|------|-------|------|
| Cloudflare へのデプロイ | 高 | `pnpm deploy` で Workers にデプロイし、LINE Webhook URL を設定 |
| ダッシュボード | 中 | `features/dashboard/` に閲覧ユースケースを追加 |
| LIFF 連携 | 中 | LINE Front-end Framework でダッシュボードをトーク内表示 |
| 赤黒処理 | 低 | キャンセル時のマイナスレコード登録 |
| E2E テスト | 低 | Vitest + モックで features 層のテスト |

> [!NOTE]
> valibot によるペイロードバリデーション（LINE Webhook・Gemini レスポンス）および AppError 階層によるエラー統一は実装済み。
