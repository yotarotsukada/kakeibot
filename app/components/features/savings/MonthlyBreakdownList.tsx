import { TrendingDown, TrendingUp } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { MonthlyBalanceData } from "~/domain/savings/savings";
import { cn } from "~/lib/utils";

type MonthlyBreakdownListProps = {
  months: MonthlyBalanceData[];
};

function formatYenSigned(value: number) {
  if (value >= 0) return `+¥${value.toLocaleString()}`;
  return `−¥${Math.abs(value).toLocaleString()}`;
}

function formatMonth(yearMonth: string) {
  const [year, month] = yearMonth.split("-");
  return `${year}年${Number(month)}月`;
}

/** 月別内訳リスト。新しい月が上。 */
export function MonthlyBreakdownList({ months }: MonthlyBreakdownListProps) {
  const sorted = [...months].reverse();

  return (
    <div className="space-y-3">
      {sorted.map((m) => (
        <MonthRow key={m.yearMonth} data={m} />
      ))}
    </div>
  );
}

function MonthRow({ data }: { data: MonthlyBalanceData }) {
  const isSaved = data.savedAmount >= 0;
  const hasBudget = data.totalBudget > 0;

  return (
    <div className="bg-card rounded-2xl ring-1 ring-foreground/[0.06] shadow-[0_2px_24px_-12px_oklch(0.30_0.02_30_/_0.10)] px-5 py-4">
      <div className="flex items-center justify-between mb-3.5">
        <p className="text-sm font-semibold text-foreground">
          {formatMonth(data.yearMonth)}
        </p>
        {hasBudget && (
          <div
            className={cn(
              "flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-0.5",
              isSaved
                ? "text-emerald-700 bg-emerald-100/70"
                : "text-destructive bg-destructive/10",
            )}
          >
            <HugeiconsIcon
              icon={isSaved ? TrendingUp : TrendingDown}
              size={12}
              strokeWidth={2.5}
            />
            <span>{formatYenSigned(data.savedAmount)}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <MetricCell
          label="入金"
          value={data.totalIncome}
          valueClass="text-primary"
        />
        <MetricCell
          label="通常支出"
          value={data.normalWalletSpending}
          valueClass="text-foreground"
        />
        <MetricCell
          label="予算"
          value={data.totalBudget}
          valueClass="text-muted-foreground"
          empty={!hasBudget}
        />
      </div>

      {/* 特別財布の支出がある月は補足表示 */}
      {data.totalSpending > data.normalWalletSpending && (
        <p className="mt-2.5 text-[10px] text-muted-foreground/50">
          特別財布含む全支出 ¥{data.totalSpending.toLocaleString()}
        </p>
      )}
    </div>
  );
}

function MetricCell({
  label,
  value,
  valueClass,
  empty,
}: {
  label: string;
  value: number;
  valueClass: string;
  empty?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground/60 mb-0.5">{label}</p>
      {empty ? (
        <p className="text-xs text-muted-foreground/40">−</p>
      ) : (
        <p className={cn("font-numeric text-xs font-bold tabular-nums", valueClass)}>
          ¥{value.toLocaleString()}
        </p>
      )}
    </div>
  );
}
