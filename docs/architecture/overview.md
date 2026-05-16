# アーキテクチャ概観

レイヤ構成・エラー伝搬・テスタビリティに関わる「**過去の決定**」を集約する。コーディング規約そのものは `.claude/skills/coding-standards/` を参照。

各項は「決定 / 背景 / 棄却した選択肢」の 3 項で記述する。

---

## 1. レイヤ越境ルール

### 決定

```
domain  ← features  ← routes
            ↑
          infra
```

- `domain/`: 型・スキーマ・インターフェース・純粋関数のみ。外部依存禁止。
- `features/`: ドメイン軸のユースケース。`domain/` のインターフェースだけに依存する（DI）。
- `infra/`: 技術軸の具象実装（LINE / Gemini / Google Sheets）。`domain/` のインターフェースを実装する。
- `routes/`: Composition Root。`features/` を呼び、`infra/` の具象を注入する。

`features/` は `infra/` を直接 import しない。

### 背景

ユースケースの単体テストでモック実装を差し替えるためには、`features/` が具象に依存していてはならない。3 軸モック（`USE_MOCK_LINE` / `USE_MOCK_AI` / `USE_MOCK_STORAGE`）を成立させる前提でもある。

### 棄却した選択肢

- **ヘキサゴナル / クリーンアーキテクチャの完全形（ports & adapters の専用層を立てる）** — MVP 規模では over-engineering。`domain/` 内の interface 定義で十分機能する。

---

## 2. features 層は Result を返す（throw しない）

### 決定

`features/` レイヤの mutation / query 関数は `throw` せず、`Result<T, AppError>` を返す（`app/domain/result.ts`）。

- `infra/` レイヤは引き続き `AppError` を `throw` する。
- `features/` 内で catch して `Result` 化する。
- 想定外のエラー（プログラミングエラー）は `throw` のまま素通しさせる。
- `routes/` の loader / action では `unwrap()` で剥がし、`ErrorBoundary` に到達させる。

### 背景

ユースケースの失敗は「予期される異常系」であり、呼び出し側で `try/catch` ではなく値として分岐したい。UI 側（loader / action）でユーザー向けメッセージを組み立てる際に、`if (!result.ok)` のような簡潔な分岐で扱える。

### 棄却した選択肢

- **すべて throw + 上位 catch** — どの例外が「予期されたもの」なのかが型で見えず、見落としやすい。
- **Either 型ライブラリ（neverthrow 等）の導入** — 学習コストとバンドルサイズ増。標準の判別共用型で十分。

---

## 3. 3 軸モックアーキテクチャ

### 決定

外部依存を以下の 3 軸でモック化し、環境変数で独立にスイッチする（実装: `app/infra/factory.ts`）。

| 軸 | 環境変数 | 真の実装 | モック実装 |
|----|---------|---------|-----------|
| LINE Messaging API | `USE_MOCK_LINE` | `GoogleLineClient` | `MockLineClient` |
| AI（Gemini） | `USE_MOCK_AI` | `GeminiReceiptParser` | `MockReceiptParser` |
| ストレージ（Sheets） | `USE_MOCK_STORAGE` | `GoogleSheetsStorage` | `MockStorage` |

`MockStorage` は Vite プロセス内でシングルトンとして生存させ、リクエスト間でデータを保持する。

### 背景

- ローカル開発で外部 API の課金・認証情報なしに全機能を試せるようにする。
- 「AI だけ本物、Storage はモック」のような部分検証を可能にする（解析精度の調整時など）。
- E2E テストでも同じモック実装を再利用できる。

### 棄却した選択肢

- **単一の `USE_MOCK` フラグ** — AI だけ本物にしたい等の部分検証が不可能になる。
- **依存ライブラリのモッキング（`vi.mock` 等）に寄せる** — 実行時（`pnpm dev`）に切り替えられず、開発体験が悪化する。

### 運用手順

ローカルでのフラグの組み合わせ方は `README.md` の「モックの 3 軸切り替え」を参照。

---

## 4. AppError 階層と instanceof による回復処理

### 決定

すべてのアプリケーション例外は `app/domain/errors.ts` の `AppError` を基底とした派生クラスでラップする。呼び出し元は `instanceof` で識別する。`AppError` は `userMessage` と `code` を持ち、UI への直接表示と国際化を見越す。

### 背景

LINE / Gemini / Sheets それぞれの API 失敗を、ドメイン側で「どう振る舞うべきか」の判断に使いたい。標準の `Error` だけだと文字列マッチでの判別になり脆い。

---

## 5. AI への依存境界

### 決定

AI（Gemini）には「決定論的に処理できる情報」を推測させない。

- 例: レシートに日付が記載されていなければ、AI は空文字を返す。`features/` 層で JST の「今日」を補完する。
- 例: 通常財布名は AI に決めさせず、AI が返した `date` の `YYYY-MM` からアプリ側で組み立てる。

### 背景

AI の出力は確率的に揺れる。決定論的な処理はコード側に持つことで、テスト容易性が上がり、AI のプロンプト変更による副作用も減らせる。
