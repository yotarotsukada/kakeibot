/**
 * 貯金・残高ユースケース。
 *
 * 設計: docs/spec/savings.md
 *
 * 3つの概念を計算する:
 * - 推定残高: Σ全入金 − Σ全支出（全財布・全期間）
 * - 月別節約額: 通常財布の予算合計 − 通常財布の支出合計
 * - 累計貯金額: Σ月別節約額（通常財布のみ）
 */

import type { AppError } from "~/domain/errors";
import { wrapUnknownError } from "~/domain/errors";
import type { SpendingEntry } from "~/domain/ledger/entry";
import { err, ok, type Result } from "~/domain/result";
import type { Storage } from "~/domain/storage";

export type MonthlyBreakdown = {
  /** "YYYY-MM" 形式 */
  yearMonth: string;
  /** その月の全入金合計 */
  totalIncome: number;
  /** 通常財布の支出合計（特別財布を除く）*/
  normalSpending: number;
  /** 通常財布の予算合計 */
  totalBudget: number;
  /** 月別節約額 = totalBudget − normalSpending */
  savedAmount: number;
};

export type SavingsData = {
  /** 推定残高: Σ全入金 − Σ全支出（全財布・全期間） */
  estimatedBalance: number;
  /** 累計貯金額: Σ月別節約額（通常財布のみ・全期間） */
  totalSavings: number;
  /** 月別内訳（新しい月が先頭） */
  monthlyBreakdowns: MonthlyBreakdown[];
};

export async function getSavingsData(deps: {
  storage: Storage;
}): Promise<Result<SavingsData, AppError>> {
  try {
    const { storage } = deps;

    const [allEntries, wallets, users] = await Promise.all([
      storage.getAllLedgerEntries(),
      storage.getWallets(),
      storage.getUsers(),
    ]);

    // 個人ユーザー名セット: カレンダーと同じ判定（名前一致 = 立替、それ以外 = 共同）
    const userNames = new Set(users.map((u) => u.name));

    // 1. 推定残高: 全入金 − 共同支出（個人名 actor の立替支出は除外）
    const estimatedBalance =
      allEntries
        .filter((e) => e.type === "入金")
        .reduce((sum, e) => sum + e.amount, 0) -
      allEntries
        .filter((e) => e.type === "支出" && !userNames.has(e.actor))
        .reduce((sum, e) => sum + e.amount, 0);

    // 2. 通常財布（YYYY-MM通常）の年月一覧を取得
    const normalWalletMonths = wallets
      .filter(
        (w) => w.type === "月次" && /^\d{4}-\d{2}通常$/.test(w.name),
      )
      .map((w) => w.name.slice(0, 7)) // "YYYY-MM"
      .filter((v, i, arr) => arr.indexOf(v) === i) // 重複排除
      .sort()
      .reverse(); // 新しい月を先頭に

    // 3. 各月の内訳を計算
    const monthlyBreakdowns: MonthlyBreakdown[] = await Promise.all(
      normalWalletMonths.map(async (yearMonth) => {
        const normalWalletName = `${yearMonth}通常`;
        const [monthEntries, budgetRecords] = await Promise.all([
          storage.getLedgerEntriesByMonth(yearMonth),
          storage.getBudgetRecords(normalWalletName),
        ]);

        const totalIncome = monthEntries
          .filter((e) => e.type === "入金")
          .reduce((sum, e) => sum + e.amount, 0);

        const normalSpending = monthEntries
          .filter(
            (e): e is SpendingEntry & { id: string } =>
              e.type === "支出" && e.wallet === normalWalletName,
          )
          .reduce((sum, e) => sum + e.amount, 0);

        const totalBudget = budgetRecords.reduce((sum, b) => sum + b.amount, 0);
        const savedAmount = totalBudget - normalSpending;

        return { yearMonth, totalIncome, normalSpending, totalBudget, savedAmount };
      }),
    );

    const totalSavings = monthlyBreakdowns.reduce(
      (sum, m) => sum + m.savedAmount,
      0,
    );

    return ok({ estimatedBalance, totalSavings, monthlyBreakdowns });
  } catch (e) {
    return err(wrapUnknownError(e));
  }
}
