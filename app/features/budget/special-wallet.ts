import type { Wallet } from "~/domain/budget/budget";
import {
  AppError,
  BusinessRuleError,
  ValidationError,
  wrapUnknownError,
} from "~/domain/errors";
import { err, ok, type Result } from "~/domain/result";
import type { Storage } from "~/domain/storage";

export type SpecialWalletSummary = {
  wallet: Wallet;
  totalBudget: number;
  totalUsed: number;
  usagePercentage: number;
};

export type SpecialWalletsPageData = {
  wallets: SpecialWalletSummary[];
};

export async function getSpecialWalletsPageData(deps: {
  storage: Storage;
}): Promise<Result<SpecialWalletsPageData, AppError>> {
  try {
    const allWallets = await deps.storage.getWallets();
    const specialWallets = allWallets.filter((w) => w.type === "特別");

    const walletSummaries = await Promise.all(
      specialWallets.map(async (wallet) => {
        const [entries, budgetRecords] = await Promise.all([
          deps.storage.getLedgerEntriesByWallet(wallet.name),
          deps.storage.getBudgetRecords(wallet.name),
        ]);
        const totalUsed = entries
          .filter((e) => e.type === "支出")
          .reduce((sum, e) => sum + e.amount, 0);
        const totalBudget = budgetRecords.reduce((sum, b) => sum + b.amount, 0);
        const usagePercentage =
          totalBudget > 0 ? Math.round((totalUsed / totalBudget) * 100) : 0;
        const latestDate =
          entries.length > 0
            ? entries.reduce((max, e) => (e.date > max ? e.date : max), "")
            : "";
        return { wallet, totalBudget, totalUsed, usagePercentage, latestDate };
      }),
    );

    // 未精算を先に、その中で最新活動順。精算済みは後ろに最新活動順で続ける。
    const sorted = walletSummaries.sort((a, b) => {
      if (a.wallet.settled !== b.wallet.settled) {
        return a.wallet.settled ? 1 : -1;
      }
      return b.latestDate > a.latestDate ? 1 : -1;
    });

    const wallets = sorted.map(
      ({ wallet, totalBudget, totalUsed, usagePercentage }) => ({
        wallet,
        totalBudget,
        totalUsed,
        usagePercentage,
      }),
    );

    return ok({ wallets });
  } catch (e) {
    return err(wrapUnknownError(e));
  }
}

export async function createSpecialWallet(
  walletName: string,
  deps: { storage: Storage },
): Promise<Result<void, AppError>> {
  if (!walletName.trim()) {
    return err(
      new ValidationError({
        message: "walletName is empty",
        userMessage: "財布名を入力してください。",
      }),
    );
  }

  try {
    const wallets = await deps.storage.getWallets();
    if (wallets.some((w) => w.name === walletName.trim())) {
      return err(
        new BusinessRuleError({
          message: `wallet already exists: ${walletName}`,
          userMessage: "同じ名前の財布がすでに存在します。",
          code: "WALLET_ALREADY_EXISTS",
        }),
      );
    }

    await deps.storage.upsertWallet({
      name: walletName.trim(),
      type: "特別",
      settled: false,
    });
    return ok(undefined);
  } catch (e) {
    return err(wrapUnknownError(e));
  }
}

export async function toggleWalletSettled(
  walletName: string,
  settled: boolean,
  deps: { storage: Storage },
): Promise<Result<void, AppError>> {
  try {
    await deps.storage.setWalletSettled(walletName, settled);
    return ok(undefined);
  } catch (e) {
    return err(wrapUnknownError(e));
  }
}
