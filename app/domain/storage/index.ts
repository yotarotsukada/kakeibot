/**
 * ストレージ層のインターフェースとテーブル名定数。
 * 外部ライブラリへの依存禁止。
 */

import type { BudgetRecord, Wallet } from "~/domain/budget/budget";
import type { LedgerEntry } from "~/domain/ledger/entry";

export const SHEET_NAMES = {
  LEDGER: "元帳",
  USER_MASTER: "ユーザーマスタ",
  WALLET_MASTER: "財布マスタ",
  CATEGORY_MASTER: "カテゴリマスタ",
  BUDGET: "予算記録",
} as const;

export type SheetName = (typeof SHEET_NAMES)[keyof typeof SHEET_NAMES];

export interface Storage {
  initialize(): Promise<void>;
  appendLedgerEntries(entries: LedgerEntry[]): Promise<void>;
  findActorByLineUserId(lineUserId: string): Promise<string | null>;

  getBudgetRecords(walletName: string): Promise<BudgetRecord[]>;
  upsertBudgetRecord(record: BudgetRecord): Promise<void>;
  deleteBudgetRecord(walletName: string, categoryName: string): Promise<void>;
  getWallets(): Promise<Wallet[]>;
  getCategories(): Promise<string[]>;
  getLedgerEntriesByWallet(walletName: string): Promise<LedgerEntry[]>;
  getLatestLedgerEntry(): Promise<{ walletName: string; date: string } | null>;
}
