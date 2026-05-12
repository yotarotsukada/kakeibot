import { Cell, Pie, PieChart } from "recharts";
import { getCategoryColor } from "~/components/features/wallet/categoryColors";
import { Card } from "~/components/ui/card";
import type { BudgetRecord } from "~/domain/budget/budget";

type BudgetOverviewCardProps = {
  walletName: string;
  budgetRecords: BudgetRecord[];
  totalBudget: number;
};

/**
 * 予算管理ページのオーバービューカード。
 *
 * デザイン意図:
 *   - Hero は「予算合計額」のみ
 *   - 凡例・カテゴリ数は下の編集リストで色ドット付きで全カテゴリ見えるので重複を避ける
 *   - カード背景はソリッド + subtle ring（WalletCard と同じ装い）
 *
 * バグ修正: recharts デフォルト margin=5 で右下が切れていた問題を margin=0 で解消。
 */
export function BudgetOverviewCard({
  walletName,
  budgetRecords,
  totalBudget,
}: BudgetOverviewCardProps) {
  const chartData = budgetRecords
    .filter((rec) => rec.amount > 0 && totalBudget > 0)
    .map((rec, i) => ({
      name: rec.categoryName,
      value: rec.amount,
      color: getCategoryColor(i),
    }));

  const empty = chartData.length === 0;
  const placeholderColor = "oklch(0.94 0.008 60)";
  const CHART_SIZE = 104;

  return (
    <Card className="rounded-3xl gap-0 py-0 ring-1 ring-foreground/[0.06] shadow-[0_2px_24px_-12px_oklch(0.30_0.02_30_/_0.15)]">
      <div className="px-6 py-5 flex items-center gap-5">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground/70 mb-1">
            {walletName}
          </p>
          <p className="text-[11px] text-muted-foreground/80 mb-1">
            今月の予算
          </p>
          <p className="font-numeric text-[2rem] font-extrabold leading-none tracking-tight tabular-nums">
            <span className="text-xl font-bold mr-0.5 align-baseline opacity-70">
              ¥
            </span>
            {totalBudget.toLocaleString()}
          </p>
        </div>

        {/* ドーナツチャート（margin=0 で切れ防止） */}
        <div
          className="relative shrink-0"
          style={{ width: CHART_SIZE, height: CHART_SIZE }}
        >
          <PieChart
            width={CHART_SIZE}
            height={CHART_SIZE}
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          >
            <Pie
              data={
                empty
                  ? [{ name: "empty", value: 1, color: placeholderColor }]
                  : chartData
              }
              cx="50%"
              cy="50%"
              innerRadius={36}
              outerRadius={50}
              startAngle={90}
              endAngle={-270}
              paddingAngle={chartData.length > 1 ? 2 : 0}
              dataKey="value"
              isAnimationActive={false}
              stroke="none"
            >
              {(empty
                ? [{ name: "empty", color: placeholderColor }]
                : chartData
              ).map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </div>
      </div>
    </Card>
  );
}
