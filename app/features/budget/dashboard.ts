import { type AppError, wrapUnknownError } from "~/domain/errors";
import { err, ok, type Result } from "~/domain/result";
import type { Storage } from "~/domain/storage";

export type CategoryUsage = {
  categoryName: string;
  budgetAmount: number;
  usedAmount: number;
  remainingAmount: number;
  usagePercentage: number;
};

export type WalletSummary = {
  walletName: string;
  totalBudget: number;
  totalUsed: number;
  usagePercentage: number;
};

export type DashboardCoreData = {
  normalWalletName: string;
  normalWalletExists: boolean;
  totalBudget: number;
  totalUsed: number;
  totalUsagePercentage: number;
  categoryUsages: CategoryUsage[];
  /** 未精算の特別財布サマリ（最新活動順、最大3件）。 */
  recentWalletSummaries: WalletSummary[];
  /** 予算カテゴリに紐付けられない支出の合計。該当なしのときは null。 */
  miscUsed: number | null;
};

export async function getDashboardData(deps: {
  storage: Storage;
  selectedMonth: string;
}): Promise<Result<DashboardCoreData, AppError>> {
  try {
    const normalWalletName = `${deps.selectedMonth}通常`;

    const [wallets, normalBudgets, normalEntries] = await Promise.all([
      deps.storage.getWallets(),
      deps.storage.getBudgetRecords(normalWalletName),
      deps.storage.getLedgerEntriesByWallet(normalWalletName),
    ]);

    const normalWalletExists = wallets.some((w) => w.name === normalWalletName);

    const categoryUsages: CategoryUsage[] = normalBudgets.map((budget) => {
      const usedAmount = normalEntries
        .filter((e) => e.category === budget.categoryName && e.type === "支出")
        .reduce((sum, e) => sum + e.amount, 0);
      const remainingAmount = budget.amount - usedAmount;
      const usagePercentage =
        budget.amount > 0 ? Math.round((usedAmount / budget.amount) * 100) : 0;
      return {
        categoryName: budget.categoryName,
        budgetAmount: budget.amount,
        usedAmount,
        remainingAmount,
        usagePercentage,
      };
    });

    const totalBudget = normalBudgets.reduce((sum, b) => sum + b.amount, 0);
    const totalUsed = categoryUsages.reduce((sum, c) => sum + c.usedAmount, 0);
    const totalUsagePercentage =
      totalBudget > 0 ? Math.round((totalUsed / totalBudget) * 100) : 0;

    const budgetCategoryNames = new Set(normalBudgets.map((b) => b.categoryName));
    const miscUsedAmount = normalEntries
      .filter((e) => e.type === "支出" && !budgetCategoryNames.has(e.category))
      .reduce((sum, e) => sum + e.amount, 0);
    const miscUsed = miscUsedAmount > 0 ? miscUsedAmount : null;

    // 未精算の特別財布を取得し、各財布の明細・予算を並列フェッチ
    const unsettledSpecialWallets = wallets.filter(
      (w) => w.type === "特別" && !w.settled,
    );

    const walletDataList = await Promise.all(
      unsettledSpecialWallets.map(async (w) => {
        const [entries, budgets] = await Promise.all([
          deps.storage.getLedgerEntriesByWallet(w.name),
          deps.storage.getBudgetRecords(w.name),
        ]);
        const latestDate =
          entries.length > 0
            ? entries.reduce((max, e) => (e.date > max ? e.date : max), "")
            : "";
        const totalUsed = entries
          .filter((e) => e.type === "支出")
          .reduce((sum, e) => sum + e.amount, 0);
        const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
        const usagePercentage =
          totalBudget > 0 ? Math.round((totalUsed / totalBudget) * 100) : 0;
        return {
          walletName: w.name,
          totalBudget,
          totalUsed,
          usagePercentage,
          latestDate,
        };
      }),
    );

    // 最新活動日降順でソートし、上位3件を取得
    const recentWalletSummaries: WalletSummary[] = walletDataList
      .sort((a, b) => (b.latestDate > a.latestDate ? 1 : -1))
      .slice(0, 3)
      .map(({ walletName, totalBudget, totalUsed, usagePercentage }) => ({
        walletName,
        totalBudget,
        totalUsed,
        usagePercentage,
      }));

    return ok({
      normalWalletName,
      normalWalletExists,
      totalBudget,
      totalUsed,
      totalUsagePercentage,
      categoryUsages,
      recentWalletSummaries,
      miscUsed,
    });
  } catch (e) {
    return err(wrapUnknownError(e));
  }
}
