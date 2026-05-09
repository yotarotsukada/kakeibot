import { redirect, useActionData, useLoaderData } from "react-router";
import { AddCategoryForm } from "~/components/features/budget/AddCategoryForm";
import { BudgetOverviewCard } from "~/components/features/budget/BudgetOverviewCard";
import { CategoryEditRow } from "~/components/features/budget/CategoryEditRow";
import { getCategoryColor } from "~/components/features/wallet/categoryColors";
import { MonthSelector } from "~/components/features/wallet/MonthSelector";
import { PageLayout } from "~/components/layout/PageLayout";
import { Card } from "~/components/ui/card";
import { ValidationError } from "~/domain/errors";
import { unwrap } from "~/domain/result";
import {
  deleteBudget,
  getBudgetPageData,
  upsertBudget,
} from "~/features/budget/manage";
import { createStorage } from "~/infra/factory";
import {
  type ActionError,
  actionError,
  useActionErrorToast,
} from "~/lib/action-result";
import type { Route } from "./+types/budget";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "予算" }];
}

function getCurrentMonthJST(): string {
  const now = new Date();
  now.setUTCHours(now.getUTCHours() + 9);
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function getMonthRange(currentMonth: string): string[] {
  const [year, month] = currentMonth.split("-").map(Number);
  const months: string[] = [];
  for (let offset = -12; offset <= 1; offset++) {
    const d = new Date(year, month - 1 + offset, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    months.push(`${y}-${m}`);
  }
  return months;
}

function isValidMonth(month: string, range: string[]): boolean {
  return /^\d{4}-\d{2}$/.test(month) && range.includes(month);
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { env } = (context as { cloudflare: { env: Env } }).cloudflare;
  const storage = createStorage(env);

  const currentMonth = getCurrentMonthJST();
  const monthRange = getMonthRange(currentMonth);
  const url = new URL(request.url);
  const rawMonth = url.searchParams.get("month") ?? currentMonth;
  const selectedMonth = isValidMonth(rawMonth, monthRange)
    ? rawMonth
    : currentMonth;

  const data = unwrap(await getBudgetPageData(selectedMonth, { storage }));
  return { ...data, selectedMonth, currentMonth, monthRange };
}

export async function action({
  request,
  context,
}: Route.ActionArgs): Promise<ActionError | Response> {
  const { env } = (context as { cloudflare: { env: Env } }).cloudflare;
  const storage = createStorage(env);

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  const walletName = String(formData.get("walletName") ?? "");
  const month = String(formData.get("month") ?? "");

  if (intent === "upsert") {
    const categoryName = String(formData.get("categoryName") ?? "");
    const amount = Number(formData.get("amount"));
    const result = await upsertBudget(walletName, categoryName, amount, {
      storage,
    });
    if (!result.ok) return actionError(result.error);
    return redirect(`/budget?month=${month}`);
  }

  if (intent === "delete") {
    const categoryName = String(formData.get("categoryName") ?? "");
    const result = await deleteBudget(walletName, categoryName, { storage });
    if (!result.ok) return actionError(result.error);
    return redirect(`/budget?month=${month}`);
  }

  return actionError(
    new ValidationError({
      message: `unknown intent: ${intent}`,
      userMessage: "不明な操作です。画面を再読み込みしてください。",
    }),
  );
}

export default function BudgetPage() {
  const {
    walletName,
    budgetRecords,
    usedCategories,
    totalBudget,
    totalUsed,
    totalUsagePercentage,
    selectedMonth,
    monthRange,
  } = useLoaderData<typeof loader>();

  // action が失敗したときのみ ActionError が来る。redirect 成功時は undefined。
  const actionData = useActionData<typeof action>() as ActionError | undefined;
  useActionErrorToast(actionData);

  const currentIdx = monthRange.indexOf(selectedMonth);
  const prevMonth = currentIdx > 0 ? monthRange[currentIdx - 1] : null;
  const nextMonth =
    currentIdx < monthRange.length - 1 ? monthRange[currentIdx + 1] : null;

  return (
    <PageLayout>
      <MonthSelector
        selectedMonth={selectedMonth}
        prevMonth={prevMonth}
        nextMonth={nextMonth}
        basePath="/budget"
      />

      <BudgetOverviewCard
        walletName={walletName}
        budgetRecords={budgetRecords}
        totalBudget={totalBudget}
        totalUsed={totalUsed}
        totalUsagePercentage={totalUsagePercentage}
      />

      {/*
        編集リスト ＋ 新規追加 を一つのカードに統合。
        「設定フォーム」と「配分の表示エリア」が別カードで重複していた問題を解消。
      */}
      <Card className="rounded-3xl py-1 px-5 ring-1 ring-foreground/[0.06] shadow-[0_2px_24px_-12px_oklch(0.30_0.02_30_/_0.15)]">
        {budgetRecords.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            まだカテゴリがありません。下から追加してください。
          </p>
        ) : (
          <div className="divide-y divide-border/50">
            {budgetRecords.map((record, i) => (
              <CategoryEditRow
                key={`${selectedMonth}:${record.categoryName}`}
                record={record}
                walletName={walletName}
                selectedMonth={selectedMonth}
                color={getCategoryColor(i)}
                isUsed={usedCategories.includes(record.categoryName)}
              />
            ))}
          </div>
        )}
        <div
          className={
            budgetRecords.length > 0
              ? "border-t border-dashed border-border/70"
              : ""
          }
        >
          <AddCategoryForm
            walletName={walletName}
            selectedMonth={selectedMonth}
          />
        </div>
      </Card>
    </PageLayout>
  );
}
