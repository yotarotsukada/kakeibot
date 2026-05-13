import { describe, expect, it } from "vitest";
import {
  createSpecialWallet,
  getSpecialWalletsPageData,
  renameSpecialWallet,
  toggleWalletSettled,
} from "~/features/budget/special-wallet";
import { createTestStorage } from "../helpers/storage";

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
    expect(wallets[0]).toEqual({ name: "新規旅行", type: "特別", settled: false });
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
        { id: "1", date: "2026-01-01", type: "支出", amount: 1000, actor: "A", category: "一括", wallet: "財布古い", shouldSettle: true, memo: "" },
        { id: "2", date: "2026-01-20", type: "支出", amount: 2000, actor: "A", category: "一括", wallet: "財布新しい", shouldSettle: true, memo: "" },
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
        { id: "1", date: "2026-01-10", type: "支出", amount: 50000, actor: "A", category: "一括", wallet: "旅行", shouldSettle: true, memo: "" },
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
});
