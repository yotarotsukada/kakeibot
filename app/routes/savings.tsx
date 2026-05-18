import { useEffect, useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import {
  Bar,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "~/components/ui/card";
import { PageLayout } from "~/components/layout/PageLayout";
import type { SavingsDepositEntry, SavingsAllocationEntry } from "~/domain/ledger/entry";
import { unwrap } from "~/domain/result";
import { getSavingsData, type MonthlyBreakdown } from "~/features/savings/getSavingsData";
import { createStorage } from "~/infra/factory";
import { requireAuth } from "~/lib/auth";
import { getCurrentMonthJST } from "~/lib/date";
import type { Route } from "./+types/savings";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "ふたりの家計簿 | 貯金" }];
}

export async function action({ request, context }: Route.ActionArgs) {
  const { env } = (context as { cloudflare: { env: Env } }).cloudflare;
  await requireAuth(request, env);
  const formData = await request.formData();
  if (formData.get("intent") !== "addSavingsEntry") {
    return { ok: false };
  }
  const rawType = String(formData.get("type"));
  if (rawType !== "積立" && rawType !== "配分") {
    return { ok: false };
  }
  const rawAmount = Number(formData.get("amount"));
  if (!rawAmount || rawAmount <= 0) {
    return { ok: false };
  }
  const storage = createStorage(env);
  const baseFields = {
    date: String(formData.get("date")),
    amount: Math.floor(rawAmount),
    actor: "共同",
    memo: String(formData.get("memo")),
  };
  const entry: SavingsDepositEntry | SavingsAllocationEntry =
    rawType === "積立"
      ? { type: "積立", ...baseFields }
      : { type: "配分", ...baseFields };
  await storage.appendLedgerEntries([entry]);
  return { ok: true };
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { env } = (context as { cloudflare: { env: Env } }).cloudflare;
  await requireAuth(request, env);
  const storage = createStorage(env);
  const currentMonth = getCurrentMonthJST();
  const now = new Date();
  now.setUTCHours(now.getUTCHours() + 9);
  const today = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
  return { ...unwrap(await getSavingsData({ storage })), currentMonth, today };
}

// ---- カラー定数 -------------------------------------------------------------

const COLOR_SAVINGS_POS = "oklch(0.74 0.13 28)";   // coral primary
const COLOR_SAVINGS_NEG = "oklch(0.66 0.15 25)";   // destructive
const COLOR_BUDGET      = "oklch(0.72 0.10 230)";  // sora blue
const COLOR_SPENDING    = "oklch(0.78 0.11 60)";   // apricot

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

function PoolHeroCard({
  amount,
  totalSavings,
  totalDeposits,
  totalAllocations,
}: {
  amount: number;
  totalSavings: number;
  totalDeposits: number;
  totalAllocations: number;
}) {
  const isNegative = amount < 0;
  const hasSub = totalSavings !== 0 || totalDeposits !== 0 || totalAllocations !== 0;
  return (
    <Card className="rounded-3xl gap-0 py-0 ring-1 ring-foreground/[0.06] shadow-[0_2px_24px_-12px_oklch(0.74_0.13_28_/_0.25)]">
      <div className="px-6 py-5">
        <p className="text-[11px] font-medium text-muted-foreground/80 tracking-wide mb-1">
          貯金プール合計
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
        {hasSub && (
          <p className="text-[11px] text-muted-foreground/60 mt-1.5 tabular-nums">
            節約 ¥{totalSavings.toLocaleString()}
            {totalDeposits > 0 && ` ＋ 積立 ¥${totalDeposits.toLocaleString()}`}
            {totalAllocations > 0 && ` − 配分 ¥${totalAllocations.toLocaleString()}`}
          </p>
        )}
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
          <p className={["font-semibold pt-0.5 border-t border-border/40", isOver ? "text-destructive" : "text-primary"].join(" ")}>
            貯金 {isOver ? "−" : "+"}¥{Math.abs(d.savedAmount).toLocaleString()}
          </p>
        </>
      )}
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
  const {
    estimatedBalance,
    totalSavings,
    savingsPoolTotal,
    deposits,
    allocations,
    monthlyBreakdowns,
    currentMonth,
    today,
  } = useLoaderData<typeof loader>();

  const breakdownByMonth = Object.fromEntries(
    monthlyBreakdowns.map((b) => [b.yearMonth, b]),
  );

  const chartData = buildRecentMonths(currentMonth, 6)
    .reverse()
    .map((m) => breakdownByMonth[m] ?? EMPTY_BREAKDOWN(m));

  const totalDeposits = deposits.reduce((sum, e) => sum + e.amount, 0);
  const totalAllocations = allocations.reduce((sum, e) => sum + e.amount, 0);

  const poolEntries = [...deposits, ...allocations].sort((a, b) =>
    b.date.localeCompare(a.date),
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

      {/* ① 貯金プール合計（メイン） */}
      <PoolHeroCard
        amount={savingsPoolTotal}
        totalSavings={totalSavings}
        totalDeposits={totalDeposits}
        totalAllocations={totalAllocations}
      />

      {/* ② 口座残高（サブ） */}
      <HeroCard label="口座残高" amount={estimatedBalance} />

      {/* ③ 月別推移グラフ */}
      <section className="space-y-3">
        <div className="flex items-center gap-3 px-1">
          <span className="h-px flex-1 bg-border" aria-hidden />
          <span className="text-[11px] font-semibold text-muted-foreground/70 tracking-wider">
            月別推移
          </span>
          <span className="h-px flex-1 bg-border" aria-hidden />
        </div>
        <Card className="rounded-3xl gap-0 py-0 ring-1 ring-foreground/[0.06] shadow-[0_2px_24px_-12px_oklch(0.30_0.02_30_/_0.10)]">
          <div className="px-4 pt-5 pb-4">
            <ResponsiveContainer width="100%" height={160}>
              <ComposedChart
                data={chartData}
                margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
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

                {/* 貯金額バー（メイン） */}
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
                </Bar>

                {/* 予算ライン */}
                <Line
                  type="monotone"
                  dataKey="totalBudget"
                  stroke={COLOR_BUDGET}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3, fill: COLOR_BUDGET }}
                />

                {/* 支出ライン */}
                <Line
                  type="monotone"
                  dataKey="normalSpending"
                  stroke={COLOR_SPENDING}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3, fill: COLOR_SPENDING }}
                />
              </ComposedChart>
            </ResponsiveContainer>

            {/* 凡例 */}
            <div className="flex items-center gap-5 mt-2 px-1">
              <LegendBar color={COLOR_SAVINGS_POS} label="貯金額" />
              <LegendLine color={COLOR_BUDGET} label="予算" />
              <LegendLine color={COLOR_SPENDING} label="支出" />
            </div>
          </div>
        </Card>
      </section>

      {/* ④ 積立・配分 */}
      <section className="space-y-3">
        <div className="flex items-center gap-3 px-1">
          <span className="h-px flex-1 bg-border" aria-hidden />
          <span className="text-[11px] font-semibold text-muted-foreground/70 tracking-wider">
            積立・配分
          </span>
          <span className="h-px flex-1 bg-border" aria-hidden />
        </div>
        <Card className="rounded-3xl gap-0 py-0 ring-1 ring-foreground/[0.06] shadow-[0_2px_24px_-12px_oklch(0.30_0.02_30_/_0.10)]">
          <div className="px-5 pt-4 pb-5 space-y-1">
            {poolEntries.length > 0 && (
              <div className="mb-3 divide-y divide-border/40">
                {poolEntries.map((entry) => (
                  <PoolOperationRow key={entry.id} entry={entry} />
                ))}
              </div>
            )}
            <SavingsEntryForm today={today} />
          </div>
        </Card>
      </section>
    </PageLayout>
  );
}

// ---- 積立・配分 行コンポーネント -------------------------------------------

type PoolEntry = { id: string; date: string; type: "積立" | "配分"; amount: number; memo: string };

function PoolOperationRow({ entry }: { entry: PoolEntry }) {
  const isDeposit = entry.type === "積立";
  const [, m, d] = entry.date.split("-");
  return (
    <div className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      <span className="text-[11px] text-muted-foreground/60 w-9 shrink-0 tabular-nums">
        {parseInt(m)}/{parseInt(d)}
      </span>
      <span
        className="font-numeric tabular-nums text-sm font-semibold shrink-0 w-28"
        style={{ color: isDeposit ? "oklch(0.60 0.14 160)" : "oklch(0.66 0.15 25)" }}
      >
        {isDeposit ? "+" : "−"}¥{entry.amount.toLocaleString()}
      </span>
      <span className="text-sm text-foreground/70 flex-1 truncate">{entry.memo}</span>
    </div>
  );
}

// ---- 積立・配分 追加フォーム ------------------------------------------------

function SavingsEntryForm({ today }: { today: string }) {
  const fetcher = useFetcher();
  const [entryType, setEntryType] = useState<"積立" | "配分">("積立");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [date, setDate] = useState(today);

  const isSubmitting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data != null) {
      setAmount("");
      setMemo("");
    }
  }, [fetcher.state, fetcher.data]);

  const isDirty = amount !== "";

  return (
    <fetcher.Form method="post" className="space-y-3 pt-1">
      <input type="hidden" name="intent" value="addSavingsEntry" />
      <input type="hidden" name="type" value={entryType} />

      {/* 種別トグル */}
      <div className="flex gap-2">
        {(["積立", "配分"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setEntryType(t)}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
            style={
              entryType === t
                ? {
                    backgroundColor:
                      t === "積立"
                        ? "oklch(0.94 0.05 160)"
                        : "oklch(0.94 0.05 25)",
                    color:
                      t === "積立"
                        ? "oklch(0.45 0.14 160)"
                        : "oklch(0.50 0.15 25)",
                  }
                : { backgroundColor: "oklch(0.95 0.005 60)", color: "oklch(0.55 0.02 30)" }
            }
          >
            {t === "積立" ? "積立（＋）" : "配分（－）"}
          </button>
        ))}
      </div>

      {/* 金額 */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
          ¥
        </span>
        <input
          type="number"
          name="amount"
          min={1}
          step={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full pl-7 pr-3 py-2 rounded-xl border border-input bg-background text-sm tabular-nums"
          placeholder="金額を入力"
          required
        />
      </div>

      {/* メモ */}
      <input
        type="text"
        name="memo"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm"
        placeholder="メモ（例: 精算返却）"
      />

      {/* 日付 */}
      <input
        type="date"
        name="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm"
      />

      {/* 保存ボタン（dirty-state-aware） */}
      {isDirty && (
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-60"
          style={{ backgroundColor: "oklch(0.74 0.13 28)", color: "oklch(0.99 0.005 60)" }}
        >
          {isSubmitting ? "保存中..." : "保存する"}
        </button>
      )}
    </fetcher.Form>
  );
}

function LegendBar({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
      <span
        className="w-3 h-2.5 rounded-sm shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      {label}
    </span>
  );
}

function LegendLine({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
      <span
        className="w-4 shrink-0 rounded-full"
        style={{ backgroundColor: color, height: "2px" }}
        aria-hidden
      />
      {label}
    </span>
  );
}
