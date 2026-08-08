import { useLoaderData } from "react-router";
import {
  Bar,
  Cell,
  ComposedChart,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageLayout } from "~/components/layout/PageLayout";
import { Card } from "~/components/ui/card";
import { unwrap } from "~/domain/result";
import {
  getSavingsData,
  type MonthlyBreakdown,
} from "~/features/savings/getSavingsData";
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

// ---- カラー定数 -------------------------------------------------------------

const COLOR_SAVINGS_POS = "oklch(0.74 0.13 28)"; // coral primary
const COLOR_SAVINGS_NEG = "oklch(0.66 0.15 25)"; // destructive

// ---- ヒーローカード ----------------------------------------------------------

function HeroCard({ label, amount }: { label: string; amount: number }) {
  const isNegative = amount < 0;
  return (
    <Card className="rounded-3xl gap-0 py-0 ring-1 ring-foreground/[0.06] shadow-[0_2px_24px_-12px_oklch(0.74_0.13_28_/_0.25)]">
      <div className="px-6 py-5">
        <p className="text-[11px] font-medium text-muted-foreground/80 tracking-wide mb-1">
          {label}
        </p>
        <p
          className={[
            "font-numeric tabular-nums font-extrabold text-[2rem] leading-none tracking-tight",
            isNegative ? "text-destructive" : "text-foreground",
          ].join(" ")}
        >
          {isNegative && (
            <span className="mr-0.5 align-baseline opacity-80">−</span>
          )}
          <span className="text-2xl mr-0.5 align-baseline opacity-70">¥</span>
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
  const isEmpty = d.totalBudget === 0 && d.normalSpending === 0;
  return (
    <div className="bg-card border border-border/40 rounded-xl px-3 py-2.5 shadow-[0_2px_12px_-4px_oklch(0.30_0.02_30_/_0.15)] text-[12px] space-y-1 min-w-[120px]">
      <p className="font-semibold text-foreground">{d.yearMonth}</p>
      {isEmpty ? (
        <p className="text-muted-foreground/60">データなし</p>
      ) : (
        <>
          <div className="space-y-0.5 text-muted-foreground">
            <p>予算 ¥{d.totalBudget.toLocaleString()}</p>
            <p>支出 ¥{d.normalSpending.toLocaleString()}</p>
          </div>
          <p
            className={[
              "font-semibold pt-0.5 border-t border-border/40",
              isOver ? "text-destructive" : "text-primary",
            ].join(" ")}
          >
            貯金 {isOver ? "−" : "+"}¥{Math.abs(d.savedAmount).toLocaleString()}
          </p>
        </>
      )}
    </div>
  );
}

// ---- 貯金額バーの金額ラベル ---------------------------------------------------

function SavedAmountLabel(props: {
  x?: number;
  y?: number;
  width?: number;
  value?: number;
}) {
  const { x, y, width, value } = props;
  if (
    x === undefined ||
    y === undefined ||
    width === undefined ||
    value === undefined
  ) {
    return null;
  }
  if (value === 0) return null;
  const isNegative = value < 0;
  const text = `${isNegative ? "−" : "+"}¥${Math.abs(value).toLocaleString()}`;
  // 正の値はバーの上、負の値はバーの下にラベルを置く
  const labelY = isNegative ? y + 14 : y - 6;
  return (
    <text
      x={x + width / 2}
      y={labelY}
      textAnchor="middle"
      fontSize={10}
      fontWeight={600}
      fill={isNegative ? COLOR_SAVINGS_NEG : COLOR_SAVINGS_POS}
    >
      {text}
    </text>
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

  const recentMonths = buildRecentMonths(currentMonth, 6).reverse();
  const chartData = recentMonths.map(
    (m) => breakdownByMonth[m] ?? EMPTY_BREAKDOWN(m),
  );

  return (
    <PageLayout>
      {/* ページヘッダー（財布画面と同パターン） */}
      <div className="space-y-0.5 px-1">
        <h1 className="text-lg font-bold text-foreground">貯金</h1>
        <p className="text-xs text-muted-foreground">
          今までの貯金状況を整理します
        </p>
      </div>

      {/* ① 累計貯金額（口座残高は参考情報として控えめに添える） */}
      <div className="space-y-2">
        <HeroCard label="累計貯金額" amount={totalSavings} />
        <p className="text-[11px] text-muted-foreground/60 px-2">
          口座残高の目安 {estimatedBalance < 0 && "−"}¥
          {Math.abs(estimatedBalance).toLocaleString()}
          （クレカ引き落とし未反映のため目安）
        </p>
      </div>

      {/* ② 月別推移グラフ */}
      <section className="space-y-3">
        <div className="flex items-center gap-3 px-1">
          <span className="h-px flex-1 bg-border" aria-hidden />
          <span className="text-[11px] font-semibold text-muted-foreground/70 tracking-wider">
            月別推移
          </span>
          <span className="h-px flex-1 bg-border" aria-hidden />
        </div>
        <Card className="rounded-3xl gap-0 py-0 ring-1 ring-foreground/[0.06] shadow-[0_2px_24px_-12px_oklch(0.30_0.02_30_/_0.10)]">
          <div className="px-4 pt-6 pb-4">
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart
                data={chartData}
                margin={{ top: 18, right: 8, bottom: 0, left: 8 }}
                barSize={20}
                barCategoryGap="38%"
              >
                <XAxis
                  dataKey="yearMonth"
                  tick={{ fontSize: 10, fill: "oklch(0.55 0.02 30)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis hide />
                <ReferenceLine
                  y={0}
                  stroke="oklch(0.93 0.008 60)"
                  strokeWidth={1}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: "oklch(0.96 0.008 60 / 0.5)" }}
                />

                {/* 貯金額バー（予算・支出はTooltipで確認する） */}
                <Bar dataKey="savedAmount" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.yearMonth}
                      fill={
                        entry.savedAmount >= 0
                          ? COLOR_SAVINGS_POS
                          : COLOR_SAVINGS_NEG
                      }
                    />
                  ))}
                  <LabelList
                    dataKey="savedAmount"
                    content={<SavedAmountLabel />}
                  />
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>
    </PageLayout>
  );
}
