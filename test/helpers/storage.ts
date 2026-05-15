import type { BudgetRecord, Wallet } from "~/domain/budget/budget";
import type { LedgerEntry } from "~/domain/ledger/entry";
import type { LedgerEntryWithId, Storage, User } from "~/domain/storage";

type StoredEntry = LedgerEntry & { id: string };

type TestStorageInit = {
  wallets?: Wallet[];
  budgets?: BudgetRecord[];
  ledger?: StoredEntry[];
  users?: Record<string, string>;
};

/**
 * テスト専用のインメモリ Storage。SEED データを持たず、
 * init で渡したデータのみを初期状態とする。
 */
export function createTestStorage(init: TestStorageInit = {}): Storage {
  let wallets: Wallet[] = structuredClone(init.wallets ?? []);
  let budgets: BudgetRecord[] = structuredClone(init.budgets ?? []);
  const ledger: StoredEntry[] = structuredClone(init.ledger ?? []);
  const users = new Map(Object.entries(init.users ?? {}));
  let idSeq = 0;

  return {
    async initialize() {},

    async appendLedgerEntries(entries: LedgerEntry[]) {
      for (const e of entries) {
        ledger.push({ id: `added-${idSeq++}`, ...e });
      }
    },

    async findActorByLineUserId(lineUserId: string) {
      return users.get(lineUserId) ?? null;
    },

    async getBudgetRecords(walletName: string) {
      return budgets.filter((b) => b.walletName === walletName);
    },

    async upsertBudgetRecord(record: BudgetRecord) {
      const idx = budgets.findIndex(
        (b) =>
          b.walletName === record.walletName &&
          b.categoryName === record.categoryName,
      );
      if (idx >= 0) {
        budgets[idx] = record;
      } else {
        budgets.push(record);
      }
    },

    async deleteBudgetRecord(walletName: string, categoryName: string) {
      budgets = budgets.filter(
        (b) =>
          !(b.walletName === walletName && b.categoryName === categoryName),
      );
    },

    async getWallets() {
      return wallets;
    },

    async upsertWallet(wallet: Wallet) {
      const idx = wallets.findIndex((w) => w.name === wallet.name);
      if (idx >= 0) {
        wallets[idx] = wallet;
      } else {
        wallets.push(wallet);
      }
    },

    async renameWallet(oldName: string, newName: string) {
      const wallet = wallets.find((w) => w.name === oldName);
      if (wallet) wallet.name = newName;
      for (const b of budgets) {
        if (b.walletName === oldName) b.walletName = newName;
      }
      for (const e of ledger) {
        if (e.wallet === oldName) e.wallet = newName;
      }
    },

    async setWalletSettled(walletName: string, settled: boolean) {
      const wallet = wallets.find((w) => w.name === walletName);
      if (wallet) wallet.settled = settled;
    },

    async getLedgerEntriesByWallet(walletName: string) {
      return ledger
        .filter((e) => e.wallet === walletName)
        .map(({ id: _id, ...entry }) => entry);
    },

    async getLedgerEntriesForCalendar(walletName: string): Promise<LedgerEntryWithId[]> {
      return ledger
        .filter((e) => e.wallet === walletName)
        .map(({ id, ...entry }) => ({ id, ...entry }));
    },

    async getLedgerEntriesByMonth(yearMonth: string): Promise<LedgerEntryWithId[]> {
      return ledger
        .filter((e) => e.date.startsWith(yearMonth))
        .map(({ id, ...entry }) => ({ id, ...entry }));
    },

    async updateLedgerEntryCategory(entryId: string, categoryName: string) {
      const entry = ledger.find((e) => e.id === entryId);
      if (entry) entry.category = categoryName;
    },

    async updateLedgerEntryAttribution(
      entryId: string,
      walletName: string,
      categoryName: string,
    ) {
      const entry = ledger.find((e) => e.id === entryId);
      if (entry) {
        entry.wallet = walletName;
        entry.category = categoryName;
      }
    },

    async updateLedgerEntryActor(entryId: string, actor: string) {
      const entry = ledger.find((e) => e.id === entryId);
      if (entry) entry.actor = actor;
    },

    async getLatestLedgerEntry() {
      if (ledger.length === 0) return null;
      const latest = ledger.reduce((prev, cur) =>
        cur.date > prev.date ? cur : prev,
      );
      return { walletName: latest.wallet, date: latest.date };
    },

    async getUsers(): Promise<User[]> {
      return Array.from(users.entries()).map(([lineUserId, name]) => ({
        lineUserId,
        name,
      }));
    },
  };
}
