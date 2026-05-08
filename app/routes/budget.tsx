import {
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
} from "react-router";
import { Cell, Pie, PieChart } from "recharts";
import type { BudgetRecord } from "~/domain/budget/budget";
import {
  deleteBudget,
  getBudgetPageData,
  upsertBudget,
} from "~/features/budget/manage";
import { createStorage } from "~/infra/factory";
import type { Route } from "./+types/budget";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "予算管理" }];
}

// ---- 定数 ----

const PALETTE = [
  "#3b82f6",
  "#10b981",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#f97316",
] as const;

// ---- ユーティリティ ----

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

// ---- Loader / Action ----

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

  const data = await getBudgetPageData(selectedMonth, { storage });
  return { ...data, selectedMonth, currentMonth, monthRange };
}

export async function action({ request, context }: Route.ActionArgs) {
  const { env } = (context as { cloudflare: { env: Env } }).cloudflare;
  const storage = createStorage(env);

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  const walletName = String(formData.get("walletName") ?? "");
  const month = String(formData.get("month") ?? "");

  if (intent === "upsert") {
    const categoryName = String(formData.get("categoryName") ?? "").trim();
    const amount = Number(formData.get("amount"));
    if (categoryName && !Number.isNaN(amount) && amount >= 0) {
      await upsertBudget(walletName, categoryName, amount, { storage });
    }
    return redirect(`/budget?month=${month}`);
  }

  if (intent === "delete") {
    const categoryName = String(formData.get("categoryName") ?? "");
    const result = await deleteBudget(walletName, categoryName, { storage });
    if (result.error) {
      return { error: result.error, month };
    }
    return redirect(`/budget?month=${month}`);
  }

  return redirect(`/budget?month=${month}`);
}

// ---- ドーナツチャート ----

function DonutChart({
  records,
  totalBudget,
  totalUsagePercentage,
}: {
  records: BudgetRecord[];
  totalBudget: number;
  totalUsagePercentage: number;
}) {
  const data = records
    .filter((rec) => rec.amount > 0 && totalBudget > 0)
    .map((rec, i) => ({
      name: rec.categoryName,
      value: rec.amount,
      color: PALETTE[i % PALETTE.length],
    }));

  const empty = data.length === 0;

  return (
    <div className="relative" style={{ width: 120, height: 120 }}>
      <PieChart width={120} height={120}>
        <Pie
          data={empty ? [{ name: "empty", value: 1, color: "#f3f4f6" }] : data}
          cx={60}
          cy={60}
          innerRadius={38}
          outerRadius={55}
          startAngle={90}
          endAngle={-270}
          paddingAngle={data.length > 1 ? 2 : 0}
          dataKey="value"
          isAnimationActive={false}
          stroke="none"
        >
          {(empty ? [{ name: "empty", color: "#f3f4f6" }] : data).map(
            (entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ),
          )}
        </Pie>
      </PieChart>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-base font-bold text-gray-900 tabular-nums leading-none">
          {totalUsagePercentage}%
        </span>
        <span className="text-[9px] text-gray-400 mt-0.5">使用率</span>
      </div>
    </div>
  );
}

// ---- ページコンポーネント ----

export default function BudgetPage() {
  const {
    walletName,
    budgetRecords,
    usedCategories,
    totalBudget,
    totalUsed,
    totalUsagePercentage,
    selectedMonth,
    currentMonth,
    monthRange,
  } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const currentIdx = monthRange.indexOf(selectedMonth);
  const prevMonth = currentIdx > 0 ? monthRange[currentIdx - 1] : null;
  const nextMonth =
    currentIdx < monthRange.length - 1 ? monthRange[currentIdx + 1] : null;
  const isCurrentMonth = selectedMonth === currentMonth;

  return (
    <div className="max-w-md mx-auto px-4 py-5 space-y-5">
      {/* 月ナビゲーション */}
      <div className="flex items-center bg-gray-50 rounded-xl px-4 py-3">
        <div className="w-28">
          {prevMonth && (
            <Link
              to={`/budget?month=${prevMonth}`}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              ← {prevMonth}
            </Link>
          )}
        </div>
        <span className="flex-1 text-center font-bold text-gray-900">
          {selectedMonth}
        </span>
        <div className="w-28 text-right">
          {nextMonth && (
            <Link
              to={`/budget?month=${nextMonth}`}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {nextMonth} →
            </Link>
          )}
        </div>
      </div>

      {/* 当月へ */}
      {!isCurrentMonth && (
        <div className="flex justify-center">
          <Link
            to="/budget"
            className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-full hover:bg-blue-700 font-medium"
          >
            今月へ戻る
          </Link>
        </div>
      )}

      {/* エラー */}
      {actionData && "error" in actionData && actionData.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
          {actionData.error}
        </div>
      )}

      {/* チャートカード */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center gap-4 px-5 pt-4 pb-3">
          <DonutChart
            records={budgetRecords}
            totalBudget={totalBudget}
            totalUsagePercentage={totalUsagePercentage}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 truncate">{walletName}</p>
            <p className="text-xl font-bold text-gray-900 tabular-nums mt-0.5">
              ¥{totalBudget.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 tabular-nums mt-0.5">
              使用 ¥{totalUsed.toLocaleString()}
            </p>
          </div>
        </div>

        {/* 凡例 */}
        {budgetRecords.length > 0 && (
          <div className="px-5 pb-4 space-y-1 border-t border-gray-50 pt-3">
            {budgetRecords.map((rec, i) => (
              <div key={rec.categoryName} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                />
                <span className="text-xs text-gray-600 flex-1">
                  {rec.categoryName}
                </span>
                <span className="text-xs tabular-nums text-gray-500">
                  ¥{rec.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 費目別編集リスト */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-400 px-1">費目別予算</p>
        {budgetRecords.length === 0 ? (
          <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-6 text-center text-sm text-gray-400">
            予算がまだ設定されていません
          </div>
        ) : (
          budgetRecords.map((record, i) => {
            const isUsed = usedCategories.includes(record.categoryName);
            return (
              <div
                key={record.categoryName}
                className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2.5 shadow-sm"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                />
                <span className="flex-1 text-sm font-medium text-gray-800">
                  {record.categoryName}
                </span>
                <Form method="post" className="flex items-center gap-1.5">
                  <input type="hidden" name="intent" value="upsert" />
                  <input type="hidden" name="walletName" value={walletName} />
                  <input type="hidden" name="month" value={selectedMonth} />
                  <input
                    type="hidden"
                    name="categoryName"
                    value={record.categoryName}
                  />
                  <input
                    type="number"
                    name="amount"
                    defaultValue={record.amount}
                    min={0}
                    className="w-24 text-right border border-gray-200 rounded-lg px-2 py-1 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                  <button
                    type="submit"
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    更新
                  </button>
                </Form>
                <Form method="post">
                  <input type="hidden" name="intent" value="delete" />
                  <input type="hidden" name="walletName" value={walletName} />
                  <input type="hidden" name="month" value={selectedMonth} />
                  <input
                    type="hidden"
                    name="categoryName"
                    value={record.categoryName}
                  />
                  <button
                    type="submit"
                    disabled={isUsed}
                    title={
                      isUsed ? "明細が紐づいているため削除できません" : "削除"
                    }
                    className="text-xs text-red-400 hover:text-red-600 disabled:text-gray-200 disabled:cursor-not-allowed"
                  >
                    削除
                  </button>
                </Form>
              </div>
            );
          })
        )}
      </div>

      {/* 新規追加 */}
      <div className="border border-dashed border-gray-200 rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-400">新規追加</p>
        <Form method="post" className="flex gap-2 items-center">
          <input type="hidden" name="intent" value="upsert" />
          <input type="hidden" name="walletName" value={walletName} />
          <input type="hidden" name="month" value={selectedMonth} />
          <input
            type="text"
            name="categoryName"
            placeholder="費目名"
            required
            className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <input
            type="number"
            name="amount"
            placeholder="金額"
            min={0}
            required
            className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-blue-700 font-medium"
          >
            追加
          </button>
        </Form>
        {budgetRecords.length > 0 && (
          <p className="text-xs text-gray-400">
            ※明細が紐づいている費目は削除できません
          </p>
        )}
      </div>
    </div>
  );
}
