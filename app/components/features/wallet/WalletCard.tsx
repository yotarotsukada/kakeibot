import { Link } from "react-router";
import { Card } from "~/components/ui/card";
import type { CategoryUsage } from "~/features/budget/dashboard";
import { cn } from "~/lib/utils";
import { CategoryBudgetRow } from "./CategoryBudgetRow";
import { getCategoryColor, OVER_BUDGET_COLOR } from "./categoryColors";

type WalletCardProps = {
  walletName: string;
  totalBudget: number;
  totalUsed: number;
  usagePercentage: number;
  categoryUsages?: CategoryUsage[];
  /** 予算カテゴリに紐付けられない支出の合計。あるときだけ渡す。 */
  miscUsed?: number | null;
  /** 特別財布などで色味を変えたいとき */
  accentColor?: string;
  /**
   * 月単位の財布か（デフォルト true）。
   * false のときは「今月の」プレフィクスとステータスバッジを出さない。
   * 特別財布（旅行・家具など、月をまたぐ目標予算）はこちら。
   */
  monthly?: boolean;
};

/**
 * 財布カード。
 *
 * デザイン意図:
 *   - "残り金額" を Hero に。「あといくら使える？」がユーザーの第一関心
 *   - 月単位の財布（通常財布）は「今月の残り」+ ステータスバッジで状況を伝える
 *   - 月をまたぐ財布（特別財布）は「残り」のみ。月感を完全に消す
 *   - カード背景はソリッド（グラデーション無し）、subtle ring で輪郭を出す
 */
export function WalletCard({
  walletName,
  totalBudget,
  totalUsed,
  usagePercentage,
  categoryUsages,
  miscUsed,
  accentColor,
  monthly = true,
}: WalletCardProps) {
  const hasBudget = totalBudget > 0;
  const remaining = totalBudget - totalUsed;
  const isOver = hasBudget && remaining < 0;
  const fillColor = isOver
    ? OVER_BUDGET_COLOR
    : (accentColor ?? "var(--primary)");

  return (
    <Card className="rounded-3xl gap-0 py-0 ring-1 ring-foreground/[0.06] shadow-[0_2px_24px_-12px_oklch(0.30_0.02_30_/_0.15)]">
      <div className="px-6 pt-5 pb-6">
        {/* 特別財布のみ: 財布名タイトル */}
        {!monthly && (
          <p className="text-sm font-semibold text-foreground truncate mb-2">
            {walletName}
          </p>
        )}

        {/* 予算未設定の特別財布: コンパクト表示 */}
        {!monthly && !hasBudget ? (
          <p className="text-sm text-muted-foreground/50 mt-1">予算未設定</p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] text-muted-foreground/80">
                {isOver ? "オーバー" : "残り"}
              </p>
              {monthly && (
                <StatusBadge isOver={isOver} percentage={usagePercentage} />
              )}
            </div>
            <p
              className={cn(
                "font-numeric text-[2.5rem] font-extrabold leading-none tracking-tight tabular-nums",
                isOver ? "text-destructive" : "text-foreground",
              )}
            >
              <span className="text-2xl font-bold mr-0.5 align-baseline opacity-70">
                ¥
              </span>
              {Math.abs(remaining).toLocaleString()}
            </p>

            <div className="mt-4 h-1.5 bg-foreground/8 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${Math.min(usagePercentage, 100)}%`,
                  backgroundColor: fillColor,
                }}
              />
            </div>

            <div className="mt-2.5 flex justify-between">
              <div>
                <p className="font-numeric text-xs tabular-nums text-muted-foreground">
                  ¥{totalUsed.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">使用</p>
              </div>
              <div className="text-right">
                <p className="font-numeric text-xs tabular-nums text-muted-foreground">
                  ¥{totalBudget.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">予算</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* カテゴリ別内訳（通常財布のみ） */}
      {categoryUsages !== undefined && (
        <div className="px-6 pt-4 pb-5 border-t border-border/60">
          <p className="text-[11px] font-medium text-muted-foreground/80 mb-3.5">
            カテゴリ別
          </p>
          {categoryUsages.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              予算が未設定です
              <Link
                to="/budget"
                className="text-primary underline underline-offset-2 ml-1.5 font-medium"
              >
                設定する
              </Link>
            </p>
          ) : (
            <div className="space-y-3.5">
              {categoryUsages.map((usage, i) => (
                <CategoryBudgetRow
                  key={usage.categoryName}
                  usage={usage}
                  color={getCategoryColor(i)}
                />
              ))}
              {miscUsed != null && <MiscRow usedAmount={miscUsed} />}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/** 予算カテゴリに紐付けられない支出をまとめる「未分類」行。 */
function MiscRow({ usedAmount }: { usedAmount: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <span
        className="size-2 rounded-full shrink-0 translate-y-[-1px] bg-foreground/25"
        aria-hidden
      />
      <span className="text-sm text-foreground font-medium flex-1">
        未分類
      </span>
      <span className="font-numeric text-sm font-bold tabular-nums text-foreground/85">
        ¥{usedAmount.toLocaleString()}
      </span>
    </div>
  );
}

/** 通常財布だけに表示するステータスバッジ。月単位の意味があるとき有効。 */
function StatusBadge({
  isOver,
  percentage,
}: {
  isOver: boolean;
  percentage: number;
}) {
  if (isOver) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-destructive bg-destructive/10 rounded-full px-2 py-0.5">
        <span className="size-1 rounded-full bg-destructive" aria-hidden />
        オーバー
      </span>
    );
  }
  if (percentage >= 80) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-100/80 rounded-full px-2 py-0.5">
        <span className="size-1 rounded-full bg-amber-500" aria-hidden />
        ペース速め
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-100/70 rounded-full px-2 py-0.5">
      <span className="size-1 rounded-full bg-emerald-500" aria-hidden />
      順調
    </span>
  );
}
