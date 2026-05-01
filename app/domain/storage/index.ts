/**
 * ストレージ層のインターフェースとテーブル名定数。
 * 外部ライブラリへの依存禁止。
 */

import type { LedgerEntry } from "~/domain/ledger/entry";

export const SHEET_NAMES = {
  LEDGER: "元帳",
  USER_MASTER: "ユーザーマスタ",
  WALLET_MASTER: "財布マスタ",
  CATEGORY_MASTER: "費目マスタ",
  BUDGET: "予算記録",
} as const;

export type SheetName = (typeof SHEET_NAMES)[keyof typeof SHEET_NAMES];

export interface Storage {
  initialize(): Promise<void>;
  appendLedgerEntries(entries: LedgerEntry[]): Promise<void>;
  findActorByLineUserId(lineUserId: string): Promise<string | null>;
}
