import { type AppError, wrapUnknownError } from "~/domain/errors";
import { err, ok, type Result } from "~/domain/result";
import type { MonthlyBalanceData, SavingsData } from "~/domain/savings/savings";
import type { Storage } from "~/domain/storage";

export async function getSavingsData(deps: {
  storage: Storage;
  months: string[];
}): Promise<Result<SavingsData, AppError>> {
  try {
    const monthDataList = await Promise.all(
      deps.months.map(async (yearMonth) => {
        const normalWalletName = `${yearMonth}通常`;
        const [allEntries, normalEntries, budgets] = await Promise.all([
          deps.storage.getLedgerEntriesByMonth(yearMonth),
          deps.storage.getLedgerEntriesByWallet(normalWalletName),
          deps.storage.getBudgetRecords(normalWalletName),
        ]);

        // 累計残高は全財布（特別財布の入金・支出も含む）
        const totalIncome = allEntries
          .filter((e) => e.type === "入金")
          .reduce((sum, e) => sum + e.amount, 0);
        const totalSpending = allEntries
          .filter((e) => e.type === "支出")
          .reduce((sum, e) => sum + e.amount, 0);

        // 貯金額は通常財布の予算 − 通常財布の支出のみ
        const normalWalletSpending = normalEntries
          .filter((e) => e.type === "支出")
          .reduce((sum, e) => sum + e.amount, 0);

        const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
        const savedAmount = totalBudget - normalWalletSpending;

        return {
          yearMonth,
          totalIncome,
          totalSpending,
          normalWalletSpending,
          totalBudget,
          savedAmount,
        };
      }),
    );

    const sorted = [...monthDataList].sort((a, b) =>
      a.yearMonth.localeCompare(b.yearMonth),
    );

    let running = 0;
    const months: MonthlyBalanceData[] = sorted.map((m) => {
      running += m.totalIncome - m.totalSpending;
      return { ...m, cumulativeBalance: running };
    });

    const totalSavedAmount = months
      .filter((m) => m.savedAmount > 0)
      .reduce((sum, m) => sum + m.savedAmount, 0);

    return ok({ months, totalSavedAmount });
  } catch (e) {
    return err(wrapUnknownError(e));
  }
}
