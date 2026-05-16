import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyBalanceData } from "~/domain/savings/savings";

// デザイントークンに対応する色値（Recharts は CSS 変数を直接参照できないため定数で保持）
const COLOR_PRIMARY = "oklch(0.74 0.13 28)"; // --primary
const COLOR_DESTRUCTIVE = "oklch(0.66 0.15 25)"; // --destructive
const COLOR_BORDER = "oklch(0.93 0.008 60)"; // --border
const COLOR_MUTED_FG = "oklch(0.55 0.02 30)"; // --muted-foreground
const COLOR_FG = "oklch(0.30 0.02 30)"; // --foreground
const COLOR_CARD = "oklch(1 0 0)"; // --card

type BalanceTrendChartProps = {
  months: MonthlyBalanceData[];
};

function formatYen(value: number) {
  if (Math.abs(value) >= 10000) {
    return `${Math.round(value / 10000)}万`;
  }
  return `¥${value.toLocaleString()}`;
}

function formatMonth(yearMonth: string) {
  return `${Number(yearMonth.slice(5))}月`;
}

const tooltipContentStyle = {
  borderRadius: "0.8rem",
  border: `1px solid ${COLOR_BORDER}`,
  backgroundColor: COLOR_CARD,
  fontSize: 12,
  boxShadow: "0 2px 12px -4px oklch(0.30 0.02 30 / 0.12)",
};

/** 累計残高推移のエリアチャート。 */
export function CumulativeBalanceChart({ months }: BalanceTrendChartProps) {
  const data = months.map((m) => ({
    month: formatMonth(m.yearMonth),
    残高: m.cumulativeBalance,
  }));

  const allValues = months.map((m) => m.cumulativeBalance);
  const min = Math.min(0, ...allValues);
  const max = Math.max(0, ...allValues);

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLOR_PRIMARY} stopOpacity={0.2} />
            <stop offset="95%" stopColor={COLOR_PRIMARY} stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={COLOR_BORDER}
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: COLOR_MUTED_FG, fontFamily: "inherit" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatYen}
          tick={{ fontSize: 11, fill: COLOR_MUTED_FG, fontFamily: "inherit" }}
          axisLine={false}
          tickLine={false}
          width={42}
          domain={[min, max]}
        />
        <Tooltip
          formatter={(value) => [`¥${Number(value).toLocaleString()}`, "累計残高"]}
          labelStyle={{ fontSize: 12, color: COLOR_FG, fontWeight: 600 }}
          contentStyle={tooltipContentStyle}
          cursor={{ stroke: COLOR_BORDER, strokeWidth: 1.5 }}
        />
        {min < 0 && (
          <ReferenceLine y={0} stroke={COLOR_BORDER} strokeWidth={1} />
        )}
        <Area
          type="monotone"
          dataKey="残高"
          stroke={COLOR_PRIMARY}
          strokeWidth={2}
          fill="url(#balanceGrad)"
          dot={false}
          activeDot={{ r: 4, fill: COLOR_PRIMARY, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** 月別貯金額（通常財布 予算 − 支出）の棒グラフ。正はprimary、負はdestructive。 */
export function MonthlySavingsChart({ months }: BalanceTrendChartProps) {
  const data = months.map((m) => ({
    month: formatMonth(m.yearMonth),
    貯金: m.savedAmount,
  }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={COLOR_BORDER}
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: COLOR_MUTED_FG, fontFamily: "inherit" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatYen}
          tick={{ fontSize: 11, fill: COLOR_MUTED_FG, fontFamily: "inherit" }}
          axisLine={false}
          tickLine={false}
          width={42}
        />
        <Tooltip
          formatter={(value) => {
            const n = Number(value);
            return [
              `${n >= 0 ? "+" : "−"}¥${Math.abs(n).toLocaleString()}`,
              "貯金額",
            ];
          }}
          labelStyle={{ fontSize: 12, color: COLOR_FG, fontWeight: 600 }}
          contentStyle={tooltipContentStyle}
          cursor={{ fill: `${COLOR_MUTED_FG}15` }}
        />
        <ReferenceLine y={0} stroke={COLOR_BORDER} strokeWidth={1} />
        <Bar dataKey="貯金" radius={[4, 4, 2, 2]} maxBarSize={40}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.貯金 >= 0 ? COLOR_PRIMARY : COLOR_DESTRUCTIVE}
              fillOpacity={entry.貯金 >= 0 ? 0.85 : 0.7}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
