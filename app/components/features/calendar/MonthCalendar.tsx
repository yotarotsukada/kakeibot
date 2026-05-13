import { cn } from "~/lib/utils";

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function formatCellAmount(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

function getTodayStr(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

type Cell =
  | { kind: "day"; date: number; dateStr: string; colIdx: number }
  | { kind: "empty"; key: string };

function buildCells(year: number, month: number): Cell[] {
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const mm = String(month).padStart(2, "0");
  const cells: Cell[] = [];

  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push({ kind: "empty", key: `e-${i}` });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dd = String(d).padStart(2, "0");
    cells.push({
      kind: "day",
      date: d,
      dateStr: `${year}-${mm}-${dd}`,
      colIdx: (firstDayOfWeek + d - 1) % 7,
    });
  }
  return cells;
}

type Props = {
  year: number;
  month: number;
  dailyTotals: Record<string, number>;
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
};

export function MonthCalendar({
  year,
  month,
  dailyTotals,
  selectedDate,
  onDateSelect,
}: Props) {
  const todayStr = getTodayStr();
  const cells = buildCells(year, month);

  return (
    <div>
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 border-b border-border/40 bg-muted/30">
        {DAY_LABELS.map((label, i) => (
          <div
            key={label}
            className={cn(
              "text-center text-[11px] font-bold py-2 tracking-wide",
              i === 0
                ? "text-red-400"
                : i === 6
                  ? "text-sky-400"
                  : "text-muted-foreground/60",
            )}
          >
            {label}
          </div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div className="grid grid-cols-7">
        {cells.map((cell) => {
          if (cell.kind === "empty") {
            return (
              <div
                key={cell.key}
                className="h-[60px] border-b border-r border-border/20"
              />
            );
          }

          const total = dailyTotals[cell.dateStr];
          const isSelected = cell.dateStr === selectedDate;
          const isToday = cell.dateStr === todayStr;
          const isSun = cell.colIdx === 0;
          const isSat = cell.colIdx === 6;

          return (
            <button
              key={cell.dateStr}
              type="button"
              onClick={() => onDateSelect(cell.dateStr)}
              className={cn(
                "h-[60px] flex flex-col items-center pt-1 gap-0",
                "border-b border-r border-border/20",
                "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                isSelected
                  ? "bg-primary/[0.07]"
                  : "hover:bg-muted/50 active:bg-muted",
              )}
            >
              {/* 日付数字 */}
              <span
                className={cn(
                  "text-xs w-6 h-6 rounded-full flex items-center justify-center font-semibold leading-none transition-colors",
                  isToday
                    ? "bg-primary text-primary-foreground"
                    : isSelected
                      ? "text-primary font-bold"
                      : isSun
                        ? "text-red-400/90"
                        : isSat
                          ? "text-sky-400/90"
                          : "text-foreground/75",
                )}
              >
                {cell.date}
              </span>

              {/* 支出合計（存在する日のみ） */}
              {total !== undefined && (
                <span className="text-[9px] font-bold font-numeric tabular-nums leading-none text-primary/75">
                  {formatCellAmount(total)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
