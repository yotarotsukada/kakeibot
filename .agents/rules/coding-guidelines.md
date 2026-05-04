---
trigger: model_decision
description: 機能実装・修正時に適用するアーキテクチャ規範とコーディング規約
---

## アーキテクチャ規範

### レイヤードアーキテクチャの遵守
- 常に `app/domain` を起点とし、不変条件を先に定義すること。
- 外部APIへの通信や具象の技術実装は `infra/` に隠蔽し、直接 `features/` から呼ばないこと。`features/` は `domain/` のインターフェースのみに依存する（DIの徹底）。

### データ検証と型の思想 (valibot駆動)
- 外部入力を扱う際は、TypeScriptの型定義（`interface`）ではなく、`valibot` スキーマを正として型を導出（`InferOutput`）すること。
- ドメイン層の不変条件（例：「金額は1以上の整数」など）は `domain/` 内で `valibot` スキーマとして宣言する。
- JSONのパース結果に対して `as Type` による型キャストは禁止し、必ず `v.safeParse()` を通して検証すること。

### AIへの依存に関する規範
- AI（Gemini等）に過度な推測を委ねないこと。プログラマティックに処理・補完できる情報はアプリケーション層で行う。
- 例：レシートに日付が記載されていない場合、AIに今日の日付を推測させるのではなく、AIには「日付なし（空文字）」として返させ、`features/` 層でJSTの「今日」の日付を自動補完する。

### Cloudflare Workers 互換の担保
- 実行環境は `workerd` ランタイムであるため、Node.js 固有のAPI（`crypto`, `fs` など）への依存を避ける。
- 常に Web 標準 API（`fetch`, `crypto.subtle`）を利用すること。

---

## コーディング規約

### 基本規約
- **`enum` の使用禁止**: 代わりにユニオン型（`type = 'A' | 'B'`）または定数オブジェクト（`as const`）を使用すること。
- **`any` / `unknown` の回避**: `any` の使用は原則禁止。外部からの不確実な入力は `unknown` のまま扱わず、直ちに `valibot` でパースし、安全な型に変換すること。
- **型定義の使い分け**: データの構造を定義する場合は原則として `type` エイリアスを使用する。

### エラーハンドリング
- 標準の `Error` を直接スローせず、例外は必ず `domain/errors.ts` に定義された `AppError` の派生クラス（`LineApiError`, `GeminiApiError`, `ValidationError` など）でラップしてスローすること。
- 呼び出し元（ユースケース）では `instanceof` を用いてエラーを識別し、ドメインに適した回復処理やユーザー通知を行う。

### UI設計 (フロントエンド)
- Tailwind CSS と shadcn/ui を利用し、洗練された美しいUIを提供すること。