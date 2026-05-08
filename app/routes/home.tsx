import { Link, useLoaderData } from "react-router";
import type { CategoryUsage } from "~/features/budget/dashboard";
import { getDashboardData } from "~/features/budget/dashboard";
import { createStorage } from "~/infra/factory";
import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "家計ダッシュボード" }];
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

function buildMonthTabs(currentMonth: string): string[] {
  const [year, month] = currentMonth.split("-").map(Number);
  return [-3, -2, -1, 0].map((offset) => {
    const d = new Date(year, month - 1 + offset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

// ---- Loader ----

export async function loader({ request, context }: Route.LoaderArgs) {
  const { env } = (context as { cloudflare: { env: Env } }).cloudflare;
  const storage = createStorage(env);

  const currentMonth = getCurrentMonthJST();
  const monthTabs = buildMonthTabs(currentMonth);

  const url = new URL(request.url);
  const rawMonth = url.searchParams.get("month") ?? currentMonth;
  const selectedMonth = monthTabs.includes(rawMonth) ? rawMonth : currentMonth;

  const coreData = await getDashboardData({ storage, selectedMonth });
  return { ...coreData, currentMonth, selectedMonth, monthTabs };
}

// ---- UIコンポーネント ----

function ProgressBar({
  percentage,
  isOver,
  color,
}: {
  percentage: number;
  isOver: boolean;
  color?: string;
}) {
  const barColor = isOver ? "#f87171" : (color ?? "#3b82f6");
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${Math.min(percentage, 100)}%`,
          backgroundColor: barColor,
        }}
      />
    </div>
  );
}

function CategoryRow({
  usage,
  color,
}: {
  usage: CategoryUsage;
  color: string;
}) {
  const isOver = usage.remainingAmount < 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-sm text-gray-700 flex-1">
          {usage.categoryName}
        </span>
        <span className="text-xs text-gray-400 tabular-nums">
          {usage.usagePercentage}%
        </span>
        <span
          className={`text-sm font-semibold tabular-nums min-w-[5rem] text-right ${
            isOver ? "text-red-500" : "text-gray-700"
          }`}
        >
          {isOver
            ? `-¥${Math.abs(usage.remainingAmount).toLocaleString()}`
            : `残り ¥${usage.remainingAmount.toLocaleString()}`}
        </span>
      </div>
      <ProgressBar
        percentage={usage.usagePercentage}
        isOver={isOver}
        color={color}
      />
    </div>
  );
}

// ---- ページ本体 ----

export default function Home() {
  const {
    normalWalletName,
    normalWalletExists,
    totalBudget,
    totalUsed,
    totalUsagePercentage,
    categoryUsages,
    recentWalletSummary,
    selectedMonth,
    currentMonth,
    monthTabs,
  } = useLoaderData<typeof loader>();

  const totalIsOver = totalUsed > totalBudget;

  return (
    <div className="max-w-md mx-auto px-4 pt-5 pb-6 space-y-6">
      {/* ===== 通常財布エリア ===== */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 px-1 uppercase tracking-wider">
          通常財布
        </h2>

        {/* 月タブ — 通常財布に紐づく */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {monthTabs.map((month) => {
            const [, m] = month.split("-");
            const isSelected = month === selectedMonth;
            const to = month === currentMonth ? "/" : `/?month=${month}`;
            return (
              <Link
                key={month}
                to={to}
                className={`flex-1 text-center py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  isSelected
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {Number(m)}月
              </Link>
            );
          })}
        </div>

        {/* 通常財布カード */}
        {!normalWalletExists ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
            今月の通常財布が未設定です。スプレッドシートで作成してください。
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            {/* カードヘッダー */}
            <div className="px-5 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs text-gray-400">{normalWalletName}</p>
                <span
                  className={`text-2xl font-bold tabular-nums ${
                    totalIsOver ? "text-red-500" : "text-gray-900"
                  }`}
                >
                  {totalUsagePercentage}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    totalIsOver ? "bg-red-400" : "bg-blue-500"
                  }`}
                  style={{ width: `${Math.min(totalUsagePercentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 tabular-nums mt-2">
                <span>¥{totalUsed.toLocaleString()} 使用</span>
                <span>/ ¥{totalBudget.toLocaleString()}</span>
              </div>
            </div>

            {/* カテゴリ内訳 */}
            {categoryUsages.length === 0 ? (
              <div className="px-5 py-5 text-sm text-gray-400 text-center">
                予算が設定されていません。
                <Link to="/budget" className="text-blue-600 underline ml-1">
                  設定する
                </Link>
              </div>
            ) : (
              <div className="px-5 py-5 space-y-5">
                {categoryUsages.map((usage, i) => (
                  <CategoryRow
                    key={usage.categoryName}
                    usage={usage}
                    color={PALETTE[i % PALETTE.length]}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ===== 区切り ===== */}
      {recentWalletSummary && (
        <div className="flex items-center gap-3 -mx-4 px-4">
          <div className="flex-1 h-px bg-gray-200" />
        </div>
      )}

      {/* ===== 特別財布エリア ===== */}
      {recentWalletSummary && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 px-1 uppercase tracking-wider">
            特別財布
          </h2>
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <p className="text-base font-semibold text-gray-800">
                  {recentWalletSummary.walletName}
                </p>
                <span
                  className={`text-2xl font-bold tabular-nums ${
                    recentWalletSummary.totalUsed >
                    recentWalletSummary.totalBudget
                      ? "text-red-500"
                      : "text-gray-900"
                  }`}
                >
                  {recentWalletSummary.usagePercentage}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    recentWalletSummary.totalUsed >
                    recentWalletSummary.totalBudget
                      ? "bg-red-400"
                      : "bg-slate-400"
                  }`}
                  style={{
                    width: `${Math.min(recentWalletSummary.usagePercentage, 100)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 tabular-nums mt-2">
                <span>
                  ¥{recentWalletSummary.totalUsed.toLocaleString()} 使用
                </span>
                <span>
                  / ¥{recentWalletSummary.totalBudget.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
