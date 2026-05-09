import type { CategoryUsage } from "~/features/budget/dashboard";
import { OVER_BUDGET_COLOR } from "./categoryColors";

type CategoryBudgetRowProps = {
  usage: CategoryUsage;
  color: string;
};

/**
 * カテゴリ単位の進捗行。
 *
 * デザイン意図:
 *   - 1 行目：色ドット + カテゴリ名 + 残り金額（行のメイン情報）
 *   - 2 行目：プログレスバー + 使用 / 予算（補助情報、控えめ）
 *   - 「残り」を太めに、「使用」「予算」は薄く
 */
export function CategoryBudgetRow({ usage, color }: CategoryBudgetRowProps) {
  const isOver = usage.remainingAmount < 0;
  const barColor = isOver ? OVER_BUDGET_COLOR : color;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2">
        <span
          className="size-2 rounded-full shrink-0 translate-y-[-1px]"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <span className="text-sm text-foreground font-medium flex-1 truncate">
          {usage.categoryName}
        </span>
        <span
          className={`font-numeric text-sm font-bold tabular-nums ${
            isOver ? "text-destructive" : "text-foreground/85"
          }`}
        >
          {isOver
            ? `−¥${Math.abs(usage.remainingAmount).toLocaleString()}`
            : `¥${usage.remainingAmount.toLocaleString()}`}
        </span>
      </div>

      <div className="ml-4 flex items-center gap-2.5">
        <div className="flex-1 h-1 bg-foreground/8 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${Math.min(usage.usagePercentage, 100)}%`,
              backgroundColor: barColor,
            }}
          />
        </div>
        <span className="font-numeric text-[10px] tabular-nums text-muted-foreground/70 min-w-[3.2rem] text-right">
          ¥{usage.usedAmount.toLocaleString()}/¥
          {usage.budgetAmount.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
