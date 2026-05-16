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
        const [entries, budgets] = await Promise.all([
          deps.storage.getLedgerEntriesByMonth(yearMonth),
          deps.storage.getBudgetRecords(normalWalletName),
        ]);

        const totalIncome = entries
          .filter((e) => e.type === "入金")
          .reduce((sum, e) => sum + e.amount, 0);

        const totalSpending = entries
          .filter((e) => e.type === "支出")
          .reduce((sum, e) => sum + e.amount, 0);

        const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
        const savedAmount = totalBudget - totalSpending;

        return { yearMonth, totalIncome, totalSpending, totalBudget, savedAmount };
      }),
    );

    // 古い月から順に並べて累計残高を計算
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
