import { describe, expect, it } from "vitest";
import {
  copyBudgetFromPrevMonth,
  deleteBudget,
  getBudgetPageData,
  upsertBudget,
} from "~/features/budget/manage";
import { createTestStorage } from "../helpers/storage";

describe("upsertBudget", () => {
  it("空のカテゴリ名は ValidationError を返す", async () => {
    const storage = createTestStorage();
    const result = await upsertBudget("2026-01通常", "", 10000, { storage });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("VALIDATION_ERROR");
  });

  it("スペースのみのカテゴリ名は ValidationError を返す", async () => {
    const storage = createTestStorage();
    const result = await upsertBudget("2026-01通常", "   ", 10000, { storage });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("VALIDATION_ERROR");
  });

  it("負の金額は ValidationError を返す", async () => {
    const storage = createTestStorage();
    const result = await upsertBudget("2026-01通常", "食費", -1, { storage });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("VALIDATION_ERROR");
  });

  it("小数の金額は ValidationError を返す", async () => {
    const storage = createTestStorage();
    const result = await upsertBudget("2026-01通常", "食費", 1.5, { storage });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("VALIDATION_ERROR");
  });

  it("金額 0 は有効（バリデーションを通過する）", async () => {
    const storage = createTestStorage();
    const result = await upsertBudget("2026-01通常", "食費", 0, { storage });
    expect(result.ok).toBe(true);
  });

  it("正常な入力で予算が保存される", async () => {
    const storage = createTestStorage();
    const result = await upsertBudget("2026-01通常", "食費", 50000, { storage });
    expect(result.ok).toBe(true);
    const budgets = await storage.getBudgetRecords("2026-01通常");
    expect(budgets).toHaveLength(1);
    expect(budgets[0]).toEqual({ walletName: "2026-01通常", categoryName: "食費", amount: 50000 });
  });

  it("カテゴリ名の前後スペースはトリミングされる", async () => {
    const storage = createTestStorage();
    await upsertBudget("2026-01通常", "  食費  ", 50000, { storage });
    const budgets = await storage.getBudgetRecords("2026-01通常");
    expect(budgets[0].categoryName).toBe("食費");
  });

  it("既存カテゴリを上書き更新できる", async () => {
    const storage = createTestStorage({
      budgets: [{ walletName: "2026-01通常", categoryName: "食費", amount: 30000 }],
    });
    await upsertBudget("2026-01通常", "食費", 50000, { storage });
    const budgets = await storage.getBudgetRecords("2026-01通常");
    expect(budgets).toHaveLength(1);
    expect(budgets[0].amount).toBe(50000);
  });
});

describe("deleteBudget", () => {
  it("指定カテゴリの予算を削除できる", async () => {
    const storage = createTestStorage({
      budgets: [
        { walletName: "2026-01通常", categoryName: "食費", amount: 50000 },
        { walletName: "2026-01通常", categoryName: "日用品費", amount: 30000 },
      ],
    });
    const result = await deleteBudget("2026-01通常", "食費", { storage });
    expect(result.ok).toBe(true);
    const budgets = await storage.getBudgetRecords("2026-01通常");
    expect(budgets).toHaveLength(1);
    expect(budgets[0].categoryName).toBe("日用品費");
  });

  it("存在しないカテゴリの削除は ok を返す（冪等）", async () => {
    const storage = createTestStorage({ budgets: [] });
    const result = await deleteBudget("2026-01通常", "存在しない", { storage });
    expect(result.ok).toBe(true);
  });
});

describe("copyBudgetFromPrevMonth", () => {
  it("前月の予算を当月ウォレットにコピーする", async () => {
    const storage = createTestStorage({
      budgets: [
        { walletName: "2025-12通常", categoryName: "食費", amount: 48000 },
        { walletName: "2025-12通常", categoryName: "日用品費", amount: 28000 },
      ],
    });
    const result = await copyBudgetFromPrevMonth("2026-01通常", "2026-01", { storage });
    expect(result.ok).toBe(true);
    const budgets = await storage.getBudgetRecords("2026-01通常");
    expect(budgets).toHaveLength(2);
    expect(budgets.find((b) => b.categoryName === "食費")?.amount).toBe(48000);
    expect(budgets.find((b) => b.categoryName === "日用品費")?.amount).toBe(28000);
  });

  it("前月予算が存在しない場合は何もしない（no-op）", async () => {
    const storage = createTestStorage({ budgets: [] });
    const result = await copyBudgetFromPrevMonth("2026-01通常", "2026-01", { storage });
    expect(result.ok).toBe(true);
    const budgets = await storage.getBudgetRecords("2026-01通常");
    expect(budgets).toHaveLength(0);
  });

  it("1 月の前月は前年 12 月になる", async () => {
    const storage = createTestStorage({
      budgets: [
        { walletName: "2025-12通常", categoryName: "食費", amount: 48000 },
      ],
    });
    const result = await copyBudgetFromPrevMonth("2026-01通常", "2026-01", { storage });
    expect(result.ok).toBe(true);
    const budgets = await storage.getBudgetRecords("2026-01通常");
    expect(budgets[0].categoryName).toBe("食費");
  });

  it("既存の当月予算はコピーで上書きされる", async () => {
    const storage = createTestStorage({
      budgets: [
        { walletName: "2025-12通常", categoryName: "食費", amount: 48000 },
        { walletName: "2026-01通常", categoryName: "食費", amount: 20000 },
      ],
    });
    await copyBudgetFromPrevMonth("2026-01通常", "2026-01", { storage });
    const budgets = await storage.getBudgetRecords("2026-01通常");
    expect(budgets).toHaveLength(1);
    expect(budgets[0].amount).toBe(48000);
  });
});

describe("getBudgetPageData", () => {
  it("前月予算が存在すれば prevMonthBudgetExists は true", async () => {
    const storage = createTestStorage({
      budgets: [
        { walletName: "2025-12通常", categoryName: "食費", amount: 48000 },
      ],
    });
    const result = await getBudgetPageData("2026-01", { storage });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.prevMonthBudgetExists).toBe(true);
  });

  it("前月予算がなければ prevMonthBudgetExists は false", async () => {
    const storage = createTestStorage({ budgets: [] });
    const result = await getBudgetPageData("2026-01", { storage });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.prevMonthBudgetExists).toBe(false);
  });

  it("walletName は month + '通常'", async () => {
    const storage = createTestStorage();
    const result = await getBudgetPageData("2026-03", { storage });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.walletName).toBe("2026-03通常");
  });

  it("totalBudget は全予算額の合計", async () => {
    const storage = createTestStorage({
      budgets: [
        { walletName: "2026-01通常", categoryName: "食費", amount: 50000 },
        { walletName: "2026-01通常", categoryName: "日用品費", amount: 30000 },
      ],
    });
    const result = await getBudgetPageData("2026-01", { storage });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalBudget).toBe(80000);
  });

  it("usedCategories に支出のみ含まれ、重複なく返る", async () => {
    const storage = createTestStorage({
      ledger: [
        { id: "1", date: "2026-01-05", type: "支出", amount: 1000, actor: "A", category: "食費", wallet: "2026-01通常", shouldSettle: true, memo: "" },
        { id: "2", date: "2026-01-06", type: "支出", amount: 2000, actor: "B", category: "食費", wallet: "2026-01通常", shouldSettle: true, memo: "" },
        { id: "3", date: "2026-01-07", type: "支出", amount: 3000, actor: "A", category: "日用品費", wallet: "2026-01通常", shouldSettle: true, memo: "" },
        { id: "4", date: "2026-01-08", type: "入金", amount: 5000, actor: "A", category: "収入", wallet: "2026-01通常", shouldSettle: true, memo: "" },
      ],
    });
    const result = await getBudgetPageData("2026-01", { storage });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 入金は除外、食費は重複なし
    expect(result.value.usedCategories).toHaveLength(2);
    expect(result.value.usedCategories).toContain("食費");
    expect(result.value.usedCategories).toContain("日用品費");
    expect(result.value.usedCategories).not.toContain("収入");
  });

  it("予算記録は日本語カテゴリ名でソートされる", async () => {
    const storage = createTestStorage({
      budgets: [
        { walletName: "2026-01通常", categoryName: "日用品費", amount: 30000 },
        { walletName: "2026-01通常", categoryName: "食費", amount: 50000 },
        { walletName: "2026-01通常", categoryName: "交通費", amount: 10000 },
      ],
    });
    const result = await getBudgetPageData("2026-01", { storage });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const names = result.value.budgetRecords.map((b) => b.categoryName);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "ja")));
  });
});
