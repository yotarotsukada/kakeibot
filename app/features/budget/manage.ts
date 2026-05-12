import type { BudgetRecord } from "~/domain/budget/budget";
import {
  type AppError,
  ValidationError,
  wrapUnknownError,
} from "~/domain/errors";
import { err, ok, type Result } from "~/domain/result";
import type { Storage } from "~/domain/storage";

export type BudgetManageDeps = { storage: Storage };

export type BudgetPageData = {
  walletName: string;
  budgetRecords: BudgetRecord[];
  totalBudget: number;
  prevMonthBudgetExists: boolean;
  usedCategories: string[];
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
    const prevMonthWalletName = `${getPrevMonth(month)}通常`;

    const [budgetRecords, prevMonthRecords, ledgerEntries] = await Promise.all([
      deps.storage.getBudgetRecords(walletName),
      deps.storage.getBudgetRecords(prevMonthWalletName),
      deps.storage.getLedgerEntriesByWallet(walletName),
    ]);

    budgetRecords.sort((a, b) =>
      a.categoryName.localeCompare(b.categoryName, "ja"),
    );
    const totalBudget = budgetRecords.reduce((sum, r) => sum + r.amount, 0);
    const prevMonthBudgetExists = prevMonthRecords.length > 0;
    const usedCategories = [
      ...new Set(
        ledgerEntries.filter((e) => e.type === "支出").map((e) => e.category),
      ),
    ];

    return ok({
      walletName,
      budgetRecords,
      totalBudget,
      prevMonthBudgetExists,
      usedCategories,
    });
  } catch (e) {
    return err(wrapUnknownError(e));
  }
}

function getPrevMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(year, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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

export async function deleteBudget(
  walletName: string,
  categoryName: string,
  deps: BudgetManageDeps,
): Promise<Result<void, AppError>> {
  try {
    await deps.storage.deleteBudgetRecord(walletName, categoryName);
    return ok(undefined);
  } catch (e) {
    return err(wrapUnknownError(e));
  }
}

export async function copyBudgetFromPrevMonth(
  walletName: string,
  month: string,
  deps: BudgetManageDeps,
): Promise<Result<void, AppError>> {
  try {
    const prevMonthWalletName = `${getPrevMonth(month)}通常`;
    const prevRecords =
      await deps.storage.getBudgetRecords(prevMonthWalletName);
    await Promise.all(
      prevRecords.map((r) =>
        deps.storage.upsertBudgetRecord({ ...r, walletName }),
      ),
    );
    return ok(undefined);
  } catch (e) {
    return err(wrapUnknownError(e));
  }
}
