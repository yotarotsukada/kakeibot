import { describe, expect, it } from "vitest";
import { getDashboardData } from "~/features/budget/dashboard";
import { createTestStorage } from "../helpers/storage";

const MONTH = "2026-01";
const WALLET = `${MONTH}通常`;

describe("getDashboardData", () => {
  it("予算と支出が正しく計算される", async () => {
    const storage = createTestStorage({
      wallets: [{ name: WALLET, type: "月次", settled: false }],
      budgets: [
        { walletName: WALLET, categoryName: "食費", amount: 50000 },
        { walletName: WALLET, categoryName: "日用品費", amount: 30000 },
      ],
      ledger: [
        { id: "1", date: "2026-01-05", type: "支出", amount: 20000, actor: "A", category: "食費", wallet: WALLET, shouldSettle: true, memo: "" },
        { id: "2", date: "2026-01-10", type: "支出", amount: 10000, actor: "B", category: "食費", wallet: WALLET, shouldSettle: true, memo: "" },
        { id: "3", date: "2026-01-15", type: "支出", amount: 5000, actor: "A", category: "日用品費", wallet: WALLET, shouldSettle: true, memo: "" },
      ],
    });

    const result = await getDashboardData({ storage, selectedMonth: MONTH });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { totalBudget, totalUsed, totalUsagePercentage, categoryUsages } = result.value;
    expect(totalBudget).toBe(80000);
    expect(totalUsed).toBe(35000);
    expect(totalUsagePercentage).toBe(44); // Math.round(35000/80000*100)

    const shokuhi = categoryUsages.find((c) => c.categoryName === "食費");
    expect(shokuhi?.usedAmount).toBe(30000);
    expect(shokuhi?.remainingAmount).toBe(20000);
    expect(shokuhi?.usagePercentage).toBe(60);

    const nichiyohin = categoryUsages.find((c) => c.categoryName === "日用品費");
    expect(nichiyohin?.usedAmount).toBe(5000);
    expect(nichiyohin?.remainingAmount).toBe(25000);
    expect(nichiyohin?.usagePercentage).toBe(17); // Math.round(5000/30000*100)
  });

  it("予算ゼロのカテゴリは usagePercentage が 0（NaN にならない）", async () => {
    const storage = createTestStorage({
      wallets: [{ name: WALLET, type: "月次", settled: false }],
      budgets: [{ walletName: WALLET, categoryName: "食費", amount: 0 }],
      ledger: [],
    });

    const result = await getDashboardData({ storage, selectedMonth: MONTH });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.categoryUsages[0].usagePercentage).toBe(0);
    expect(result.value.totalUsagePercentage).toBe(0);
  });

  it("予算超過時は usagePercentage が 100 超・remainingAmount が負になる", async () => {
    const storage = createTestStorage({
      wallets: [{ name: WALLET, type: "月次", settled: false }],
      budgets: [{ walletName: WALLET, categoryName: "食費", amount: 10000 }],
      ledger: [
        { id: "1", date: "2026-01-05", type: "支出", amount: 15000, actor: "A", category: "食費", wallet: WALLET, shouldSettle: true, memo: "" },
      ],
    });

    const result = await getDashboardData({ storage, selectedMonth: MONTH });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const shokuhi = result.value.categoryUsages.find((c) => c.categoryName === "食費");
    expect(shokuhi?.usagePercentage).toBe(150);
    expect(shokuhi?.remainingAmount).toBe(-5000);
  });

  it("予算カテゴリに紐付かない支出は miscUsed に集計される", async () => {
    const storage = createTestStorage({
      wallets: [{ name: WALLET, type: "月次", settled: false }],
      budgets: [{ walletName: WALLET, categoryName: "食費", amount: 50000 }],
      ledger: [
        { id: "1", date: "2026-01-05", type: "支出", amount: 3000, actor: "A", category: "医療費", wallet: WALLET, shouldSettle: true, memo: "" },
        { id: "2", date: "2026-01-10", type: "支出", amount: 2000, actor: "B", category: "その他", wallet: WALLET, shouldSettle: true, memo: "" },
      ],
    });

    const result = await getDashboardData({ storage, selectedMonth: MONTH });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.miscUsed).toBe(5000);
  });

  it("misc 支出がない場合 miscUsed は null", async () => {
    const storage = createTestStorage({
      wallets: [{ name: WALLET, type: "月次", settled: false }],
      budgets: [{ walletName: WALLET, categoryName: "食費", amount: 50000 }],
      ledger: [
        { id: "1", date: "2026-01-05", type: "支出", amount: 3000, actor: "A", category: "食費", wallet: WALLET, shouldSettle: true, memo: "" },
      ],
    });

    const result = await getDashboardData({ storage, selectedMonth: MONTH });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.miscUsed).toBeNull();
  });

  it("入金エントリは支出集計から除外される", async () => {
    const storage = createTestStorage({
      wallets: [{ name: WALLET, type: "月次", settled: false }],
      budgets: [{ walletName: WALLET, categoryName: "食費", amount: 50000 }],
      ledger: [
        { id: "1", date: "2026-01-05", type: "支出", amount: 10000, actor: "A", category: "食費", wallet: WALLET, shouldSettle: true, memo: "" },
        { id: "2", date: "2026-01-06", type: "入金", amount: 100000, actor: "A", category: "食費", wallet: WALLET, shouldSettle: true, memo: "" },
      ],
    });

    const result = await getDashboardData({ storage, selectedMonth: MONTH });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalUsed).toBe(10000);
  });

  it("通常財布が存在しない場合 normalWalletExists は false", async () => {
    const storage = createTestStorage({ wallets: [], budgets: [], ledger: [] });

    const result = await getDashboardData({ storage, selectedMonth: MONTH });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.normalWalletExists).toBe(false);
    expect(result.value.totalBudget).toBe(0);
  });

  it("未精算の特別財布が 4 件あるとき、最新活動順で上位 3 件に絞られる", async () => {
    const storage = createTestStorage({
      wallets: [
        { name: WALLET, type: "月次", settled: false },
        { name: "財布A", type: "特別", settled: false },
        { name: "財布B", type: "特別", settled: false },
        { name: "財布C", type: "特別", settled: false },
        { name: "財布D", type: "特別", settled: false },
      ],
      budgets: [],
      ledger: [
        { id: "a", date: "2026-01-01", type: "支出", amount: 1000, actor: "A", category: "一括", wallet: "財布A", shouldSettle: true, memo: "" },
        { id: "b", date: "2026-01-10", type: "支出", amount: 2000, actor: "A", category: "一括", wallet: "財布B", shouldSettle: true, memo: "" },
        { id: "c", date: "2026-01-20", type: "支出", amount: 3000, actor: "A", category: "一括", wallet: "財布C", shouldSettle: true, memo: "" },
        { id: "d", date: "2026-01-05", type: "支出", amount: 4000, actor: "A", category: "一括", wallet: "財布D", shouldSettle: true, memo: "" },
      ],
    });

    const result = await getDashboardData({ storage, selectedMonth: MONTH });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const names = result.value.recentWalletSummaries.map((w) => w.walletName);
    expect(names).toHaveLength(3);
    // 最新活動順: 財布C(01-20) > 財布B(01-10) > 財布D(01-05)
    expect(names[0]).toBe("財布C");
    expect(names[1]).toBe("財布B");
    expect(names[2]).toBe("財布D");
  });

  it("精算済みの特別財布は recentWalletSummaries に含まれない", async () => {
    const storage = createTestStorage({
      wallets: [
        { name: WALLET, type: "月次", settled: false },
        { name: "精算済み", type: "特別", settled: true },
      ],
      budgets: [],
      ledger: [
        { id: "1", date: "2026-01-15", type: "支出", amount: 5000, actor: "A", category: "一括", wallet: "精算済み", shouldSettle: true, memo: "" },
      ],
    });

    const result = await getDashboardData({ storage, selectedMonth: MONTH });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.recentWalletSummaries).toHaveLength(0);
  });

  it("特別財布の usagePercentage が正しく計算される", async () => {
    const storage = createTestStorage({
      wallets: [
        { name: WALLET, type: "月次", settled: false },
        { name: "旅行", type: "特別", settled: false },
      ],
      budgets: [
        { walletName: "旅行", categoryName: "一括", amount: 100000 },
      ],
      ledger: [
        { id: "1", date: "2026-01-10", type: "支出", amount: 40000, actor: "A", category: "一括", wallet: "旅行", shouldSettle: true, memo: "" },
      ],
    });

    const result = await getDashboardData({ storage, selectedMonth: MONTH });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const summary = result.value.recentWalletSummaries[0];
    expect(summary.totalBudget).toBe(100000);
    expect(summary.totalUsed).toBe(40000);
    expect(summary.usagePercentage).toBe(40);
  });
});
