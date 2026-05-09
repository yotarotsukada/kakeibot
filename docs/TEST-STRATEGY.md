# テスト戦略

## 技術選定

ARCHITECTURE.md に記載済みの方針を具体化する。

| レイヤー | ツール | 用途 |
|---------|-------|------|
| Unit / Component テスト | Vitest + React Testing Library | ロジック・コンポーネントの単体検証 |
| E2E テスト | Playwright | ユーザー操作シナリオの統合検証 |

### セットアップコマンド（未実行）

```bash
# Unit / Component
npm install -D vitest @testing-library/react @testing-library/user-event jsdom

# E2E
npx playwright install
```

`vitest.config.ts` の雛形:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
  },
});
```

---

## テスト対象と優先度

### 優先度 高：ドメインロジック（Unit テスト）

`app/domain/` と `app/features/budget/` の純粋関数が最優先ターゲット。
副作用がなく、モックが不要で壊れにくいため ROI が高い。

対象例:
- `app/domain/budget/budget.ts` の計算ロジック
- `app/features/budget/dashboard.ts` の `getDashboardData`（Storage を MockStorage で差し替え）
- `app/features/budget/manage.ts` の `upsertBudget` / `deleteBudget`（同上）

### 優先度 高：ユーティリティ（Unit テスト）

- `app/lib/utils.ts` の `cn()` — クラスマージの正当性を検証

### 優先度 中：UI コンポーネント（Component テスト）

刷新したコンポーネントの表示ロジックを検証。

| コンポーネント | 検証ポイント |
|--------------|------------|
| `WalletCard` | 予算超過時に `text-destructive` が適用されるか、カテゴリ数に応じて `CategoryBudgetRow` がレンダリングされるか |
| `CategoryBudgetRow` | `remainingAmount < 0` のとき赤表示・マイナス表示になるか |
| `BudgetOverviewCard` | `budgetRecords` が空のとき空グレーチャートが表示されるか |
| `MonthSelector` | `variant="tabs"` で選択月に `bg-background` が付くか |

### 優先度 低：ルートの loader / action（Integration テスト）

Cloudflare Workers 環境への依存度が高くセットアップが複雑なため、優先度を下げる。
将来的には Miniflare を使ったテスト環境で対応する。

---

## 明示的スコープ外

| 対象 | 理由 |
|------|------|
| Recharts の DonutChart 内部 | 外部ライブラリの動作保証はしない。描画結果の正確さはビジュアルレグレッションで担保する |
| LINE LIFF SDK の認証フロー | 外部依存かつ Cloudflare Workers 環境が必要。E2E でモックを使う |
| `app/routes/webhook.ts` | LINE 署名検証を含む統合テスト。E2E レイヤーで扱う |
| shadcn/ui コンポーネント内部（button / card / input 等） | ライブラリ側の責務 |

---

## モック戦略

ARCHITECTURE.md の「3-level mock axes」に準拠する。

```
axis 1: LINE SDK        → USE_MOCK_LIFF=true で LiffGate をスキップ
axis 2: AI / Gemini     → MockAI (既存実装)
axis 3: Storage         → MockStorage (既存実装) を DI
```

Component テストでは axis 3 のみ差し替えれば十分なケースが多い。
Loader / Action の Integration テストでは axios 1-3 をすべて差し替える。

---

## ファイル配置方針

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

テストファイルは `__tests__/` フォルダではなく `test/` ルートに集約し、
`app/` 配下にテストを混在させない。
