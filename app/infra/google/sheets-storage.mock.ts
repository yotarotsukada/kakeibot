/**
 * インメモリモックストレージ（開発用）。
 */

import type { BudgetRecord, Wallet } from "~/domain/budget/budget";
import type { LedgerEntry } from "~/domain/ledger/entry";
import type { LedgerEntryWithId, Storage } from "~/domain/storage";
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
  // 特別財布は合計予算を1件（予約カテゴリ）で保持する
  {
    walletName: "沖縄旅行",
    categoryName: "一括",
    amount: 200000,
  },
  {
    walletName: "新居家具",
    categoryName: "一括",
    amount: 230000,
  },
  {
    walletName: "結婚記念旅行",
    categoryName: "一括",
    amount: 120000,
  },
];

const SEED_LEDGER: StoredEntry[] = [
  {
    transactionId: "seed-001",
    date: "2026-05-01",
    type: "支出",
    amount: 12000,
    actor: "A",
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
    actor: "B",
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
    actor: "A",
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
    actor: "B",
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
    actor: "A",
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
    actor: "B",
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
    actor: "A",
    category: "旅費",
    wallet: "沖縄旅行",
    shouldSettle: true,
    memo: "航空券2名分",
  },
  // 新居家具（未精算の特別財布）
  {
    transactionId: "seed-011",
    date: "2026-04-15",
    type: "支出",
    amount: 60000,
    actor: "A",
    category: "家具",
    wallet: "新居家具",
    shouldSettle: true,
    memo: "ソファ",
  },
  {
    transactionId: "seed-012",
    date: "2026-05-02",
    type: "支出",
    amount: 45000,
    actor: "B",
    category: "家電",
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
    actor: "A",
    category: "旅費",
    wallet: "結婚記念旅行",
    shouldSettle: true,
    memo: "京都温泉旅館",
  },
  // 2026-04通常 の履歴
  {
    transactionId: "seed-008",
    date: "2026-04-10",
    type: "支出",
    amount: 30000,
    actor: "A",
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
    actor: "B",
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
    actor: "A",
    category: "食費",
    wallet: "2026-04通常",
    shouldSettle: true,
    memo: "月末まとめ買い",
  },
];

export class MockStorage implements Storage {
  private ledger: StoredEntry[] = [...SEED_LEDGER];
  private users = new Map<string, string>([
    ["U_MOCK_USER_A", "A"],
    ["U_MOCK_USER_B", "B"],
  ]);
  private wallets: Wallet[] = [...SEED_WALLETS];
  private budgets: BudgetRecord[] = [...SEED_BUDGETS];

  async initialize(): Promise<void> {
    console.log("[MockStorage] 🗄️  初期化:");
    console.log(`  ${SHEET_NAMES.LEDGER}: ${this.ledger.length} 件`);
    console.log(`  ${SHEET_NAMES.USER_MASTER}: ${this.users.size} ユーザー`);
  }

  async appendLedgerEntries(entries: LedgerEntry[]): Promise<void> {
    for (const e of entries) {
      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      this.ledger.push({ transactionId: id, ...e });
      console.log(
        `[MockStorage] 📝 ${SHEET_NAMES.LEDGER}: ${id} | ${e.date} | ${e.type} | ¥${e.amount} | ${e.actor} | ${e.category} | ${e.wallet} | ${e.memo}`,
      );
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
      if (e.wallet === oldName) e.wallet = newName;
    }
    console.log(`[MockStorage] 💳 財布名変更: ${oldName} → ${newName}`);
  }

  async getLedgerEntriesByWallet(walletName: string): Promise<LedgerEntry[]> {
    return this.ledger.filter((e) => e.wallet === walletName);
  }

  async getLedgerEntriesForCalendar(
    walletName: string,
  ): Promise<LedgerEntryWithId[]> {
    return this.ledger
      .filter((e) => e.wallet === walletName)
      .map(({ transactionId, ...entry }) => ({ id: transactionId, ...entry }));
  }

  async updateLedgerEntryCategory(
    entryId: string,
    categoryName: string,
  ): Promise<void> {
    const entry = this.ledger.find((e) => e.transactionId === entryId);
    if (entry) {
      entry.category = categoryName;
      console.log(
        `[MockStorage] ✏️  カテゴリ更新: ${entryId} → ${categoryName}`,
      );
    }
  }

  async getLatestLedgerEntry(): Promise<{
    walletName: string;
    date: string;
  } | null> {
    if (this.ledger.length === 0) return null;
    const latest = this.ledger.reduce((prev, cur) =>
      cur.date > prev.date ? cur : prev,
    );
    return { walletName: latest.wallet, date: latest.date };
  }
}
