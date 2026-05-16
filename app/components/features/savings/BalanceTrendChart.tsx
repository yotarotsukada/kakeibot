"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyBalanceData } from "~/domain/savings/savings";

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
            <stop offset="5%" stopColor="oklch(0.74 0.13 28)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="oklch(0.74 0.13 28)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="oklch(0.93 0.008 60)"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "oklch(0.55 0.02 30)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatYen}
          tick={{ fontSize: 11, fill: "oklch(0.55 0.02 30)" }}
          axisLine={false}
          tickLine={false}
          width={40}
          domain={[min, max]}
        />
        <Tooltip
          formatter={(value) => [
            `¥${Number(value).toLocaleString()}`,
            "累計残高",
          ]}
          labelStyle={{ fontSize: 12, color: "oklch(0.30 0.02 30)" }}
          contentStyle={{
            borderRadius: "0.8rem",
            border: "1px solid oklch(0.93 0.008 60)",
            backgroundColor: "oklch(1 0 0)",
            fontSize: 12,
          }}
        />
        {min < 0 && (
          <ReferenceLine y={0} stroke="oklch(0.93 0.008 60)" strokeWidth={1} />
        )}
        <Area
          type="monotone"
          dataKey="残高"
          stroke="oklch(0.74 0.13 28)"
          strokeWidth={2.5}
          fill="url(#balanceGrad)"
          dot={false}
          activeDot={{ r: 4, fill: "oklch(0.74 0.13 28)", strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** 月別貯金額の棒グラフ。プラスはCoral、マイナスはdestructive。 */
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
          stroke="oklch(0.93 0.008 60)"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "oklch(0.55 0.02 30)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatYen}
          tick={{ fontSize: 11, fill: "oklch(0.55 0.02 30)" }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          formatter={(value) => {
            const n = Number(value);
            return [
              `${n >= 0 ? "+" : "−"}¥${Math.abs(n).toLocaleString()}`,
              "貯金額",
            ];
          }}
          labelStyle={{ fontSize: 12, color: "oklch(0.30 0.02 30)" }}
          contentStyle={{
            borderRadius: "0.8rem",
            border: "1px solid oklch(0.93 0.008 60)",
            backgroundColor: "oklch(1 0 0)",
            fontSize: 12,
          }}
        />
        <ReferenceLine y={0} stroke="oklch(0.93 0.008 60)" strokeWidth={1} />
        <Bar
          dataKey="貯金"
          radius={[4, 4, 0, 0]}
          // Rechartsのセル単位の着色はcell要素では難しいため、正負を別barで表現
          fill="oklch(0.74 0.13 28)"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
