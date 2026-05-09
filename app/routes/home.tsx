import { useLoaderData } from "react-router";
import { MonthSelector } from "~/components/features/wallet/MonthSelector";
import { WalletCard } from "~/components/features/wallet/WalletCard";
import { PageLayout } from "~/components/layout/PageLayout";
import { Card } from "~/components/ui/card";
import { getDashboardData } from "~/features/budget/dashboard";
import { createStorage } from "~/infra/factory";
import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "家計" }];
}

function getCurrentMonthJST(): string {
  const now = new Date();
  now.setUTCHours(now.getUTCHours() + 9);
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function buildMonthRange(currentMonth: string): string[] {
  const [year, month] = currentMonth.split("-").map(Number);
  const months: string[] = [];
  for (let offset = -12; offset <= 0; offset++) {
    const d = new Date(year, month - 1 + offset, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    months.push(`${y}-${m}`);
  }
  return months;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { env } = (context as { cloudflare: { env: Env } }).cloudflare;
  const storage = createStorage(env);

  const currentMonth = getCurrentMonthJST();
  const monthRange = buildMonthRange(currentMonth);

  const url = new URL(request.url);
  const rawMonth = url.searchParams.get("month") ?? currentMonth;
  const selectedMonth = monthRange.includes(rawMonth) ? rawMonth : currentMonth;

  const coreData = await getDashboardData({ storage, selectedMonth });
  return { ...coreData, currentMonth, selectedMonth, monthRange };
}

export default function Home() {
  const {
    normalWalletName,
    normalWalletExists,
    totalBudget,
    totalUsed,
    totalUsagePercentage,
    categoryUsages,
    recentWalletSummary,
    selectedMonth,
    currentMonth,
    monthRange,
  } = useLoaderData<typeof loader>();

  const idx = monthRange.indexOf(selectedMonth);
  const prevMonth = idx > 0 ? monthRange[idx - 1] : null;
  const nextMonth =
    idx >= 0 && idx < monthRange.length - 1 ? monthRange[idx + 1] : null;

  return (
    <PageLayout>
      {/*
        通常財布エリア: 月切り替え + 財布カードを 1 セクションにまとめる。
        月選択は通常財布だけに紐づくことを視覚的に表現する。
      */}
      <section className="space-y-4">
        <MonthSelector
          selectedMonth={selectedMonth}
          prevMonth={prevMonth}
          nextMonth={nextMonth}
          basePath="/"
        />

        {!normalWalletExists ? (
          <Card className="rounded-3xl bg-amber-50/60 ring-1 ring-amber-200/60 px-5 py-5">
            <p className="text-xs font-medium text-amber-700 mb-1">未設定</p>
            <p className="text-sm text-amber-900/80 leading-relaxed">
              この月の通常財布が見つかりません。
              <br />
              スプレッドシートで作成してください。
            </p>
          </Card>
        ) : (
          <WalletCard
            walletName={normalWalletName}
            totalBudget={totalBudget}
            totalUsed={totalUsed}
            usagePercentage={totalUsagePercentage}
            categoryUsages={categoryUsages}
          />
        )}
      </section>

      {/*
        特別財布エリア: 月とは独立した目標予算（旅行・家具など）。
        水平区切り + 専用ヘッダで「月の枠から外れた別枠」であることを強調する。
      */}
      {recentWalletSummary && (
        <section className="space-y-3 pt-3">
          <div className="flex items-center gap-3 px-1">
            <span className="h-px flex-1 bg-border" aria-hidden />
            <span className="text-[11px] font-semibold text-muted-foreground/70 tracking-wider">
              特別財布
            </span>
            <span className="h-px flex-1 bg-border" aria-hidden />
          </div>
          <WalletCard
            walletName={recentWalletSummary.walletName}
            totalBudget={recentWalletSummary.totalBudget}
            totalUsed={recentWalletSummary.totalUsed}
            usagePercentage={recentWalletSummary.usagePercentage}
            accentColor="oklch(0.74 0.10 295)"
            monthly={false}
          />
        </section>
      )}
    </PageLayout>
  );
}
