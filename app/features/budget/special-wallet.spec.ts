import { describe, expect, it } from "vitest";
import type { SpendingEntryWithId, User } from "~/domain/storage";
import {
  computeWalletSettlement,
  createSpecialWallet,
  getSpecialWalletsPageData,
  renameSpecialWallet,
  toggleWalletSettled,
} from "~/features/budget/special-wallet";
import { createTestStorage } from "../../../test/helpers/storage";

const USERS_AB: User[] = [
  { lineUserId: "U_A", name: "A" },
  { lineUserId: "U_B", name: "B" },
];

function spending(
  amount: number,
  actor: string,
  shouldSettle = true,
): SpendingEntryWithId {
  return {
    id: `e-${amount}-${actor}`,
    date: "2026-01-10",
    type: "支出",
    amount,
    actor,
    memo: "",
    wallet: "旅行",
    category: "一括",
    shouldSettle,
  };
}

describe("createSpecialWallet", () => {
  it("空の財布名は ValidationError を返す", async () => {
    const storage = createTestStorage();
    const result = await createSpecialWallet("", { storage });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("VALIDATION_ERROR");
  });

  it("スペースのみの財布名は ValidationError を返す", async () => {
    const storage = createTestStorage();
    const result = await createSpecialWallet("   ", { storage });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("VALIDATION_ERROR");
  });

  it("既存と同名の財布は WALLET_ALREADY_EXISTS を返す", async () => {
    const storage = createTestStorage({
      wallets: [{ name: "沖縄旅行", type: "特別", settled: false }],
    });
    const result = await createSpecialWallet("沖縄旅行", { storage });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("WALLET_ALREADY_EXISTS");
  });

  it("新しい財布名で特別財布が作成される", async () => {
    const storage = createTestStorage({ wallets: [] });
    const result = await createSpecialWallet("新規旅行", { storage });
    expect(result.ok).toBe(true);
    const wallets = await storage.getWallets();
    expect(wallets).toHaveLength(1);
    expect(wallets[0]).toEqual({
      name: "新規旅行",
      type: "特別",
      settled: false,
    });
  });

  it("前後スペースはトリミングされる", async () => {
    const storage = createTestStorage({ wallets: [] });
    await createSpecialWallet("  新規旅行  ", { storage });
    const wallets = await storage.getWallets();
    expect(wallets[0].name).toBe("新規旅行");
  });
});

describe("renameSpecialWallet", () => {
  it("空の新名称は ValidationError を返す", async () => {
    const storage = createTestStorage({
      wallets: [{ name: "旅行", type: "特別", settled: false }],
    });
    const result = await renameSpecialWallet("旅行", "", { storage });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("VALIDATION_ERROR");
  });

  it("同名へのリネームは ok を返す（no-op）", async () => {
    const storage = createTestStorage({
      wallets: [{ name: "旅行", type: "特別", settled: false }],
    });
    const result = await renameSpecialWallet("旅行", "旅行", { storage });
    expect(result.ok).toBe(true);
  });

  it("スペースのみ埋めの場合も no-op で ok（trimming 後に同名）", async () => {
    const storage = createTestStorage({
      wallets: [{ name: "旅行", type: "特別", settled: false }],
    });
    const result = await renameSpecialWallet("旅行", "  旅行  ", { storage });
    expect(result.ok).toBe(true);
  });

  it("既存名への変更は WALLET_ALREADY_EXISTS を返す", async () => {
    const storage = createTestStorage({
      wallets: [
        { name: "旅行A", type: "特別", settled: false },
        { name: "旅行B", type: "特別", settled: false },
      ],
    });
    const result = await renameSpecialWallet("旅行A", "旅行B", { storage });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("WALLET_ALREADY_EXISTS");
  });

  it("正常なリネームが実行される", async () => {
    const storage = createTestStorage({
      wallets: [{ name: "旧名前", type: "特別", settled: false }],
    });
    const result = await renameSpecialWallet("旧名前", "新名前", { storage });
    expect(result.ok).toBe(true);
    const wallets = await storage.getWallets();
    expect(wallets[0].name).toBe("新名前");
  });

  it("前後スペースはトリミングされて保存される", async () => {
    const storage = createTestStorage({
      wallets: [{ name: "旧名前", type: "特別", settled: false }],
    });
    await renameSpecialWallet("旧名前", "  新名前  ", { storage });
    const wallets = await storage.getWallets();
    expect(wallets[0].name).toBe("新名前");
  });
});

describe("toggleWalletSettled", () => {
  it("未精算 → 精算に変更できる", async () => {
    const storage = createTestStorage({
      wallets: [{ name: "旅行", type: "特別", settled: false }],
    });
    const result = await toggleWalletSettled("旅行", true, { storage });
    expect(result.ok).toBe(true);
    const wallets = await storage.getWallets();
    expect(wallets[0].settled).toBe(true);
  });

  it("精算済み → 未精算に戻せる", async () => {
    const storage = createTestStorage({
      wallets: [{ name: "旅行", type: "特別", settled: true }],
    });
    const result = await toggleWalletSettled("旅行", false, { storage });
    expect(result.ok).toBe(true);
    const wallets = await storage.getWallets();
    expect(wallets[0].settled).toBe(false);
  });

  it("空の財布名は ValidationError を返す", async () => {
    const storage = createTestStorage();
    const result = await toggleWalletSettled("", true, { storage });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("getSpecialWalletsPageData", () => {
  it("月次財布は結果に含まれない", async () => {
    const storage = createTestStorage({
      wallets: [
        { name: "月次財布", type: "月次", settled: false },
        { name: "特別財布", type: "特別", settled: false },
      ],
      budgets: [],
      ledger: [],
    });
    const result = await getSpecialWalletsPageData({ storage });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.wallets).toHaveLength(1);
    expect(result.value.wallets[0].wallet.name).toBe("特別財布");
  });

  it("未精算財布が精算済みより先に並ぶ", async () => {
    const storage = createTestStorage({
      wallets: [
        { name: "精算済み", type: "特別", settled: true },
        { name: "未精算", type: "特別", settled: false },
      ],
      budgets: [],
      ledger: [],
    });
    const result = await getSpecialWalletsPageData({ storage });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const names = result.value.wallets.map((w) => w.wallet.name);
    expect(names[0]).toBe("未精算");
    expect(names[1]).toBe("精算済み");
  });

  it("未精算財布は最新活動日の降順で並ぶ", async () => {
    const storage = createTestStorage({
      wallets: [
        { name: "財布古い", type: "特別", settled: false },
        { name: "財布新しい", type: "特別", settled: false },
      ],
      budgets: [],
      ledger: [
        {
          id: "1",
          date: "2026-01-01",
          type: "支出",
          amount: 1000,
          actor: "A",
          category: "一括",
          wallet: "財布古い",
          shouldSettle: true,
          memo: "",
        },
        {
          id: "2",
          date: "2026-01-20",
          type: "支出",
          amount: 2000,
          actor: "A",
          category: "一括",
          wallet: "財布新しい",
          shouldSettle: true,
          memo: "",
        },
      ],
    });
    const result = await getSpecialWalletsPageData({ storage });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.wallets[0].wallet.name).toBe("財布新しい");
    expect(result.value.wallets[1].wallet.name).toBe("財布古い");
  });

  it("usagePercentage が正しく計算される", async () => {
    const storage = createTestStorage({
      wallets: [{ name: "旅行", type: "特別", settled: false }],
      budgets: [{ walletName: "旅行", categoryName: "一括", amount: 200000 }],
      ledger: [
        {
          id: "1",
          date: "2026-01-10",
          type: "支出",
          amount: 50000,
          actor: "A",
          category: "一括",
          wallet: "旅行",
          shouldSettle: true,
          memo: "",
        },
      ],
    });
    const result = await getSpecialWalletsPageData({ storage });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const summary = result.value.wallets[0];
    expect(summary.totalBudget).toBe(200000);
    expect(summary.totalUsed).toBe(50000);
    expect(summary.usagePercentage).toBe(25);
  });

  it("予算ゼロの特別財布の usagePercentage は 0（NaN にならない）", async () => {
    const storage = createTestStorage({
      wallets: [{ name: "旅行", type: "特別", settled: false }],
      budgets: [],
      ledger: [],
    });
    const result = await getSpecialWalletsPageData({ storage });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.wallets[0].usagePercentage).toBe(0);
  });

  it("各財布に精算結果が付与される（共同口座払い＋一部立替）", async () => {
    const storage = createTestStorage({
      wallets: [{ name: "旅行", type: "特別", settled: false }],
      budgets: [],
      ledger: [
        {
          id: "1",
          date: "2026-01-10",
          type: "支出",
          amount: 40000,
          actor: "共同",
          category: "一括",
          wallet: "旅行",
          shouldSettle: true,
          memo: "",
        },
        {
          id: "2",
          date: "2026-01-11",
          type: "支出",
          amount: 20000,
          actor: "B",
          category: "一括",
          wallet: "旅行",
          shouldSettle: true,
          memo: "",
        },
      ],
      users: { U_A: "A", U_B: "B" },
    });
    const result = await getSpecialWalletsPageData({ storage });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { settlement } = result.value.wallets[0];
    expect(settlement.total).toBe(60000);
    expect(settlement.poolSpending).toBe(40000);
    expect(settlement.transfer).toBeNull();
    const a = settlement.perUser.find((u) => u.userName === "A")!;
    const b = settlement.perUser.find((u) => u.userName === "B")!;
    expect(a.deposit).toBe(30000);
    expect(b.deposit).toBe(10000);
  });
});

describe("computeWalletSettlement", () => {
  it("両者とも負担に満たない → 各自が共同口座へ入金（送金なし）", () => {
    // ホテル40000(共同), B食事20000 → S=60000, S_pool=40000
    const s = computeWalletSettlement(
      [spending(40000, "共同"), spending(20000, "B")],
      USERS_AB,
    );
    expect(s.total).toBe(60000);
    expect(s.poolSpending).toBe(40000);
    expect(s.transfer).toBeNull();
    const a = s.perUser.find((u) => u.userName === "A")!;
    const b = s.perUser.find((u) => u.userName === "B")!;
    expect(a).toMatchObject({ advanced: 0, fairShare: 30000, deposit: 30000 });
    expect(b).toMatchObject({
      advanced: 20000,
      fairShare: 30000,
      deposit: 10000,
    });
    // 入金合計は共同口座払いに一致する
    expect(a.deposit + b.deposit).toBe(s.poolSpending);
  });

  it("全額立替で片方が超過 → 個人間送金にフォールバック", () => {
    // A立替58000, B立替20000 → S=78000, S_pool=0
    const s = computeWalletSettlement(
      [spending(40000, "A"), spending(18000, "A"), spending(20000, "B")],
      USERS_AB,
    );
    expect(s.total).toBe(78000);
    expect(s.poolSpending).toBe(0);
    const a = s.perUser.find((u) => u.userName === "A")!;
    const b = s.perUser.find((u) => u.userName === "B")!;
    expect(a.deposit).toBe(0);
    expect(b.deposit).toBe(0);
    expect(s.transfer).toEqual({ from: "B", to: "A", amount: 19000 });
  });

  it("共同口座払いと立替超過の混在 → 入金指示と個人間送金の両方", () => {
    // 共同20000, A立替50000 → S=70000, S_pool=20000, fairShare=35000
    const s = computeWalletSettlement(
      [spending(20000, "共同"), spending(50000, "A")],
      USERS_AB,
    );
    expect(s.poolSpending).toBe(20000);
    const a = s.perUser.find((u) => u.userName === "A")!;
    const b = s.perUser.find((u) => u.userName === "B")!;
    // A は受取（deposit 0）、B は共同口座へ 20000 入金 + A へ 15000 送金
    expect(a.deposit).toBe(0);
    expect(b.deposit).toBe(20000);
    expect(s.transfer).toEqual({ from: "B", to: "A", amount: 15000 });
  });

  it("端数は最後のユーザーが負担する", () => {
    // S=15001 を折半 → A:7500, B(最後):7501
    const s = computeWalletSettlement([spending(15001, "共同")], USERS_AB);
    const a = s.perUser.find((u) => u.userName === "A")!;
    const b = s.perUser.find((u) => u.userName === "B")!;
    expect(a.fairShare).toBe(7500);
    expect(b.fairShare).toBe(7501);
    expect(a.deposit + b.deposit).toBe(15001);
  });

  it("shouldSettle=false の支出は総支出・負担から除外される", () => {
    const s = computeWalletSettlement(
      [spending(30000, "共同", true), spending(10000, "共同", false)],
      USERS_AB,
    );
    expect(s.total).toBe(30000);
    expect(s.poolSpending).toBe(30000);
    const a = s.perUser.find((u) => u.userName === "A")!;
    expect(a.fairShare).toBe(15000);
  });

  it("actor=共同 は立替に含めず共同口座払いとして扱う", () => {
    const s = computeWalletSettlement(
      [spending(50000, "共同"), spending(10000, "A")],
      USERS_AB,
    );
    expect(s.poolSpending).toBe(50000);
    const a = s.perUser.find((u) => u.userName === "A")!;
    expect(a.advanced).toBe(10000);
  });

  it("総支出が 0 のときは精算なし", () => {
    const s = computeWalletSettlement([], USERS_AB);
    expect(s.total).toBe(0);
    expect(s.transfer).toBeNull();
    expect(s.perUser.every((u) => u.deposit === 0)).toBe(true);
  });

  it("ユーザーが 2 人でないときは精算なし", () => {
    const s = computeWalletSettlement(
      [spending(10000, "A")],
      [{ lineUserId: "U_A", name: "A" }],
    );
    expect(s.transfer).toBeNull();
    expect(s.perUser.every((u) => u.deposit === 0)).toBe(true);
  });
});
