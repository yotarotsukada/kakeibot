import type { Wallet } from "~/domain/budget/budget";
import {
  type AppError,
  BusinessRuleError,
  ValidationError,
  wrapUnknownError,
} from "~/domain/errors";
import { err, ok, type Result } from "~/domain/result";
import type { SpendingEntryWithId, Storage, User } from "~/domain/storage";

/** 特別財布の精算結果（財布ごとに独立）。 */
export type WalletSettlement = {
  /** 精算対象の総支出（shouldSettle=true のみ）。 */
  total: number;
  /** 共同口座払い（actor がユーザー名でない支出）の合計。後から入金指示で賄う。 */
  poolSpending: number;
  perUser: {
    userName: string;
    /** その人が立替えた額（actor=その人 の支出合計）。 */
    advanced: number;
    /** 折半した負担額。最後のユーザーが端数を負担する。 */
    fairShare: number;
    /** 共同口座への入金指示額（0 以上）。 */
    deposit: number;
  }[];
  /** 立替超過者への個人間送金。発生しなければ null。 */
  transfer: { from: string; to: string; amount: number } | null;
};

export type SpecialWalletSummary = {
  wallet: Wallet;
  totalBudget: number;
  totalUsed: number;
  usagePercentage: number;
  settlement: WalletSettlement;
};

/**
 * 1 つの特別財布の精算を計算する。
 *
 * モデル: 総支出 S を折半した負担 Bᵢ と、各人の実拠出 Pᵢ（actor=個人 の立替）の差
 * netᵢ = Bᵢ − Pᵢ を求める。両者 netᵢ ≥ 0 なら各自 netᵢ を共同口座へ入金指示し、
 * 入金合計は共同口座払い分 S_pool に一致する。片方が立替超過（netᵢ < 0）なら、
 * その人が |netᵢ| を受け取り、相手が S_pool を入金しつつ |netᵢ| を個人間送金する。
 * プロダクトは 2 人前提のため、それ以外の人数・総支出 0 では精算なしを返す。
 */
export function computeWalletSettlement(
  entries: SpendingEntryWithId[],
  users: User[],
): WalletSettlement {
  const settleEntries = entries.filter((e) => e.shouldSettle);
  const total = settleEntries.reduce((sum, e) => sum + e.amount, 0);

  const numUsers = users.length;
  const perUser = numUsers > 0 ? Math.floor(total / numUsers) : 0;
  const remainder = total - perUser * numUsers;

  const userNames = new Set(users.map((u) => u.name));
  const poolSpending = settleEntries
    .filter((e) => !userNames.has(e.actor))
    .reduce((sum, e) => sum + e.amount, 0);

  const stats = users.map((user, i) => {
    const advanced = settleEntries
      .filter((e) => e.actor === user.name)
      .reduce((sum, e) => sum + e.amount, 0);
    const fairShare = i === numUsers - 1 ? perUser + remainder : perUser;
    return {
      userName: user.name,
      advanced,
      fairShare,
      net: fairShare - advanced,
    };
  });

  const noSettlement: WalletSettlement = {
    total,
    poolSpending,
    perUser: stats.map(({ userName, advanced, fairShare }) => ({
      userName,
      advanced,
      fairShare,
      deposit: 0,
    })),
    transfer: null,
  };

  if (numUsers !== 2 || total === 0) return noSettlement;

  const [a, b] = stats;
  let deposits: [number, number];
  let transfer: WalletSettlement["transfer"] = null;

  if (a.net >= 0 && b.net >= 0) {
    deposits = [a.net, b.net];
  } else if (a.net < 0) {
    // a が立替超過 → a が受取、b が共同口座分を入金 + 不足分を個人間送金
    deposits = [0, poolSpending];
    transfer = { from: b.userName, to: a.userName, amount: -a.net };
  } else {
    deposits = [poolSpending, 0];
    transfer = { from: a.userName, to: b.userName, amount: -b.net };
  }

  return {
    total,
    poolSpending,
    perUser: [
      {
        userName: a.userName,
        advanced: a.advanced,
        fairShare: a.fairShare,
        deposit: deposits[0],
      },
      {
        userName: b.userName,
        advanced: b.advanced,
        fairShare: b.fairShare,
        deposit: deposits[1],
      },
    ],
    transfer,
  };
}

export type SpecialWalletsPageData = {
  wallets: SpecialWalletSummary[];
};

export async function getSpecialWalletsPageData(deps: {
  storage: Storage;
}): Promise<Result<SpecialWalletsPageData, AppError>> {
  try {
    const [allWallets, users] = await Promise.all([
      deps.storage.getWallets(),
      deps.storage.getUsers(),
    ]);
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
        const totalBudget =
          budgetRecords[budgetRecords.length - 1]?.amount ?? 0;
        const usagePercentage =
          totalBudget > 0 ? Math.round((totalUsed / totalBudget) * 100) : 0;
        const latestDate =
          entries.length > 0
            ? entries.reduce((max, e) => (e.date > max ? e.date : max), "")
            : "";
        const settlement = computeWalletSettlement(entries, users);
        return {
          wallet,
          totalBudget,
          totalUsed,
          usagePercentage,
          latestDate,
          settlement,
        };
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
      ({ wallet, totalBudget, totalUsed, usagePercentage, settlement }) => ({
        wallet,
        totalBudget,
        totalUsed,
        usagePercentage,
        settlement,
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

export async function renameSpecialWallet(
  oldName: string,
  newName: string,
  deps: { storage: Storage },
): Promise<Result<void, AppError>> {
  const trimmedNew = newName.trim();
  if (!trimmedNew) {
    return err(
      new ValidationError({
        message: "newName is empty",
        userMessage: "財布名を入力してください。",
      }),
    );
  }
  if (oldName === trimmedNew) return ok(undefined);

  try {
    const wallets = await deps.storage.getWallets();
    if (wallets.some((w) => w.name === trimmedNew)) {
      return err(
        new BusinessRuleError({
          message: `wallet already exists: ${trimmedNew}`,
          userMessage: "同じ名前の財布がすでに存在します。",
          code: "WALLET_ALREADY_EXISTS",
        }),
      );
    }
    await deps.storage.renameWallet(oldName, trimmedNew);
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
  if (!walletName.trim()) {
    return err(
      new ValidationError({
        message: "walletName is empty",
        userMessage: "財布名を入力してください。",
      }),
    );
  }
  try {
    await deps.storage.setWalletSettled(walletName, settled);
    return ok(undefined);
  } catch (e) {
    return err(wrapUnknownError(e));
  }
}
