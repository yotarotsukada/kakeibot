/**
 * インメモリモックストレージ（開発用）。
 */

import type { BudgetRecord, Wallet } from "~/domain/budget/budget";
import type { LedgerEntry, SpendingEntry } from "~/domain/ledger/entry";
import type {
  LedgerEntryWithId,
  PoolOperation,
  PoolOperationWithId,
  SpendingEntryWithId,
  Storage,
  User,
} from "~/domain/storage";
import { SHEET_NAMES } from "~/domain/storage";

type StoredEntry = LedgerEntry & { transactionId: string };

const SEED_WALLETS: Wallet[] = [
  { name: "2026-05通常", type: "月次", settled: false },
  { name: "2026-04通常", type: "月次", settled: false },
  { name: "2026-03通常", type: "月次", settled: false },
  { name: "沖縄旅行", type: "特別", settled: false },
  { name: "新居家具", type: "特別", settled: false },
  { name: "結婚記念旅行", type: "特別", settled: true },
];

const SEED_BUDGETS: BudgetRecord[] = [
  { walletName: "2026-05通常", categoryName: "食費", amount: 50000 },
  { walletName: "2026-05通常", categoryName: "日用品費", amount: 30000 },
  { walletName: "2026-05通常", categoryName: "交通費", amount: 10000 },
  { walletName: "2026-05通常", categoryName: "外食費", amount: 20000 },
  { walletName: "2026-04通常", categoryName: "食費", amount: 48000 },
  { walletName: "2026-04通常", categoryName: "日用品費", amount: 28000 },
  { walletName: "2026-03通常", categoryName: "食費", amount: 48000 },
  { walletName: "2026-03通常", categoryName: "日用品費", amount: 25000 },
  // 特別財布は合計予算を1件（予約カテゴリ）で保持する
  { walletName: "沖縄旅行", categoryName: "一括", amount: 200000 },
  { walletName: "新居家具", categoryName: "一括", amount: 230000 },
  { walletName: "結婚記念旅行", categoryName: "一括", amount: 120000 },
];

const SEED_LEDGER: StoredEntry[] = [
  // 入金エントリ（財布なし）
  {
    transactionId: "seed-income-001",
    date: "2026-05-01",
    type: "入金",
    amount: 200000,
    actor: "共同",
    memo: "5月分生活費入金",
  },
  {
    transactionId: "seed-income-002",
    date: "2026-04-01",
    type: "入金",
    amount: 200000,
    actor: "共同",
    memo: "4月分生活費入金",
  },
  {
    transactionId: "seed-income-003",
    date: "2026-03-01",
    type: "入金",
    amount: 200000,
    actor: "共同",
    memo: "3月分生活費入金",
  },
  // 2026-05通常 の支出
  {
    transactionId: "seed-001",
    date: "2026-05-01",
    type: "支出",
    amount: 12000,
    actor: "共同",
    category: "食費",
    wallet: "2026-05通常",
    shouldSettle: true,
    memo: "スーパー",
  },
  {
    transactionId: "seed-002",
    date: "2026-05-02",
    type: "支出",
    amount: 5000,
    actor: "共同",
    category: "日用品費",
    wallet: "2026-05通常",
    shouldSettle: true,
    memo: "ドラッグストア",
  },
  {
    transactionId: "seed-003",
    date: "2026-05-03",
    type: "支出",
    amount: 8000,
    actor: "共同",
    category: "食費",
    wallet: "2026-05通常",
    shouldSettle: true,
    memo: "肉屋",
  },
  {
    transactionId: "seed-004",
    date: "2026-05-04",
    type: "支出",
    amount: 3000,
    actor: "共同",
    category: "交通費",
    wallet: "2026-05通常",
    shouldSettle: true,
    memo: "電車定期",
  },
  {
    transactionId: "seed-005",
    date: "2026-05-05",
    type: "支出",
    amount: 25000,
    actor: "共同",
    category: "外食費",
    wallet: "2026-05通常",
    shouldSettle: true,
    memo: "記念日ディナー",
  },
  {
    transactionId: "seed-006",
    date: "2026-05-05",
    type: "支出",
    amount: 15000,
    actor: "共同",
    category: "食費",
    wallet: "2026-05通常",
    shouldSettle: true,
    memo: "週末の買い出し",
  },
  // 沖縄旅行（未精算の特別財布）
  {
    transactionId: "seed-007",
    date: "2026-05-06",
    type: "支出",
    amount: 80000,
    actor: "共同",
    category: "一括",
    wallet: "沖縄旅行",
    shouldSettle: true,
    memo: "航空券2名分",
  },
  {
    transactionId: "seed-014",
    date: "2026-05-07",
    type: "支出",
    amount: 35000,
    actor: "共同",
    category: "一括",
    wallet: "沖縄旅行",
    shouldSettle: true,
    memo: "ホテル代",
  },
  // 新居家具（未精算の特別財布）
  {
    transactionId: "seed-011",
    date: "2026-04-15",
    type: "支出",
    amount: 60000,
    actor: "共同",
    category: "一括",
    wallet: "新居家具",
    shouldSettle: true,
    memo: "ソファ",
  },
  {
    transactionId: "seed-012",
    date: "2026-05-02",
    type: "支出",
    amount: 45000,
    actor: "共同",
    category: "一括",
    wallet: "新居家具",
    shouldSettle: true,
    memo: "洗濯機",
  },
  // 結婚記念旅行（精算済みの特別財布）
  {
    transactionId: "seed-013",
    date: "2026-03-10",
    type: "支出",
    amount: 110000,
    actor: "共同",
    category: "一括",
    wallet: "結婚記念旅行",
    shouldSettle: true,
    memo: "京都温泉旅館",
  },
  // 2026-04通常 の支出
  {
    transactionId: "seed-008",
    date: "2026-04-10",
    type: "支出",
    amount: 30000,
    actor: "共同",
    category: "食費",
    wallet: "2026-04通常",
    shouldSettle: true,
    memo: "月中の食料品",
  },
  {
    transactionId: "seed-009",
    date: "2026-04-20",
    type: "支出",
    amount: 15000,
    actor: "共同",
    category: "日用品費",
    wallet: "2026-04通常",
    shouldSettle: true,
    memo: "家電消耗品",
  },
  {
    transactionId: "seed-010",
    date: "2026-04-28",
    type: "支出",
    amount: 52000,
    actor: "共同",
    category: "食費",
    wallet: "2026-04通常",
    shouldSettle: true,
    memo: "月末まとめ買い",
  },
  // 2026-03通常 の支出
  {
    transactionId: "seed-015",
    date: "2026-03-15",
    type: "支出",
    amount: 35000,
    actor: "共同",
    category: "食費",
    wallet: "2026-03通常",
    shouldSettle: true,
    memo: "3月食費まとめ",
  },
  {
    transactionId: "seed-016",
    date: "2026-03-20",
    type: "支出",
    amount: 18000,
    actor: "共同",
    category: "日用品費",
    wallet: "2026-03通常",
    shouldSettle: true,
    memo: "3月日用品",
  },
];

const SEED_POOL_OPERATIONS: (PoolOperation & { transactionId: string })[] = [
  { transactionId: "seed-pool-001", date: "2026-01-01", type: "積立", amount: 500000, actor: "共同", memo: "初期残高" },
  { transactionId: "seed-pool-002", date: "2026-03-01", type: "積立", amount: 30000, actor: "共同", memo: "3月分積立" },
  { transactionId: "seed-pool-003", date: "2026-04-01", type: "積立", amount: 30000, actor: "共同", memo: "4月分積立" },
  { transactionId: "seed-pool-004", date: "2026-05-01", type: "積立", amount: 30000, actor: "共同", memo: "5月分積立" },
  { transactionId: "seed-pool-005", date: "2026-04-30", type: "配分", amount: 200000, actor: "共同", memo: "沖縄旅行費用配分" },
];

export class MockStorage implements Storage {
  private ledger: StoredEntry[] = structuredClone(SEED_LEDGER);
  private poolOps: (PoolOperation & { transactionId: string })[] = structuredClone(SEED_POOL_OPERATIONS);
  private users = new Map<string, string>([
    ["U_MOCK_USER_A", "A"],
    ["U_MOCK_USER_B", "B"],
  ]);
  private wallets: Wallet[] = structuredClone(SEED_WALLETS);
  private budgets: BudgetRecord[] = structuredClone(SEED_BUDGETS);

  async initialize(): Promise<void> {
    console.log("[MockStorage] 🗄️  初期化:");
    console.log(`  ${SHEET_NAMES.LEDGER}: ${this.ledger.length} 件`);
    console.log(`  ${SHEET_NAMES.USER_MASTER}: ${this.users.size} ユーザー`);
  }

  async appendLedgerEntries(entries: LedgerEntry[]): Promise<void> {
    for (const e of entries) {
      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      this.ledger.push({ transactionId: id, ...e });
      if (e.type === "支出") {
        console.log(
          `[MockStorage] 📝 ${SHEET_NAMES.LEDGER}: ${id} | ${e.date} | 支出 | ¥${e.amount} | ${e.actor} | ${e.category} | ${e.wallet} | ${e.memo}`,
        );
      } else {
        console.log(
          `[MockStorage] 📝 ${SHEET_NAMES.LEDGER}: ${id} | ${e.date} | 入金 | ¥${e.amount} | ${e.actor} | ${e.memo}`,
        );
      }
    }
    console.log(`[MockStorage] 合計 ${this.ledger.length} 件`);
  }

  async findActorByLineUserId(userId: string): Promise<string | null> {
    const actor = this.users.get(userId) ?? null;
    console.log(`[MockStorage] 👤 ${userId} → ${actor ?? "未登録"}`);
    return actor;
  }

  async getBudgetRecords(walletName: string): Promise<BudgetRecord[]> {
    return this.budgets.filter((b) => b.walletName === walletName);
  }

  async upsertBudgetRecord(record: BudgetRecord): Promise<void> {
    const idx = this.budgets.findIndex(
      (b) =>
        b.walletName === record.walletName &&
        b.categoryName === record.categoryName,
    );
    if (idx >= 0) {
      this.budgets[idx] = record;
    } else {
      this.budgets.push(record);
    }
  }

  async deleteBudgetRecord(
    walletName: string,
    categoryName: string,
  ): Promise<void> {
    this.budgets = this.budgets.filter(
      (b) => !(b.walletName === walletName && b.categoryName === categoryName),
    );
  }

  async getWallets(): Promise<Wallet[]> {
    return this.wallets;
  }

  async upsertWallet(wallet: Wallet): Promise<void> {
    const idx = this.wallets.findIndex((w) => w.name === wallet.name);
    if (idx >= 0) {
      this.wallets[idx] = wallet;
    } else {
      this.wallets.push(wallet);
    }
    console.log(
      `[MockStorage] 💳 財布マスタ upsert: ${wallet.name} (${wallet.type}, settled=${wallet.settled})`,
    );
  }

  async setWalletSettled(walletName: string, settled: boolean): Promise<void> {
    const wallet = this.wallets.find((w) => w.name === walletName);
    if (wallet) {
      wallet.settled = settled;
      console.log(
        `[MockStorage] 💳 精算フラグ更新: ${walletName} → ${settled}`,
      );
    }
  }

  async renameWallet(oldName: string, newName: string): Promise<void> {
    const wallet = this.wallets.find((w) => w.name === oldName);
    if (wallet) wallet.name = newName;
    for (const b of this.budgets) {
      if (b.walletName === oldName) b.walletName = newName;
    }
    for (const e of this.ledger) {
      if (e.type === "支出" && e.wallet === oldName) e.wallet = newName;
    }
    console.log(`[MockStorage] 💳 財布名変更: ${oldName} → ${newName}`);
  }

  async getLedgerEntriesByWallet(
    walletName: string,
  ): Promise<SpendingEntryWithId[]> {
    return this.getLedgerEntriesForCalendar(walletName);
  }

  async getLedgerEntriesForCalendar(
    walletName: string,
  ): Promise<SpendingEntryWithId[]> {
    return this.ledger
      .filter((e): e is SpendingEntry & { transactionId: string } =>
        e.type === "支出" && e.wallet === walletName,
      )
      .map(({ transactionId, ...entry }) => ({ id: transactionId, ...entry }));
  }

  async getLedgerEntriesByMonth(
    yearMonth: string,
  ): Promise<LedgerEntryWithId[]> {
    return this.ledger
      .filter((e) => e.date.startsWith(yearMonth))
      .map(({ transactionId, ...entry }) => ({ id: transactionId, ...entry }));
  }

  async getAllLedgerEntries(): Promise<LedgerEntryWithId[]> {
    return this.ledger.map(({ transactionId, ...entry }) => ({
      id: transactionId,
      ...entry,
    }));
  }

  async updateLedgerEntryCategory(
    entryId: string,
    categoryName: string,
  ): Promise<void> {
    const entry = this.ledger.find((e) => e.transactionId === entryId);
    if (entry && entry.type === "支出") {
      entry.category = categoryName;
      console.log(
        `[MockStorage] ✏️  カテゴリ更新: ${entryId} → ${categoryName}`,
      );
    }
  }

  async updateLedgerEntryAttribution(
    entryId: string,
    walletName: string,
    categoryName: string,
  ): Promise<void> {
    const entry = this.ledger.find((e) => e.transactionId === entryId);
    if (entry && entry.type === "支出") {
      entry.wallet = walletName;
      entry.category = categoryName;
      console.log(
        `[MockStorage] ✏️  アトリビューション更新: ${entryId} → wallet=${walletName}, category=${categoryName}`,
      );
    }
  }

  async updateLedgerEntryActor(
    entryId: string,
    actor: string,
  ): Promise<void> {
    const entry = this.ledger.find((e) => e.transactionId === entryId);
    if (entry) {
      entry.actor = actor;
      console.log(
        `[MockStorage] ✏️  アクター更新: ${entryId} → actor=${actor}`,
      );
    }
  }

  async getLatestLedgerEntry(): Promise<{
    walletName: string;
    date: string;
  } | null> {
    const spending = this.ledger.filter(
      (e): e is SpendingEntry & { transactionId: string } => e.type === "支出",
    );
    if (spending.length === 0) return null;
    const latest = spending.reduce((prev, cur) =>
      cur.date > prev.date ? cur : prev,
    );
    return { walletName: latest.wallet, date: latest.date };
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.entries()).map(([lineUserId, name]) => ({
      lineUserId,
      name,
    }));
  }

  async deletePoolOperation(id: string): Promise<void> {
    const idx = this.poolOps.findIndex((op) => op.transactionId === id);
    if (idx !== -1) {
      this.poolOps.splice(idx, 1);
      console.log(`[MockStorage] 🗑 ${SHEET_NAMES.SAVINGS_OPS}: ${id} 削除`);
    }
  }

  async appendPoolOperations(operations: PoolOperation[]): Promise<void> {
    for (const op of operations) {
      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      this.poolOps.push({ transactionId: id, ...op });
      console.log(
        `[MockStorage] 💰 ${SHEET_NAMES.SAVINGS_OPS}: ${id} | ${op.date} | ${op.type} | ¥${op.amount} | ${op.actor} | ${op.memo}`,
      );
    }
  }

  async getAllPoolOperations(): Promise<PoolOperationWithId[]> {
    return this.poolOps.map(({ transactionId, ...op }) => ({ id: transactionId, ...op }));
  }
}
