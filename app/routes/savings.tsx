import { useLoaderData } from "react-router";
import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageLayout } from "~/components/layout/PageLayout";
import { unwrap } from "~/domain/result";
import { getSavingsData, type MonthlyBreakdown } from "~/features/savings/getSavingsData";
import { createStorage } from "~/infra/factory";
import { requireAuth } from "~/lib/auth";
import type { Route } from "./+types/savings";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "ふたりの家計簿 | 貯金" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { env } = (context as { cloudflare: { env: Env } }).cloudflare;
  await requireAuth(request, env);
  const storage = createStorage(env);
  return unwrap(await getSavingsData({ storage }));
}

// ---- ヒーローカード ----------------------------------------------------------

function HeroCard({
  label,
  amount,
  sub,
}: {
  label: string;
  amount: number;
  sub?: string;
}) {
  const isNegative = amount < 0;
  return (
    <div className="flex-1 bg-card rounded-3xl px-5 py-5 space-y-1 shadow-[0_2px_24px_-12px_oklch(0.74_0.13_28_/_0.25)]">
      <p className="text-[11px] font-medium text-muted-foreground tracking-wide">
        {label}
      </p>
      <p
        className={[
          "font-numeric tabular-nums font-extrabold text-[1.7rem] leading-none tracking-tight",
          isNegative ? "text-destructive" : "text-foreground",
        ].join(" ")}
      >
        <span className="text-xl mr-0.5 opacity-70">¥</span>
        {Math.abs(amount).toLocaleString()}
      </p>
      {sub && (
        <p className="text-[10px] text-muted-foreground/60">{sub}</p>
      )}
    </div>
  );
}

// ---- バーチャート用カスタム Tooltip --------------------------------------------

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { value: number; payload: MonthlyBreakdown }[];
}) {
  if (!active || !payload?.length) return null;
  const { value, payload: d } = payload[0];
  return (
    <div className="bg-card border border-border/40 rounded-xl px-3 py-2 shadow-[0_2px_12px_-4px_oklch(0.30_0.02_30_/_0.15)] text-[12px]">
      <p className="font-semibold text-foreground">{d.yearMonth}</p>
      <p className={value >= 0 ? "text-primary" : "text-destructive"}>
        節約 {value >= 0 ? "+" : ""}¥{value.toLocaleString()}
      </p>
    </div>
  );
}

// ---- 月別内訳カード ----------------------------------------------------------

function MonthlyCard({ breakdown }: { breakdown: MonthlyBreakdown }) {
  const { yearMonth, totalIncome, normalSpending, totalBudget, savedAmount } =
    breakdown;
  const isSaved = savedAmount >= 0;

  return (
    <div className="bg-card rounded-2xl px-4 py-4 space-y-3 border border-border/30 shadow-[0_1px_4px_-2px_oklch(0.30_0.02_30_/_0.08)]">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-foreground">{yearMonth}</p>
        <span
          className={[
            "text-[11px] font-bold px-2.5 py-0.5 rounded-full",
            isSaved
              ? "bg-emerald-100/70 text-emerald-700"
              : "bg-destructive/10 text-destructive",
          ].join(" ")}
        >
          {isSaved ? "+" : ""}¥{savedAmount.toLocaleString()}
        </span>
      </div>

      {/* 数値行 */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <MonthlyCell label="入金" amount={totalIncome} />
        <MonthlyCell label="通常支出" amount={normalSpending} />
        <MonthlyCell label="予算" amount={totalBudget} />
      </div>
    </div>
  );
}

function MonthlyCell({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="font-numeric tabular-nums text-[13px] font-semibold text-foreground">
        ¥{amount.toLocaleString()}
      </p>
    </div>
  );
}

// ---- ページ -----------------------------------------------------------------

export default function SavingsPage() {
  const { estimatedBalance, totalSavings, monthlyBreakdowns } =
    useLoaderData<typeof loader>();

  const chartData = monthlyBreakdowns.slice(0, 6).reverse();

  return (
    <PageLayout>
      {/* ① ヒーロー: 推定残高と累計貯金額 */}
      <section className="flex gap-3">
        <HeroCard
          label="推定残高"
          amount={estimatedBalance}
          sub="全入金 − 全支出（目安）"
        />
        <HeroCard
          label="累計貯金額"
          amount={totalSavings}
          sub="通常財布の節約の積み上げ"
        />
      </section>

      {/* ② 月別節約額グラフ（直近6ヶ月） */}
      {chartData.length > 0 && (
        <section className="bg-card rounded-3xl px-4 pt-5 pb-4 space-y-3 shadow-[0_2px_24px_-12px_oklch(0.30_0.02_30_/_0.10)]">
          <p className="text-[12px] font-medium text-muted-foreground">
            月別節約額（直近{chartData.length}ヶ月）
          </p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
              barSize={24}
            >
              <XAxis
                dataKey="yearMonth"
                tick={{ fontSize: 10, fill: "oklch(0.55 0.02 30)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis hide />
              <ReferenceLine y={0} stroke="oklch(0.93 0.008 60)" strokeWidth={1} />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ fill: "oklch(0.96 0.008 60 / 0.5)" }}
              />
              <Bar dataKey="savedAmount" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.yearMonth}
                    fill={
                      entry.savedAmount >= 0
                        ? "oklch(0.74 0.13 28)"
                        : "oklch(0.66 0.15 25)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* ③ 月別内訳リスト */}
      {monthlyBreakdowns.length > 0 ? (
        <section className="space-y-3">
          <p className="text-[12px] font-medium text-muted-foreground">月別内訳</p>
          {monthlyBreakdowns.map((breakdown) => (
            <MonthlyCard key={breakdown.yearMonth} breakdown={breakdown} />
          ))}
        </section>
      ) : (
        <section className="text-center py-12 text-muted-foreground text-sm">
          まだ通常財布のデータがありません
        </section>
      )}
    </PageLayout>
  );
}
