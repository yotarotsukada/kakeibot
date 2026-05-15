/**
 * ストレージ層のインターフェースとテーブル名定数。
 * 外部ライブラリへの依存禁止。
 */

import type { BudgetRecord, Wallet } from "~/domain/budget/budget";
import type { LedgerEntry } from "~/domain/ledger/entry";

export type User = {
  lineUserId: string;
  name: string;
};

export const SHEET_NAMES = {
  LEDGER: "元帳",
  USER_MASTER: "ユーザーマスタ",
  WALLET_MASTER: "財布マスタ",
  BUDGET: "予算記録",
} as const;

export type SheetName = (typeof SHEET_NAMES)[keyof typeof SHEET_NAMES];

export type LedgerEntryWithId = LedgerEntry & { id: string };

export interface Storage {
  initialize(): Promise<void>;
  appendLedgerEntries(entries: LedgerEntry[]): Promise<void>;
  findActorByLineUserId(lineUserId: string): Promise<string | null>;

  getBudgetRecords(walletName: string): Promise<BudgetRecord[]>;
  upsertBudgetRecord(record: BudgetRecord): Promise<void>;
  deleteBudgetRecord(walletName: string, categoryName: string): Promise<void>;
  getWallets(): Promise<Wallet[]>;
  upsertWallet(wallet: Wallet): Promise<void>;
  renameWallet(oldName: string, newName: string): Promise<void>;
  setWalletSettled(walletName: string, settled: boolean): Promise<void>;
  getLedgerEntriesByWallet(walletName: string): Promise<LedgerEntry[]>;
  getLatestLedgerEntry(): Promise<{ walletName: string; date: string } | null>;
  getLedgerEntriesForCalendar(walletName: string): Promise<LedgerEntryWithId[]>;
  getLedgerEntriesByMonth(yearMonth: string): Promise<LedgerEntryWithId[]>;
  updateLedgerEntryCategory(
    entryId: string,
    categoryName: string,
  ): Promise<void>;
  updateLedgerEntryAttribution(
    entryId: string,
    walletName: string,
    categoryName: string,
  ): Promise<void>;
  updateLedgerEntryActor(entryId: string, actor: string): Promise<void>;
  getUsers(): Promise<User[]>;
}
