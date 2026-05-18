/**
 * ストレージ層のインターフェースとテーブル名定数。
 * 外部ライブラリへの依存禁止。
 */

import type { BudgetRecord, Wallet } from "~/domain/budget/budget";
import type {
  IncomeEntry,
  LedgerEntry,
  SpendingEntry,
} from "~/domain/ledger/entry";

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

/** ストレージから読み出した支出エントリ（ID付き）。 */
export type SpendingEntryWithId = SpendingEntry & { id: string };

/** ストレージから読み出した入金エントリ（ID付き）。 */
export type IncomeEntryWithId = IncomeEntry & { id: string };

/** ストレージから読み出した元帳エントリ（ID付き）。 */
export type LedgerEntryWithId = LedgerEntry & { id: string };

export interface Storage {
  initialize(): Promise<void>;

  /** 元帳にエントリを追記する。ID はストレージ層が生成する。 */
  appendLedgerEntries(entries: LedgerEntry[]): Promise<void>;

  findActorByLineUserId(lineUserId: string): Promise<string | null>;

  getBudgetRecords(walletName: string): Promise<BudgetRecord[]>;
  upsertBudgetRecord(record: BudgetRecord): Promise<void>;
  deleteBudgetRecord(walletName: string, categoryName: string): Promise<void>;

  getWallets(): Promise<Wallet[]>;
  upsertWallet(wallet: Wallet): Promise<void>;
  renameWallet(oldName: string, newName: string): Promise<void>;
  setWalletSettled(walletName: string, settled: boolean): Promise<void>;

  /**
   * 指定財布の支出エントリを返す。
   * 入金エントリは財布を持たないため支出のみが対象になる。
   */
  getLedgerEntriesByWallet(walletName: string): Promise<SpendingEntryWithId[]>;

  getLatestLedgerEntry(): Promise<{ walletName: string; date: string } | null>;

  /**
   * 指定財布の支出エントリをカレンダー表示用に返す。
   * 入金エントリは財布を持たないため支出のみが対象になる。
   */
  getLedgerEntriesForCalendar(
    walletName: string,
  ): Promise<SpendingEntryWithId[]>;

  /** 指定年月のすべてのエントリ（入金・支出）を返す。 */
  getLedgerEntriesByMonth(yearMonth: string): Promise<LedgerEntryWithId[]>;

  /** 全期間・全財布のすべてのエントリ（入金・支出）を返す（推定残高計算用）。 */
  getAllLedgerEntries(): Promise<LedgerEntryWithId[]>;

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
