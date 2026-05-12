import type { BudgetRecord } from "~/domain/budget/budget";
import {
  type AppError,
  BusinessRuleError,
  ValidationError,
  wrapUnknownError,
} from "~/domain/errors";
import { err, ok, type Result } from "~/domain/result";
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

/**
 * 予算ページ表示用データを取得する。
 *
 * features は throw せず Result を返す統一規約。
 * loader 側で `unwrap()` して AppError を ErrorBoundary に流す。
 */
export async function getBudgetPageData(
  month: string,
  deps: BudgetManageDeps,
): Promise<Result<BudgetPageData, AppError>> {
  try {
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

    return ok({
      walletName,
      budgetRecords,
      categories,
      usedCategories,
      totalBudget,
      totalUsed,
      totalUsagePercentage,
    });
  } catch (e) {
    return err(wrapUnknownError(e));
  }
}

/**
 * 予算カテゴリの新規作成・更新。
 *
 * mutation 系 feature は Result を返す。
 * インフラ層の AppError をここで捕まえて、想定外のみ throw する。
 */
export async function upsertBudget(
  walletName: string,
  categoryName: string,
  amount: number,
  deps: BudgetManageDeps,
): Promise<Result<void, AppError>> {
  if (!categoryName.trim()) {
    return err(
      new ValidationError({
        message: "categoryName is empty",
        userMessage: "カテゴリ名を入力してください。",
      }),
    );
  }
  if (!Number.isInteger(amount) || amount < 0) {
    return err(
      new ValidationError({
        message: `invalid amount: ${amount}`,
        userMessage: "金額は 0 以上の整数で入力してください。",
      }),
    );
  }

  try {
    await deps.storage.upsertBudgetRecord({
      walletName,
      categoryName: categoryName.trim(),
      amount,
    });
    return ok(undefined);
  } catch (e) {
    return err(wrapUnknownError(e));
  }
}

/**
 * 予算カテゴリの削除。
 *
 * ビジネスルール: 明細が紐づいているカテゴリは削除できない（ユーザー回復可能 → BusinessRuleError）。
 */
export async function deleteBudget(
  walletName: string,
  categoryName: string,
  deps: BudgetManageDeps,
): Promise<Result<void, AppError>> {
  try {
    const entries = await deps.storage.getLedgerEntriesByWallet(walletName);
    if (entries.some((e) => e.category === categoryName && e.type === "支出")) {
      return err(
        new BusinessRuleError({
          message: `cannot delete budget with ledger entries: ${walletName}/${categoryName}`,
          userMessage: "明細が紐づいている予算項目は削除できません。",
          code: "BUDGET_HAS_LEDGER_ENTRIES",
        }),
      );
    }
    await deps.storage.deleteBudgetRecord(walletName, categoryName);
    return ok(undefined);
  } catch (e) {
    return err(wrapUnknownError(e));
  }
}
