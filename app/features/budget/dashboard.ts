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
  recentWalletSummary: WalletSummary | null;
};

export async function getDashboardData(deps: {
  storage: Storage;
  selectedMonth: string;
}): Promise<Result<DashboardCoreData, AppError>> {
  try {
    const normalWalletName = `${deps.selectedMonth}通常`;

    const [wallets, normalBudgets, normalEntries, latestEntry] =
      await Promise.all([
        deps.storage.getWallets(),
        deps.storage.getBudgetRecords(normalWalletName),
        deps.storage.getLedgerEntriesByWallet(normalWalletName),
        deps.storage.getLatestLedgerEntry(),
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

    const latestIsSpecial =
      latestEntry != null &&
      wallets.some(
        (w) => w.name === latestEntry.walletName && w.type === "一括",
      );

    let recentWalletSummary: WalletSummary | null = null;
    if (latestIsSpecial && latestEntry) {
      const [recentEntries, recentBudgets] = await Promise.all([
        deps.storage.getLedgerEntriesByWallet(latestEntry.walletName),
        deps.storage.getBudgetRecords(latestEntry.walletName),
      ]);
      const walletUsed = recentEntries
        .filter((e) => e.type === "支出")
        .reduce((sum, e) => sum + e.amount, 0);
      const walletBudget = recentBudgets.reduce((sum, b) => sum + b.amount, 0);
      const usagePercentage =
        walletBudget > 0 ? Math.round((walletUsed / walletBudget) * 100) : 0;
      recentWalletSummary = {
        walletName: latestEntry.walletName,
        totalBudget: walletBudget,
        totalUsed: walletUsed,
        usagePercentage,
      };
    }

    return ok({
      normalWalletName,
      normalWalletExists,
      totalBudget,
      totalUsed,
      totalUsagePercentage,
      categoryUsages,
      recentWalletSummary,
    });
  } catch (e) {
    return err(wrapUnknownError(e));
  }
}
