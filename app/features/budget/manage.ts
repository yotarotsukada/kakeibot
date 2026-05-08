import type { BudgetRecord } from "~/domain/budget/budget";
import type { Storage } from "~/domain/storage";

export type BudgetManageDeps = { storage: Storage };

export type BudgetPageData = {
  walletName: string;
  budgetRecords: BudgetRecord[];
  categories: string[];
  usedCategories: string[];
  totalBudget: number;
  totalUsed: number;
  totalUsagePercentage: number;
};

export async function getBudgetPageData(
  month: string,
  deps: BudgetManageDeps,
): Promise<BudgetPageData> {
  const walletName = `${month}通常`;
  const [budgetRecords, categories, ledgerEntries] = await Promise.all([
    deps.storage.getBudgetRecords(walletName),
    deps.storage.getCategories(),
    deps.storage.getLedgerEntriesByWallet(walletName),
  ]);

  const spendingByCategory: Record<string, number> = {};
  for (const e of ledgerEntries) {
    if (e.type === "支出") {
      spendingByCategory[e.category] =
        (spendingByCategory[e.category] ?? 0) + e.amount;
    }
  }

  const usedCategories = Object.keys(spendingByCategory);
  const totalBudget = budgetRecords.reduce((sum, r) => sum + r.amount, 0);
  const totalUsed = Object.values(spendingByCategory).reduce(
    (sum, v) => sum + v,
    0,
  );
  const totalUsagePercentage =
    totalBudget > 0 ? Math.round((totalUsed / totalBudget) * 100) : 0;

  return {
    walletName,
    budgetRecords,
    categories,
    usedCategories,
    totalBudget,
    totalUsed,
    totalUsagePercentage,
  };
}

export async function upsertBudget(
  walletName: string,
  categoryName: string,
  amount: number,
  deps: BudgetManageDeps,
): Promise<void> {
  await deps.storage.upsertBudgetRecord({ walletName, categoryName, amount });
}

export async function deleteBudget(
  walletName: string,
  categoryName: string,
  deps: BudgetManageDeps,
): Promise<{ error?: string }> {
  const entries = await deps.storage.getLedgerEntriesByWallet(walletName);
  if (entries.some((e) => e.category === categoryName && e.type === "支出")) {
    return { error: "明細が紐づいている予算項目は削除できません" };
  }
  await deps.storage.deleteBudgetRecord(walletName, categoryName);
  return {};
}
