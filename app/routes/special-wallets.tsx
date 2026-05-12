import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";
import { useActionData, useFetcher, useLoaderData } from "react-router";
import { InlineBudgetField } from "~/components/features/budget/InlineBudgetField";
import { MoneyInput } from "~/components/features/budget/MoneyInput";
import { SPECIAL_WALLET_ACCENT_COLOR } from "~/components/features/wallet/categoryColors";
import { PageLayout } from "~/components/layout/PageLayout";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { ValidationError } from "~/domain/errors";
import { unwrap } from "~/domain/result";
import { upsertBudget } from "~/features/budget/manage";
import {
  createSpecialWallet,
  getSpecialWalletsPageData,
  renameSpecialWallet,
  type SpecialWalletSummary,
  toggleWalletSettled,
} from "~/features/budget/special-wallet";
import { createStorage } from "~/infra/factory";
import {
  type ActionError,
  actionError,
  useActionErrorToast,
} from "~/lib/action-result";
import { requireAuth } from "~/lib/auth";
import { cn } from "~/lib/utils";
import type { Route } from "./+types/special-wallets";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "財布" }];
}

type FilterType = "unsettled" | "settled" | "all";

export async function loader({ request, context }: Route.LoaderArgs) {
  const { env } = (context as { cloudflare: { env: Env } }).cloudflare;
  await requireAuth(request, env);
  const storage = createStorage(env);

  const data = unwrap(await getSpecialWalletsPageData({ storage }));
  return data;
}

export async function action({
  request,
  context,
}: Route.ActionArgs): Promise<ActionError | null> {
  const { env } = (context as { cloudflare: { env: Env } }).cloudflare;
  await requireAuth(request, env);
  const storage = createStorage(env);

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "create-wallet") {
    const walletName = String(formData.get("walletName") ?? "");
    const budgetAmount = Number(formData.get("budgetAmount") ?? 0);

    const result = await createSpecialWallet(walletName, { storage });
    if (!result.ok) return actionError(result.error);

    if (budgetAmount > 0) {
      const budgetResult = await upsertBudget(
        walletName.trim(),
        "一括",
        budgetAmount,
        { storage },
      );
      if (!budgetResult.ok) return actionError(budgetResult.error);
    }

    return null;
  }

  if (intent === "rename-wallet") {
    const oldName = String(formData.get("oldWalletName") ?? "");
    const newName = String(formData.get("newWalletName") ?? "");
    const result = await renameSpecialWallet(oldName, newName, { storage });
    if (!result.ok) return actionError(result.error);
    return null;
  }

  if (intent === "toggle-settled") {
    const walletName = String(formData.get("walletName") ?? "");
    const settled = formData.get("settled") === "true";
    const result = await toggleWalletSettled(walletName, settled, { storage });
    if (!result.ok) return actionError(result.error);
    return null;
  }

  if (intent === "upsert-budget") {
    const walletName = String(formData.get("walletName") ?? "");
    const rawAmount = String(formData.get("amount") ?? "");
    const amount = Number(rawAmount);
    if (!rawAmount || Number.isNaN(amount)) {
      return actionError(
        new ValidationError({
          message: "amount is empty or invalid",
          userMessage: "金額を入力してください。",
        }),
      );
    }
    const result = await upsertBudget(
      walletName,
      "一括",
      amount,
      { storage },
    );
    if (!result.ok) return actionError(result.error);
    return null;
  }

  return actionError(
    new ValidationError({
      message: `unknown intent: ${intent}`,
      userMessage: "不明な操作です。画面を再読み込みしてください。",
    }),
  );
}

export default function SpecialWalletsPage() {
  const { wallets } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() as ActionError | undefined;
  useActionErrorToast(actionData);

  const [filter, setFilter] = useState<FilterType>("unsettled");
  const [showNewForm, setShowNewForm] = useState(false);

  const filteredWallets = wallets.filter((item) => {
    if (filter === "unsettled") return !item.wallet.settled;
    if (filter === "settled") return item.wallet.settled;
    return true;
  });

  return (
    <PageLayout>
      {/* ページヘッダー + 新規登録トリガー */}
      <div className="flex items-start justify-between px-1">
        <div className="space-y-0.5">
          <h1 className="text-lg font-bold text-foreground">財布</h1>
          <p className="text-xs text-muted-foreground">
            臨時の出費を管理します
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowNewForm((v) => !v)}
          className="h-8 px-3 text-xs rounded-full shrink-0 mt-0.5"
        >
          {showNewForm ? "閉じる" : "+ 新規登録"}
        </Button>
      </div>

      {/* 新規登録フォーム（ヘッダー直下に展開） */}
      {showNewForm && <NewWalletForm onSuccess={() => setShowNewForm(false)} />}

      {/* フィルタータブ */}
      <FilterTabs filter={filter} onFilterChange={setFilter} />

      {/* 財布一覧 */}
      {filteredWallets.length === 0 ? (
        <Card className="rounded-3xl px-5 py-6 ring-1 ring-foreground/[0.06] text-center">
          <p className="text-sm text-muted-foreground">
            {filter === "unsettled"
              ? "未精算の財布はありません。"
              : filter === "settled"
                ? "精算済みの財布はありません。"
                : "財布がまだ登録されていません。"}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredWallets.map((item) => (
            <SpecialWalletCard key={item.wallet.name} item={item} />
          ))}
        </div>
      )}
    </PageLayout>
  );
}

function FilterTabs({
  filter,
  onFilterChange,
}: {
  filter: FilterType;
  onFilterChange: (f: FilterType) => void;
}) {
  const tabs: { value: FilterType; label: string }[] = [
    { value: "unsettled", label: "未精算" },
    { value: "settled", label: "精算済み" },
    { value: "all", label: "全て" },
  ];

  return (
    <div className="flex gap-0.5 bg-foreground/[0.04] ring-1 ring-foreground/[0.05] rounded-2xl p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onFilterChange(tab.value)}
          className={cn(
            "flex-1 text-center text-xs font-semibold py-2 rounded-xl transition-all duration-200",
            filter === tab.value
              ? "bg-background text-foreground ring-1 ring-foreground/[0.06] shadow-[0_1px_6px_-2px_oklch(0.30_0.02_30_/_0.12)]"
              : "text-muted-foreground/60 hover:text-foreground/70",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function SpecialWalletCard({ item }: { item: SpecialWalletSummary }) {
  const { wallet, totalBudget, totalUsed, usagePercentage } = item;

  const settleFetcher = useFetcher<ActionError | null>();
  const budgetFetcher = useFetcher<ActionError | null>();

  useActionErrorToast(settleFetcher.data as ActionError | undefined);
  useActionErrorToast(budgetFetcher.data as ActionError | undefined);

  const hasBudget = totalBudget > 0;
  const isSettled = wallet.settled;
  const isSettling =
    settleFetcher.state !== "idle" &&
    settleFetcher.formData?.get("intent") === "toggle-settled";

  const remaining = totalBudget - totalUsed;
  const isOver = hasBudget && remaining < 0;

  const barColor = isSettled
    ? "oklch(0.72 0.02 265)"
    : isOver
      ? "oklch(0.66 0.15 25)"
      : SPECIAL_WALLET_ACCENT_COLOR;

  return (
    <Card
      className={cn(
        "rounded-3xl gap-0 py-0 ring-1 shadow-[0_2px_24px_-12px_oklch(0.30_0.02_30_/_0.15)]",
        "transition-all duration-500",
        isSettled
          ? "opacity-60 ring-foreground/[0.04]"
          : "opacity-100 ring-foreground/[0.06]",
      )}
    >
      <div className="px-6 pt-5 pb-5">
        {/* ヘッダー行: 財布名 + 精算バッジ / 精算ボタン */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {wallet.name}
            </p>
            {isSettled && (
              <span className="inline-flex items-center gap-1 shrink-0 text-[10px] font-medium text-muted-foreground/80 bg-foreground/[0.06] rounded-full px-2 py-0.5">
                <HugeiconsIcon
                  icon={Tick02Icon}
                  size={10}
                  strokeWidth={2.5}
                  className="opacity-70"
                />
                精算を完了
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={isSettling}
            onClick={() =>
              settleFetcher.submit(
                {
                  intent: "toggle-settled",
                  walletName: wallet.name,
                  settled: String(!isSettled),
                },
                { method: "post" },
              )
            }
            className={cn(
              "shrink-0 h-7 px-3 text-[11px] font-semibold rounded-full border transition-all duration-200",
              isSettling
                ? "animate-pulse text-muted-foreground/50 border-border/40 cursor-wait"
                : isSettled
                  ? "text-muted-foreground/60 border-border/50 hover:text-foreground/80 hover:border-border"
                  : "text-foreground/75 border-foreground/20 bg-foreground/[0.04] hover:bg-foreground/[0.08]",
            )}
          >
            {isSettling ? "処理中…" : isSettled ? "未精算に戻す" : "精算を完了"}
          </button>
        </div>

        {/* ヒーロー: 予算設定時は残り/オーバー、未設定時は使用額 */}
        <p className="text-[11px] text-muted-foreground/80 mb-1">
          {hasBudget ? (isOver ? "オーバー" : "残り") : "使用"}
        </p>
        <p
          className={cn(
            "font-numeric text-[2.5rem] font-extrabold leading-none tracking-tight tabular-nums",
            isOver ? "text-destructive" : "text-foreground",
          )}
        >
          <span className="text-2xl font-bold mr-0.5 align-baseline opacity-70">
            ¥
          </span>
          {hasBudget
            ? Math.abs(remaining).toLocaleString()
            : totalUsed.toLocaleString()}
        </p>

        {/* プログレスバー（予算設定時のみ） */}
        {hasBudget && (
          <div className="mt-4 h-1.5 bg-foreground/8 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${Math.min(usagePercentage, 100)}%`,
                backgroundColor: barColor,
              }}
            />
          </div>
        )}

        {/* 使用 / 予算 */}
        <div className={cn("flex justify-between", hasBudget ? "mt-2.5" : "mt-4")}>
          <div>
            <p className="font-numeric text-xs tabular-nums text-muted-foreground">
              ¥{totalUsed.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">使用</p>
          </div>
          <div className="text-right">
            {hasBudget ? (
              <>
                <p className="font-numeric text-xs tabular-nums text-muted-foreground">
                  ¥{totalBudget.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">予算</p>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground/50">未設定</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">予算</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 予算編集（月次予算の編集行と同じ dirty-aware パターンで統一） */}
      <Separator className="opacity-40" />
      <div className="px-6 py-3">
        <budgetFetcher.Form
          method="post"
          className="flex items-center justify-between gap-2"
        >
          <input type="hidden" name="intent" value="upsert-budget" />
          <input type="hidden" name="walletName" value={wallet.name} />
          <p className="text-[11px] text-muted-foreground/70">予算</p>
          <InlineBudgetField
            name="amount"
            initialValue={totalBudget > 0 ? totalBudget : undefined}
            placeholder="0"
            isPending={budgetFetcher.state !== "idle"}
          />
        </budgetFetcher.Form>
      </div>
    </Card>
  );
}

function NewWalletForm({ onSuccess }: { onSuccess: () => void }) {
  const createFetcher = useFetcher<ActionError | null>();
  const prevState = useRef(createFetcher.state);

  useEffect(() => {
    if (
      prevState.current !== "idle" &&
      createFetcher.state === "idle" &&
      !createFetcher.data
    ) {
      onSuccess();
    }
    prevState.current = createFetcher.state;
  }, [createFetcher.state, createFetcher.data, onSuccess]);

  const isSubmitting = createFetcher.state !== "idle";

  return (
    <Card className="rounded-3xl px-5 py-4 ring-1 ring-foreground/[0.06] shadow-[0_2px_24px_-12px_oklch(0.30_0.02_30_/_0.15)]">
      <createFetcher.Form method="post" className="space-y-2.5">
        <input type="hidden" name="intent" value="create-wallet" />
        <div className="space-y-1">
          <label
            htmlFor="nwf-name"
            className="text-xs font-medium text-muted-foreground block"
          >
            財布名
          </label>
          <Input
            id="nwf-name"
            name="walletName"
            placeholder="旅行や大きな買い物"
            className="h-9 text-sm rounded-2xl"
            required
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="nwf-budget"
            className="text-xs font-medium text-muted-foreground block"
          >
            予算
          </label>
          <div className="flex items-center justify-between">
            <MoneyInput
              id="nwf-budget"
              name="budgetAmount"
              wrapperClassName="w-36"
              className="h-9 text-sm rounded-2xl"
            />
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-4 text-sm rounded-2xl"
            >
              {isSubmitting ? "登録中…" : "登録"}
            </Button>
          </div>
        </div>
      </createFetcher.Form>
    </Card>
  );
}
