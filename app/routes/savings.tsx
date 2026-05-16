import { TrendingUp } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useLoaderData } from "react-router";
import {
  CumulativeBalanceChart,
  MonthlySavingsChart,
} from "~/components/features/savings/BalanceTrendChart";
import { MonthlyBreakdownList } from "~/components/features/savings/MonthlyBreakdownList";
import { PageLayout } from "~/components/layout/PageLayout";
import { Card } from "~/components/ui/card";
import { unwrap } from "~/domain/result";
import { getSavingsData } from "~/features/savings/balance";
import { createStorage } from "~/infra/factory";
import { requireAuth } from "~/lib/auth";
import { buildMonthRange, getCurrentMonthJST } from "~/lib/date";
import { cn } from "~/lib/utils";
import type { Route } from "./+types/savings";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "ふたりの家計簿 | 貯金" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { env } = (context as { cloudflare: { env: Env } }).cloudflare;
  await requireAuth(request, env);
  const storage = createStorage(env);

  const currentMonth = getCurrentMonthJST();
  const months = buildMonthRange(currentMonth).slice(-7);

  const savingsData = unwrap(await getSavingsData({ storage, months }));
  return savingsData;
}

export default function Savings() {
  const { months, totalSavedAmount } = useLoaderData<typeof loader>();

  const hasData = months.some(
    (m) => m.totalIncome > 0 || m.totalSpending > 0,
  );

  const latestBalance = months.at(-1)?.cumulativeBalance ?? 0;
  const isPositiveBalance = latestBalance >= 0;

  return (
    <PageLayout>
      {/* ヒーロー: 貯金合計 */}
      <Card className="rounded-3xl gap-0 py-0 ring-1 ring-foreground/[0.06] shadow-[0_2px_24px_-12px_oklch(0.74_0.13_28_/_0.25)]">
        <div className="px-6 pt-5 pb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="size-7 rounded-xl bg-primary/15 flex items-center justify-center">
              <HugeiconsIcon
                icon={TrendingUp}
                size={15}
                strokeWidth={2.5}
                className="text-primary"
              />
            </div>
            <p className="text-xs font-semibold text-foreground/70 tracking-wide">
              直近7か月の貯金合計
            </p>
          </div>
          <p className="font-numeric text-[2.5rem] font-extrabold leading-none tracking-tight tabular-nums text-foreground">
            <span className="text-2xl font-bold mr-0.5 align-baseline opacity-70">
              ¥
            </span>
            {totalSavedAmount.toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground mt-2.5">
            予算内に収まった月の、通常財布の節約合計
          </p>
        </div>
      </Card>

      {!hasData ? (
        <Card className="rounded-2xl px-5 py-6 ring-0 shadow-none bg-muted/40">
          <p className="text-sm text-muted-foreground text-center">
            入金・支出のデータがまだありません。
            <br />
            LINEで入金・支出を記録してください。
          </p>
        </Card>
      ) : (
        <>
          {/* 累計残高推移チャート */}
          <section className="space-y-3">
            <SectionDivider label="累計残高推移" />
            <Card className="rounded-2xl gap-0 py-0 ring-1 ring-foreground/[0.06] shadow-[0_2px_24px_-12px_oklch(0.30_0.02_30_/_0.10)]">
              <div className="px-4 pt-4 pb-5">
                <div className="flex items-baseline gap-2 mb-4">
                  <p className="text-[11px] text-muted-foreground/80">
                    現在の残高
                  </p>
                  <p
                    className={cn(
                      "font-numeric text-lg font-extrabold tabular-nums",
                      isPositiveBalance ? "text-foreground" : "text-destructive",
                    )}
                  >
                    {isPositiveBalance ? "" : "−"}¥
                    {Math.abs(latestBalance).toLocaleString()}
                  </p>
                </div>
                <CumulativeBalanceChart months={months} />
              </div>
            </Card>
          </section>

          {/* 月別貯金チャート */}
          <section className="space-y-3">
            <SectionDivider label="月別貯金額" />
            <Card className="rounded-2xl gap-0 py-0 ring-1 ring-foreground/[0.06] shadow-[0_2px_24px_-12px_oklch(0.30_0.02_30_/_0.10)]">
              <div className="px-4 pt-4 pb-5">
                <p className="text-[11px] text-muted-foreground/80 mb-4">
                  通常財布の 予算 − 支出（プラスが節約）
                </p>
                <MonthlySavingsChart months={months} />
              </div>
            </Card>
          </section>

          {/* 月別内訳 */}
          <section className="space-y-3">
            <SectionDivider label="月別内訳" />
            <MonthlyBreakdownList months={months} />
          </section>
        </>
      )}
    </PageLayout>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-1">
      <span className="h-px flex-1 bg-border" aria-hidden />
      <span className="text-[11px] font-semibold text-muted-foreground/70 tracking-wider">
        {label}
      </span>
      <span className="h-px flex-1 bg-border" aria-hidden />
    </div>
  );
}
