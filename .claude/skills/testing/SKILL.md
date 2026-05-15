---
name: testing
description: kakeibotのテスト戦略・対象優先度・モック差し替え方針・spec.tsファイル配置規約。Vitest/Playwright/React Testing Library。テスト追加・修正・テスト設計・モックスコープの判断時に参照。
---

家計簿アプリのテストを書くときの方針。実行コマンドは `README.md` の「テスト / 型 / Lint の実行」を参照。

---

## 1. ツールと用途

| レイヤ | ツール | 用途 |
|--------|-------|------|
| Unit / Component テスト | Vitest + React Testing Library | ロジック・コンポーネントの単体検証 |
| E2E テスト | Playwright | ユーザー操作シナリオの統合検証 |

---

## 2. 対象優先度

### 優先度 高: ドメインロジック（Unit テスト）

`app/domain/` と `app/features/budget/` の純粋関数が最優先ターゲット。副作用がなく、モックが不要で壊れにくいため ROI が高い。

対象例:

- `app/domain/budget/budget.ts` の計算ロジック
- `app/features/budget/dashboard.ts` の `getDashboardData`（Storage を MockStorage で差し替え）
- `app/features/budget/manage.ts` の `upsertBudget` / `deleteBudget`（同上）

### 優先度 高: ユーティリティ（Unit テスト）

- `app/lib/utils.ts` の `cn()` などの小粒関数

### 優先度 中: UI コンポーネント（Component テスト）

刷新したコンポーネントの表示ロジックを検証。

| コンポーネント | 検証ポイント |
|--------------|------------|
| `WalletCard` | 予算超過時に `text-destructive` が適用されるか、カテゴリ数に応じて `CategoryBudgetRow` がレンダリングされるか |
| `CategoryBudgetRow` | `remainingAmount < 0` のとき赤表示・マイナス表示になるか |
| `BudgetOverviewCard` | `budgetRecords` が空のとき空グレーチャートが表示されるか |
| `MonthSelector` | `variant="tabs"` で選択月に `bg-background` が付くか |

### 優先度 低: loader / action（Integration テスト）

Cloudflare Workers 環境への依存度が高くセットアップが複雑なため、優先度を下げる。将来的には Miniflare を使った環境で対応する。

---

## 3. 明示的スコープ外

| 対象 | 理由 |
|------|------|
| Recharts の DonutChart 内部 | 外部ライブラリの動作保証はしない。描画結果の正確さはビジュアルレグレッションで担保 |
| LINE LIFF SDK の認証フロー | 外部依存かつ Workers 環境が必要。E2E でモックを使う |
| `app/routes/webhook.ts` | LINE 署名検証を含む統合テスト。E2E レイヤーで扱う |
| shadcn/ui コンポーネント内部（button / card / input 等） | ライブラリ側の責務 |

---

## 4. モック差し替えの最小単位

実装上のモック軸は `app/infra/factory.ts` の 3 軸（LINE / AI / Storage）。テストの目的に応じて差し替え範囲を最小化する。

| テスト種別 | 差し替える軸 |
|-----------|-------------|
| domain の純粋関数 | なし（モック不要） |
| features の Unit | Storage のみ（MockStorage を直接 inject） |
| Component | なし（ロジックを props で受ける構造にし、テストでは値を直接渡す） |
| Integration / E2E | 3 軸すべて（環境変数で切り替え、`features/` 経由で実行） |

3 軸モックアーキテクチャの設計判断は `docs/architecture/overview.md` §3 を参照。

---

## 5. ファイル配置

```
test/
├── setup.ts              # jsdom 初期化・グローバル設定
├── domain/               # ドメインロジック Unit テスト
│   └── budget.test.ts
├── features/             # feature Unit テスト
│   ├── dashboard.test.ts
│   └── manage.test.ts
└── components/           # Component テスト
    ├── WalletCard.test.tsx
    ├── CategoryBudgetRow.test.tsx
    └── BudgetOverviewCard.test.tsx
```

- テストは `test/` ルートに集約し、`app/` 配下にテストファイルを混在させない（`__tests__/` ディレクトリは使わない）。
- ファイル名は `*.test.ts` または `*.test.tsx`。

---

## 6. 実行

`pnpm test` / `pnpm test:watch` / `pnpm test:coverage` の使い分けは `README.md` を参照。
