---
name: coding-standards
description: app/配下のコード実装・レビュー・リファクタ時に使う。kakeibotのアーキテクチャ規範とコーディング規約を提供する。レイヤ越境ルール（domain/features/infra/routes）、features層のResult型返却（throw禁止）、valibot駆動の型導出（InferOutput / as Type禁止）、AppError階層によるエラーラップ、enum / any禁止、Cloudflare Workers（workerd）互換、AIへの推測委譲の境界。
---

## アーキテクチャ規範

### レイヤ越境ルール

```
domain  ← features  ← routes
            ↑
          infra
```

- `app/domain/` を起点に不変条件・型・インターフェースを先に定義する。外部依存禁止。
- `app/features/` は `domain/` のインターフェースだけに依存する。`infra/` を直接 import しない（DI の徹底）。
- `app/infra/` は `domain/` のインターフェースを実装する技術軸の具象。具象は `routes/` 側で注入する。
- 越境ルールの背景と棄却した選択肢は `docs/architecture/overview.md` §1 を参照。

### features 層は Result を返す（throw 禁止）

- `features/` の mutation / query 関数は `throw` せず、`Result<T, AppError>` を返す（`app/domain/result.ts`）。
- `infra/` は引き続き `AppError` を `throw` する。`features/` 内で catch して Result 化する。
- 想定外のエラー（プログラミングエラー）は `throw` のまま素通しさせる。
- `routes/` の loader / action では `unwrap()` で剥がし、`ErrorBoundary` に到達させる。
- 決定の背景は `docs/architecture/overview.md` §2 を参照。

### データ検証と型の思想（valibot 駆動）

- 外部入力を扱う際は、TypeScript の `interface` ではなく `valibot` スキーマを正として型を導出する（`InferOutput`）。
- ドメイン層の不変条件（例: 「金額は 1 以上の整数」）は `domain/` 内で `valibot` スキーマとして宣言する。
- JSON のパース結果に対して `as Type` による型キャストは禁止。必ず `v.safeParse()` を通して検証する。

### AppError 階層と instanceof による回復処理

- 標準の `Error` を直接 throw しない。例外は必ず `app/domain/errors.ts` の `AppError` 派生クラス（`LineApiError`, `GeminiApiError`, `ValidationError` 等）でラップする。
- 呼び出し元では `instanceof` でエラーを識別し、ドメインに適した回復処理やユーザー通知を行う。`AppError` は `userMessage` と `code` を持つ。

### AI への依存の境界

- AI（Gemini 等）に過度な推測を委ねない。決定論的に処理できる情報はアプリケーション層で行う。
- 例: レシートに日付がない場合、AI に今日の日付を推測させず、空文字で返させ、`features/` で JST の「今日」を補完する。
- 例: 通常財布名は AI に決めさせず、AI が返した `date` の `YYYY-MM` からアプリ側で組み立てる。

### Cloudflare Workers 互換

- 実行環境は `workerd` ランタイム。Node.js 固有 API（`crypto`, `fs` 等）への依存を避ける。
- 常に Web 標準 API（`fetch`, `crypto.subtle`）を使う。

---

## コーディング規約

### CI ゲート（コミット前に必ず通す）

コードを変更したら、コミット・プッシュ前に以下を実行してクリアされていることを確認する。

```bash
pnpm tsc --noEmit   # 型エラーがゼロであること
pnpm test           # 全テストがパスすること
```

どちらかが落ちていたらプッシュしない。修正してから再確認する。

---

### パッケージマネージャー

- **pnpm を使う**。`npm install` / `yarn` は使わない。
- ロックファイルは `pnpm-lock.yaml` のみをコミットする。`package-lock.json` / `yarn.lock` が生成されたら削除してコミットしない。
- CI・スクリプト・エージェントがパッケージを追加・インストールするときも `pnpm add` / `pnpm install` を使う。

### 基本

- **`enum` 禁止**: 代わりにユニオン型（`type X = 'A' | 'B'`）または定数オブジェクト（`as const`）を使う。
- **`any` / 無防備な `unknown` 禁止**: 外部からの不確実な入力は `unknown` のまま扱わず、直ちに `valibot` でパースして安全な型に変換する。
- **`type` エイリアスを基本に**: データ構造の定義は原則として `type` エイリアスを使う。

### コメントポリシー

- WHAT ではなく WHY を、それも非自明なときだけ書く。命名で表現できるものはコメントにしない。
- 一時的なメモ（「TODO: そのうち」「added for X」等）は残さない。

---

## 関連 Skill / docs

- ドメイン用語と不変条件: `.claude/skills/domain-knowledge/`
- UI 規約: `.claude/skills/design-system/`
- テスト戦略: `.claude/skills/testing/`
- 技術選定 Why: `docs/architecture/tech-choices.md`
- 設計判断 Why: `docs/architecture/overview.md`
