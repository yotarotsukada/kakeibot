import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import {
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { getCategoryColor } from "~/components/features/wallet/categoryColors";
import { SPECIAL_WALLET_ACCENT_COLOR } from "~/components/features/wallet/categoryColors";
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
}: Route.ActionArgs): Promise<ActionError | Response> {
  const { env } = (context as { cloudflare: { env: Env } }).cloudflare;
  await requireAuth(request, env);
  const storage = createStorage(env);

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "create-wallet") {
    const walletName = String(formData.get("walletName") ?? "");
    const result = await createSpecialWallet(walletName, { storage });
    if (!result.ok) return actionError(result.error);
    return redirect("/special-wallets");
  }

  if (intent === "toggle-settled") {
    const walletName = String(formData.get("walletName") ?? "");
    const settled = formData.get("settled") === "true";
    const result = await toggleWalletSettled(walletName, settled, { storage });
    if (!result.ok) return actionError(result.error);
    return redirect("/special-wallets");
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
  const { wallets, categories, filter: initialFilter } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() as ActionError | undefined;
  useActionErrorToast(actionData);

  const [filter, setFilter] = useState<FilterType>(initialFilter);

  const filteredWallets = wallets.filter((item) => {
    if (filter === "unsettled") return !item.wallet.settled;
    if (filter === "settled") return item.wallet.settled;
    return true;
  });

  return (
    <PageLayout>
      <div className="space-y-1 px-1">
        <h1 className="text-lg font-bold text-foreground">特別財布</h1>
        <p className="text-xs text-muted-foreground">
          旅行・家具など月をまたぐ目標予算を管理します。
        </p>
      </div>

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
          {filteredWallets.map((item, _i) => (
            <SpecialWalletCard
              key={item.wallet.name}
              item={item}
              categories={categories}
            />
          ))}
        </div>
      )}

      {/* 新規登録フォーム */}
      <NewWalletForm />
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
    <div className="flex gap-1 bg-muted/50 rounded-2xl p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onFilterChange(tab.value)}
          className={cn(
            "flex-1 text-center text-xs font-semibold py-2 rounded-xl transition-all",
            filter === tab.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
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
  const remaining = totalBudget - totalUsed;
  const isOver = remaining < 0;
  const isSettled = wallet.settled ?? false;

  return (
    <Card
      className={cn(
        "rounded-3xl gap-0 py-0 ring-1 shadow-[0_2px_24px_-12px_oklch(0.30_0.02_30_/_0.15)]",
        isSettled
          ? "ring-foreground/[0.04] bg-muted/30"
          : "ring-foreground/[0.06]",
      )}
    >
      {/* ヘッダー */}
      <div className="px-6 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            {isSettled && (
              <HugeiconsIcon
                icon={Tick02Icon}
                size={14}
                className="text-emerald-600 shrink-0"
                strokeWidth={2}
              />
            )}
            <p
              className={cn(
                "text-sm font-semibold truncate",
                isSettled ? "text-foreground/50" : "text-foreground",
              )}
            >
              {wallet.name}
            </p>
          </div>
          <SettleToggleButton walletName={wallet.name} settled={isSettled} />
        </div>

        {!isSettled && (
          <>
            <p className="text-[11px] text-muted-foreground/80 mb-1">
              {isOver ? "オーバー" : "残り"}
            </p>
            <p
              className={cn(
                "font-numeric text-[2rem] font-extrabold leading-none tracking-tight tabular-nums mb-4",
                isOver ? "text-destructive" : "text-foreground",
              )}
            >
              <span className="text-xl font-bold mr-0.5 align-baseline opacity-70">
                ¥
              </span>
              {Math.abs(remaining).toLocaleString()}
            </p>

            <div className="h-1.5 bg-foreground/8 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${Math.min(usagePercentage, 100)}%`,
                  backgroundColor: isOver
                    ? "oklch(0.66 0.15 25)"
                    : SPECIAL_WALLET_ACCENT_COLOR,
                }}
              />
            </div>

            <div className="mt-2 flex justify-between">
              <p className="font-numeric text-xs tabular-nums text-muted-foreground">
                ¥{totalUsed.toLocaleString()}
                <span className="text-[10px] ml-1 text-muted-foreground/60">
                  使用
                </span>
              </p>
              <p className="font-numeric text-xs tabular-nums text-muted-foreground">
                ¥{totalBudget.toLocaleString()}
                <span className="text-[10px] ml-1 text-muted-foreground/60">
                  予算
                </span>
              </p>
            </div>
          </>
        )}

        {isSettled && totalBudget > 0 && (
          <p className="text-xs text-muted-foreground/50 mt-1">
            合計 ¥{totalUsed.toLocaleString()} / ¥{totalBudget.toLocaleString()}
          </p>
        )}
      </div>

      {/* カテゴリ予算編集（未精算のみ） */}
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

function SettleToggleButton({
  walletName,
  settled,
}: {
  walletName: string;
  settled: boolean;
}) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <form method="post" className="shrink-0">
      <input type="hidden" name="intent" value="toggle-settled" />
      <input type="hidden" name="walletName" value={walletName} />
      <input type="hidden" name="settled" value={settled ? "false" : "true"} />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={isSubmitting}
        className={cn(
          "h-7 px-3 text-[11px] font-semibold rounded-full border",
          settled
            ? "text-muted-foreground border-border/60 hover:text-foreground"
            : "text-emerald-700 border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/60",
        )}
      >
        {settled ? "未精算に戻す" : "精算する"}
      </Button>
    </form>
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
        <input
          type="hidden"
          name="categoryName"
          value={record.categoryName}
        />
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
        <input
          type="hidden"
          name="categoryName"
          value={record.categoryName}
        />
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

function NewWalletForm() {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <Card className="rounded-3xl px-5 py-5 ring-1 ring-foreground/[0.06] shadow-[0_2px_24px_-12px_oklch(0.30_0.02_30_/_0.15)]">
      <p className="text-xs font-semibold text-foreground/70 mb-3">
        新しい特別財布を登録
      </p>
      <form method="post" className="flex gap-2">
        <input type="hidden" name="intent" value="create-wallet" />
        <Input
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
          登録
        </Button>
      </form>
    </Card>
  );
}
