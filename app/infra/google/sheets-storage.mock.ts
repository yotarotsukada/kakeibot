/**
 * インメモリモックストレージ（開発用）。
 */

import type { LedgerEntry } from "~/domain/ledger/entry";
import type { Storage } from "~/domain/storage";
import { SHEET_NAMES } from "~/domain/storage";

export class MockStorage implements Storage {
  private ledger: Array<LedgerEntry & { transactionId: string }> = [];
  private users = new Map<string, string>([
    ["U_MOCK_USER_A", "A"],
    ["U_MOCK_USER_B", "B"],
  ]);

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
}
