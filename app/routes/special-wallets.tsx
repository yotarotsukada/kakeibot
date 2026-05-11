import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";
import {
  redirect,
  useActionData,
  useFetcher,
  useLoaderData,
  useNavigation,
} from "react-router";
import {
  SPECIAL_WALLET_ACCENT_COLOR,
  getCategoryColor,
} from "~/components/features/wallet/categoryColors";
import { PageLayout } from "~/components/layout/PageLayout";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { ValidationError } from "~/domain/errors";
import { unwrap } from "~/domain/result";
import { deleteBudget, upsertBudget } from "~/features/budget/manage";
import {
  createSpecialWallet,
  getSpecialWalletsPageData,
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
  return [{ title: "特別財布" }];
}

type FilterType = "unsettled" | "settled" | "all";

export async function loader({ request, context }: Route.LoaderArgs) {
  const { env } = (context as { cloudflare: { env: Env } }).cloudflare;
  await requireAuth(request, env);
  const storage = createStorage(env);

  const url = new URL(request.url);
  const filter = (url.searchParams.get("filter") ?? "unsettled") as FilterType;

  const data = unwrap(await getSpecialWalletsPageData({ storage }));
  return { ...data, filter };
}

export async function action({
  request,
  context,
}: Route.ActionArgs): Promise<ActionError | Response | null> {
  const { env } = (context as { cloudflare: { env: Env } }).cloudflare;
  await requireAuth(request, env);
  const storage = createStorage(env);

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "create-wallet") {
    const walletName = String(formData.get("walletName") ?? "");
    const result = await createSpecialWallet(walletName, { storage });
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
    const categoryName = String(formData.get("categoryName") ?? "");
    const amount = Number(formData.get("amount"));
    const result = await upsertBudget(walletName, categoryName, amount, {
      storage,
    });
    if (!result.ok) return actionError(result.error);
    return redirect("/special-wallets");
  }

  if (intent === "delete-budget") {
    const walletName = String(formData.get("walletName") ?? "");
    const categoryName = String(formData.get("categoryName") ?? "");
    const result = await deleteBudget(walletName, categoryName, { storage });
    if (!result.ok) return actionError(result.error);
    return redirect("/special-wallets");
  }

  return actionError(
    new ValidationError({
      message: `unknown intent: ${intent}`,
      userMessage: "不明な操作です。画面を再読み込みしてください。",
    }),
  );
}

export default function SpecialWalletsPage() {
  const { wallets, categories, filter: initialFilter } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() as ActionError | undefined;
  useActionErrorToast(actionData);

  const [filter, setFilter] = useState<FilterType>(initialFilter);
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
          <h1 className="text-lg font-bold text-foreground">特別財布</h1>
          <p className="text-xs text-muted-foreground">
            旅行・家具など月をまたぐ目標予算
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
      {showNewForm && (
        <NewWalletForm
          categories={categories}
          onSuccess={() => setShowNewForm(false)}
        />
      )}

      {/* フィルタータブ */}
      <FilterTabs filter={filter} onFilterChange={setFilter} />

      {/* 財布一覧 */}
      {filteredWallets.length === 0 ? (
        <Card className="rounded-3xl px-5 py-6 ring-1 ring-foreground/[0.06] text-center">
          <p className="text-sm text-muted-foreground">
            {filter === "unsettled"
              ? "未精算の特別財布はありません。"
              : filter === "settled"
                ? "精算済みの特別財布はありません。"
                : "特別財布がまだ登録されていません。"}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredWallets.map((item) => (
            <SpecialWalletCard
              key={item.wallet.name}
              item={item}
              categories={categories}
            />
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

type WalletItem = {
  wallet: { name: string; type: "月次" | "一括"; settled?: boolean };
  totalBudget: number;
  totalUsed: number;
  usagePercentage: number;
  budgetRecords: { walletName: string; categoryName: string; amount: number }[];
};

function SpecialWalletCard({
  item,
  categories,
}: {
  item: WalletItem;
  categories: string[];
}) {
  const { wallet, totalBudget, totalUsed, usagePercentage, budgetRecords } =
    item;

  const settleFetcher = useFetcher<ActionError | null>();

  // 楽観的更新は使わず、ローダー確定値で状態を持つ。
  // ボタンの処理中アニメーションがユーザーへのフィードバック。
  const isSettled = wallet.settled ?? false;
  const isSettling =
    settleFetcher.state !== "idle" &&
    settleFetcher.formData?.get("intent") === "toggle-settled";

  const remaining = totalBudget - totalUsed;
  const isOver = remaining < 0;

  // 精算完了時はプログレスバーを無彩色にして「完了感」を演出する
  const barColor = isSettled
    ? "oklch(0.72 0.02 265)"
    : isOver
      ? "oklch(0.66 0.15 25)"
      : SPECIAL_WALLET_ACCENT_COLOR;

  return (
    <Card
      className={cn(
        "rounded-3xl gap-0 py-0 ring-1 shadow-[0_2px_24px_-12px_oklch(0.30_0.02_30_/_0.15)]",
        // transition-all でローダー更新後のスタイル変化をアニメーションさせる
        "transition-all duration-500",
        isSettled
          ? "opacity-60 ring-foreground/[0.04]"
          : "opacity-100 ring-foreground/[0.06]",
      )}
    >
      {/* Hero: 残り金額 */}
      <div className="px-6 pt-5 pb-6">
        {/* ヘッダー行: 財布名 + 精算完了バッジ / 精算ボタン */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-xs font-medium text-foreground/70 truncate">
              {wallet.name}
            </p>
            {/* 精算完了バッジ（精算済み財布にのみ表示） */}
            {isSettled && (
              <span className="inline-flex items-center gap-1 shrink-0 text-[10px] font-medium text-muted-foreground/80 bg-foreground/[0.06] rounded-full px-2 py-0.5">
                <HugeiconsIcon
                  icon={Tick02Icon}
                  size={10}
                  strokeWidth={2.5}
                  className="opacity-70"
                />
                精算完了
              </span>
            )}
          </div>

          {/* 精算トグルボタン */}
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
            {isSettling ? "処理中…" : isSettled ? "未精算に戻す" : "精算完了"}
          </button>
        </div>

        {/* 残り金額（精算完了・未精算で同じレイアウト） */}
        <p className="text-[11px] text-muted-foreground/80 mb-1">
          {isOver ? "オーバー" : "残り"}
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
          {Math.abs(remaining).toLocaleString()}
        </p>

        {/* プログレスバー */}
        <div className="mt-4 h-1.5 bg-foreground/8 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${Math.min(usagePercentage, 100)}%`,
              backgroundColor: barColor,
            }}
          />
        </div>

        {/* 使用 / 予算 */}
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
      </div>

      {/* カテゴリ予算編集（未精算のみ表示） */}
      {!isSettled && (
        <>
          <Separator className="opacity-60" />
          <div className="px-6 pt-4 pb-5">
            <p className="text-[11px] font-medium text-muted-foreground/80 mb-3">
              予算カテゴリ
            </p>
            {budgetRecords.length > 0 && (
              <div className="space-y-2 mb-3">
                {budgetRecords.map((record, i) => (
                  <BudgetEditRow
                    key={record.categoryName}
                    record={record}
                    color={getCategoryColor(i)}
                  />
                ))}
              </div>
            )}
            <AddBudgetForm
              walletName={wallet.name}
              categories={categories}
              existingCategories={budgetRecords.map((r) => r.categoryName)}
            />
          </div>
        </>
      )}
    </Card>
  );
}

function BudgetEditRow({
  record,
  color,
}: {
  record: { walletName: string; categoryName: string; amount: number };
  color: string;
}) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="flex items-center gap-2">
      <span
        className="size-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs text-foreground/80 flex-1 truncate">
        {record.categoryName}
      </span>
      <form method="post" className="flex items-center gap-1">
        <input type="hidden" name="intent" value="upsert-budget" />
        <input type="hidden" name="walletName" value={record.walletName} />
        <input type="hidden" name="categoryName" value={record.categoryName} />
        <Input
          name="amount"
          type="number"
          defaultValue={record.amount}
          min={0}
          className="h-7 w-24 text-xs text-right rounded-lg px-2 tabular-nums"
        />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          disabled={isSubmitting}
          className="h-7 px-2 text-[11px] text-primary"
        >
          更新
        </Button>
      </form>
      <form method="post">
        <input type="hidden" name="intent" value="delete-budget" />
        <input type="hidden" name="walletName" value={record.walletName} />
        <input type="hidden" name="categoryName" value={record.categoryName} />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          disabled={isSubmitting}
          className="h-7 px-2 text-[11px] text-destructive/70 hover:text-destructive"
        >
          削除
        </Button>
      </form>
    </div>
  );
}

function AddBudgetForm({
  walletName,
  categories,
  existingCategories,
}: {
  walletName: string;
  categories: string[];
  existingCategories: string[];
}) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const available = categories.filter((c) => !existingCategories.includes(c));

  return (
    <form method="post" className="flex items-center gap-2">
      <input type="hidden" name="intent" value="upsert-budget" />
      <input type="hidden" name="walletName" value={walletName} />
      {available.length > 0 ? (
        <select
          name="categoryName"
          className="flex-1 h-7 text-xs rounded-lg border border-input bg-background px-2 text-foreground"
        >
          {available.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      ) : (
        <Input
          name="categoryName"
          placeholder="カテゴリ名"
          className="flex-1 h-7 text-xs rounded-lg"
        />
      )}
      <Input
        name="amount"
        type="number"
        placeholder="金額"
        min={0}
        className="h-7 w-24 text-xs text-right rounded-lg px-2 tabular-nums"
      />
      <Button
        type="submit"
        size="sm"
        disabled={isSubmitting}
        className="h-7 px-3 text-[11px] rounded-full shrink-0"
      >
        追加
      </Button>
    </form>
  );
}

function NewWalletForm({
  categories: _categories,
  onSuccess,
}: {
  categories: string[];
  onSuccess: () => void;
}) {
  const createFetcher = useFetcher<ActionError | null>();
  const inputRef = useRef<HTMLInputElement>(null);
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
    <Card className="rounded-3xl px-5 py-5 ring-1 ring-foreground/[0.06] shadow-[0_2px_24px_-12px_oklch(0.30_0.02_30_/_0.15)]">
      <p className="text-xs font-semibold text-foreground/70 mb-3">
        新しい特別財布を登録
      </p>
      <createFetcher.Form method="post" className="flex gap-2">
        <input type="hidden" name="intent" value="create-wallet" />
        <Input
          ref={inputRef}
          name="walletName"
          placeholder="例: 沖縄旅行、新居家具"
          className="flex-1 h-9 text-sm rounded-2xl"
          required
        />
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-9 px-4 text-sm rounded-2xl shrink-0"
        >
          {isSubmitting ? "登録中…" : "登録"}
        </Button>
      </createFetcher.Form>
    </Card>
  );
}
