import { useLoaderData } from "react-router";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "~/components/ui/card";
import { PageLayout } from "~/components/layout/PageLayout";
import { unwrap } from "~/domain/result";
import { getSavingsData, type MonthlyBreakdown } from "~/features/savings/getSavingsData";
import { createStorage } from "~/infra/factory";
import { requireAuth } from "~/lib/auth";
import { getCurrentMonthJST } from "~/lib/date";
import type { Route } from "./+types/savings";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "ふたりの家計簿 | 貯金" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { env } = (context as { cloudflare: { env: Env } }).cloudflare;
  await requireAuth(request, env);
  const storage = createStorage(env);
  const currentMonth = getCurrentMonthJST();
  return { ...unwrap(await getSavingsData({ storage })), currentMonth };
}

// ---- ヒーローカード ----------------------------------------------------------

function HeroCard({ label, amount }: { label: string; amount: number }) {
  const isNegative = amount < 0;
  return (
    <Card className="flex-1 rounded-3xl gap-0 py-0 ring-1 ring-foreground/[0.06] shadow-[0_2px_24px_-12px_oklch(0.74_0.13_28_/_0.25)]">
      <div className="px-5 py-5 space-y-1">
        <p className="text-[11px] font-medium text-muted-foreground/80 tracking-wide">
          {label}
        </p>
        <p
          className={[
            "font-numeric tabular-nums font-extrabold text-[1.7rem] leading-none tracking-tight",
            isNegative ? "text-destructive" : "text-foreground",
          ].join(" ")}
        >
          {isNegative && (
            <span className="mr-0.5 align-baseline opacity-80">−</span>
          )}
          <span className="text-xl mr-0.5 align-baseline opacity-70">¥</span>
          {Math.abs(amount).toLocaleString()}
        </p>
      </div>
    </Card>
  );
}

// ---- グラフ用カスタム Tooltip -------------------------------------------------

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: MonthlyBreakdown }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const isOver = d.savedAmount < 0;
  return (
    <div className="bg-card border border-border/40 rounded-xl px-3 py-2.5 shadow-[0_2px_12px_-4px_oklch(0.30_0.02_30_/_0.15)] text-[12px] space-y-1">
      <p className="font-semibold text-foreground">{d.yearMonth}</p>
      <div className="space-y-0.5 text-muted-foreground">
        <p>予算 ¥{d.totalBudget.toLocaleString()}</p>
        <p>支出 ¥{d.normalSpending.toLocaleString()}</p>
      </div>
      <p className={["font-semibold", isOver ? "text-destructive" : "text-primary"].join(" ")}>
        節約 {isOver ? "−" : "+"}¥{Math.abs(d.savedAmount).toLocaleString()}
      </p>
    </div>
  );
}

// ---- 直近 N ヶ月リスト（新しい月が先頭）--------------------------------------

function buildRecentMonths(currentMonth: string, count: number): string[] {
  const [year, month] = currentMonth.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(year, month - 1 - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

const EMPTY_BREAKDOWN = (yearMonth: string): MonthlyBreakdown => ({
  yearMonth,
  totalIncome: 0,
  normalSpending: 0,
  totalBudget: 0,
  savedAmount: 0,
});

// ---- ページ -----------------------------------------------------------------

export default function SavingsPage() {
  const { estimatedBalance, totalSavings, monthlyBreakdowns, currentMonth } =
    useLoaderData<typeof loader>();

  const breakdownByMonth = Object.fromEntries(
    monthlyBreakdowns.map((b) => [b.yearMonth, b]),
  );

  const chartData = buildRecentMonths(currentMonth, 6)
    .reverse()
    .map((m) => breakdownByMonth[m] ?? EMPTY_BREAKDOWN(m));

  return (
    <PageLayout>
      {/* ページヘッダー（財布画面と同パターン） */}
      <div className="space-y-0.5 px-1">
        <h1 className="text-lg font-bold text-foreground">貯金</h1>
        <p className="text-xs text-muted-foreground">
          今までの貯金状況を整理します
        </p>
      </div>

      {/* ① ヒーロー: 口座残高と累計貯金額 */}
      <section className="flex gap-3">
        <HeroCard label="口座残高" amount={estimatedBalance} />
        <HeroCard label="累計貯金額" amount={totalSavings} />
      </section>

      {/* ② 月別節約額グラフ（直近6ヶ月・予算と支出の推移） */}
      <section className="space-y-3">
        <div className="flex items-center gap-3 px-1">
          <span className="h-px flex-1 bg-border" aria-hidden />
          <span className="text-[11px] font-semibold text-muted-foreground/70 tracking-wider">
            月別推移
          </span>
          <span className="h-px flex-1 bg-border" aria-hidden />
        </div>
        <Card className="rounded-3xl gap-0 py-0 ring-1 ring-foreground/[0.06] shadow-[0_2px_24px_-12px_oklch(0.30_0.02_30_/_0.10)]">
          <div className="px-4 pt-5 pb-3">
            <ResponsiveContainer width="100%" height={150}>
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
                barSize={14}
                barGap={2}
                barCategoryGap="28%"
              >
                <XAxis
                  dataKey="yearMonth"
                  tick={{ fontSize: 10, fill: "oklch(0.55 0.02 30)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis hide />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: "oklch(0.96 0.008 60 / 0.5)" }}
                />
                {/* 予算バー（薄色） */}
                <Bar
                  dataKey="totalBudget"
                  fill="oklch(0.90 0.008 60)"
                  radius={[3, 3, 0, 0]}
                />
                {/* 支出バー（超過時は警告色） */}
                <Bar dataKey="normalSpending" radius={[3, 3, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.yearMonth}
                      fill={
                        entry.totalBudget > 0 &&
                        entry.normalSpending > entry.totalBudget
                          ? "oklch(0.66 0.15 25)"
                          : "oklch(0.74 0.13 28)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* 凡例 */}
            <div className="flex gap-4 mt-1 px-1">
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span
                  className="size-2 rounded-sm"
                  style={{ backgroundColor: "oklch(0.90 0.008 60)" }}
                  aria-hidden
                />
                予算
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span
                  className="size-2 rounded-sm"
                  style={{ backgroundColor: "oklch(0.74 0.13 28)" }}
                  aria-hidden
                />
                支出
              </span>
            </div>
          </div>
        </Card>
      </section>
    </PageLayout>
  );
}
