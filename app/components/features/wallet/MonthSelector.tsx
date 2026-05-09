import { ArrowLeft02Icon, ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "react-router";

type MonthSelectorProps = {
  /** 表示する月（YYYY-MM） */
  selectedMonth: string;
  /** 戻れる月。null なら chevron 無効化 */
  prevMonth: string | null;
  /** 進める月。null なら chevron 無効化 */
  nextMonth: string | null;
  /** リンク先のパス（"/" or "/budget"） */
  basePath: string;
};

/**
 * 月切り替えコンポーネント（家計 / 予算 共通）。
 *
 * デザイン意図:
 *   - chevron アイコン + 中央に「年月」を丸文字で組む
 *   - シンプルに月を切り替えることだけに専念（バッジ等で過剰装飾しない）
 */
export function MonthSelector({
  selectedMonth,
  prevMonth,
  nextMonth,
  basePath,
}: MonthSelectorProps) {
  const [year, month] = selectedMonth.split("-");
  const linkTo = (m: string) =>
    basePath === "/" ? `/?month=${m}` : `${basePath}?month=${m}`;

  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <ChevronButton
        direction="prev"
        to={prevMonth ? linkTo(prevMonth) : null}
      />

      <div className="flex flex-col items-center gap-0.5">
        <p className="text-[11px] font-medium text-muted-foreground/80 font-numeric tabular-nums">
          {year}
        </p>
        <p className="font-numeric text-2xl font-bold leading-none text-foreground tracking-tight">
          {Number(month)}
          <span className="font-sans text-base font-bold ml-0.5 text-foreground/80">
            月
          </span>
        </p>
      </div>

      <ChevronButton
        direction="next"
        to={nextMonth ? linkTo(nextMonth) : null}
      />
    </div>
  );
}

function ChevronButton({
  direction,
  to,
}: {
  direction: "prev" | "next";
  to: string | null;
}) {
  const icon = direction === "prev" ? ArrowLeft02Icon : ArrowRight02Icon;
  const baseClass =
    "size-10 rounded-full flex items-center justify-center transition-all";

  if (!to) {
    return (
      <span
        className={`${baseClass} text-muted-foreground/30 cursor-not-allowed`}
        aria-hidden
      >
        <HugeiconsIcon icon={icon} size={18} strokeWidth={2} />
      </span>
    );
  }

  return (
    <Link
      to={to}
      className={`${baseClass} text-muted-foreground hover:text-primary hover:bg-primary/8 active:scale-95`}
      aria-label={direction === "prev" ? "前の月" : "次の月"}
    >
      <HugeiconsIcon icon={icon} size={18} strokeWidth={2} />
    </Link>
  );
}
