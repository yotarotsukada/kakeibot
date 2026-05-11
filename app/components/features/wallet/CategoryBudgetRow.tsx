import type { CategoryUsage } from "~/features/budget/dashboard";
import { OVER_BUDGET_COLOR } from "./categoryColors";

type CategoryBudgetRowProps = {
  usage: CategoryUsage;
  color: string;
};

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
          className={`text-sm font-bold tabular-nums ${
            isOver ? "text-destructive" : "text-foreground/85"
          }`}
        >
          <span className="font-sans text-[10px] font-medium opacity-70 mr-0.5">
            {isOver ? "超過" : "あと"}
          </span>
          <span className="font-numeric">
            {isOver
              ? `−¥${Math.abs(usage.remainingAmount).toLocaleString()}`
              : `¥${usage.remainingAmount.toLocaleString()}`}
          </span>
        </span>
      </div>

      <div className="h-1.5 bg-foreground/8 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${Math.min(usage.usagePercentage, 100)}%`,
            backgroundColor: barColor,
          }}
        />
      </div>

      <div className="flex justify-between">
        <p className="font-numeric text-xs tabular-nums text-muted-foreground">
          ¥{usage.usedAmount.toLocaleString()}
        </p>
        <p className="font-numeric text-xs tabular-nums text-muted-foreground">
          ¥{usage.budgetAmount.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
