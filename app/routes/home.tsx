import { Link, useLoaderData } from "react-router";
import { SettlementCard } from "~/components/features/settlement/SettlementCard";
import { SPECIAL_WALLET_ACCENT_COLOR } from "~/components/features/wallet/categoryColors";
import { MonthSelector } from "~/components/features/wallet/MonthSelector";
import { WalletCard } from "~/components/features/wallet/WalletCard";
import { PageLayout } from "~/components/layout/PageLayout";
import { Card } from "~/components/ui/card";
import { unwrap } from "~/domain/result";
import { getDashboardData } from "~/features/budget/dashboard";
import { createStorage } from "~/infra/factory";
import { requireAuth } from "~/lib/auth";
import { buildMonthRange, getCurrentMonthJST, isValidMonth } from "~/lib/date";
import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "ふたりの家計簿 | 家計" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { env } = (context as { cloudflare: { env: Env } }).cloudflare;
  await requireAuth(request, env);
  const storage = createStorage(env);

  const currentMonth = getCurrentMonthJST();
  const monthRange = buildMonthRange(currentMonth);

  const url = new URL(request.url);
  const rawMonth = url.searchParams.get("month") ?? currentMonth;
  const selectedMonth = isValidMonth(rawMonth, monthRange)
    ? rawMonth
    : currentMonth;

  const coreData = unwrap(await getDashboardData({ storage, selectedMonth }));
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
    miscUsed,
    recentWalletSummaries,
    settlements,
    selectedMonth,
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
            miscUsed={miscUsed}
          />
        )}
      </section>

      {/*
        特別財布エリア: 月とは独立した目標予算（旅行・家具など）。
        未精算の特別財布を最大3件表示。管理画面へのリンクを併設。
      */}
      {recentWalletSummaries.length > 0 && (
        <section className="space-y-3 pt-3">
          <div className="flex items-center gap-3 px-1">
            <span className="h-px flex-1 bg-border" aria-hidden />
            <Link
              to="/special-wallets"
              className="text-[11px] font-semibold text-muted-foreground/70 tracking-wider hover:text-primary transition-colors"
            >
              最近の財布
            </Link>
            <span className="h-px flex-1 bg-border" aria-hidden />
          </div>
          <div className="space-y-3">
            {recentWalletSummaries.map((summary) => (
              <WalletCard
                key={summary.walletName}
                walletName={summary.walletName}
                totalBudget={summary.totalBudget}
                totalUsed={summary.totalUsed}
                usagePercentage={summary.usagePercentage}
                accentColor={SPECIAL_WALLET_ACCENT_COLOR}
                monthly={false}
              />
            ))}
          </div>
        </section>
      )}
      {/*
        精算エリア: 月次財布の立替額と振り込み額を表示。
        ユーザーマスタにユーザーが登録されているときのみ表示。
      */}
      {settlements.length > 0 && (
        <section className="space-y-3 pt-3">
          <div className="flex items-center gap-3 px-1">
            <span className="h-px flex-1 bg-border" aria-hidden />
            <span className="text-[11px] font-semibold text-muted-foreground/70 tracking-wider">
              精算
            </span>
            <span className="h-px flex-1 bg-border" aria-hidden />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {settlements.map((s) => (
              <SettlementCard key={s.userName} {...s} />
            ))}
          </div>
        </section>
      )}
    </PageLayout>
  );
}
