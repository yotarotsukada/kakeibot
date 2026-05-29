import { Suspense, use, useEffect, useMemo, useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import {
  spendingLensKey,
  UNCATEGORIZED_KEY,
} from "~/components/features/calendar/lens";
import { MonthCalendar } from "~/components/features/calendar/MonthCalendar";
import { getCategoryColor } from "~/components/features/wallet/categoryColors";
import { MonthSelector } from "~/components/features/wallet/MonthSelector";
import { PageLayout } from "~/components/layout/PageLayout";
import {
  GoogleSheetsError,
  ValidationError,
  wrapUnknownError,
} from "~/domain/errors";
import type {
  IncomeEntryWithId,
  LedgerEntryWithId,
  SpendingEntryWithId,
} from "~/domain/storage";
import { createStorage } from "~/infra/factory";
import {
  type ActionError,
  actionError,
  useActionErrorToast,
} from "~/lib/action-result";
import { requireAuth } from "~/lib/auth";
import { buildMonthRange, getCurrentMonthJST, isValidMonth } from "~/lib/date";
import { cn } from "~/lib/utils";
import type { Route } from "./+types/calendar";

// ---- 入金表示用カラー --------------------------------------------------------

const COLOR_INCOME_BG = "oklch(0.93 0.02 165)"; // 入金カード背景（落ち着いた薄緑）
const COLOR_INCOME_DOT = "oklch(0.68 0.09 165)"; // 入金ドット
const COLOR_INCOME_AMOUNT = "oklch(0.48 0.10 165)"; // 入金カード内の金額テキスト
const COLOR_INCOME_TOTAL = "oklch(0.55 0.10 165)"; // 日別パネルの入金合計テキスト

export function meta(_args: Route.MetaArgs) {
  return [{ title: "ふたりの家計簿 | カレンダー" }];
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

  const monthlyWalletName = `${selectedMonth}通常`;

  // カレンダーグリッドに必要なエントリだけ先行 await する。
  // 残り 3 つは並走させたまま deferred Promise として返す。
  const entries = await storage.getLedgerEntriesByMonth(selectedMonth);

  const detailDataPromise = Promise.all([
    storage.getBudgetRecords(monthlyWalletName),
    storage.getWallets(),
    storage.getUsers(),
  ]).then(([budgetRecords, wallets, users]) => ({
    categories: budgetRecords.map((b) => b.categoryName),
    specialWalletNames: wallets
      .filter((w) => w.type === "特別")
      .map((w) => w.name),
    unsettledSpecialWallets: wallets
      .filter((w) => w.type === "特別" && !w.settled)
      .map((w) => w.name),
    userNames: users.map((u) => u.name),
  }));

  return {
    entries,
    detailDataPromise,
    monthlyWalletName,
    selectedMonth,
    monthRange,
  };
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
  const entryId = String(formData.get("entryId") ?? "");

  if (!entryId) {
    return actionError(
      new ValidationError({
        message: "entryId is required",
        userMessage: "必須項目が不足しています。",
      }),
    );
  }

  if (intent === "updateAttribution") {
    const walletName = String(formData.get("walletName") ?? "");
    const categoryName = String(formData.get("categoryName") ?? "");
    try {
      await storage.updateLedgerEntryAttribution(
        entryId,
        walletName,
        categoryName,
      );
      return null;
    } catch (e) {
      const wrapped = e instanceof GoogleSheetsError ? e : wrapUnknownError(e);
      return actionError(wrapped);
    }
  }

  if (intent === "updateActor") {
    const actor = String(formData.get("actor") ?? "");
    try {
      await storage.updateLedgerEntryActor(entryId, actor);
      return null;
    } catch (e) {
      const wrapped = e instanceof GoogleSheetsError ? e : wrapUnknownError(e);
      return actionError(wrapped);
    }
  }

  // 後方互換: カテゴリのみ更新
  const categoryName = String(formData.get("categoryName") ?? "");
  try {
    await storage.updateLedgerEntryCategory(entryId, categoryName);
    return null;
  } catch (e) {
    const wrapped = e instanceof GoogleSheetsError ? e : wrapUnknownError(e);
    return actionError(wrapped);
  }
}

// ---- アトリビューションのエンコード/デコード --------------------------------

// select の value は "CATEGORY:食費" / "WALLET:沖縄旅行" 形式
type AttributionValue = `CATEGORY:${string}` | `WALLET:${string}`;

function encodeAttribution(
  entry: SpendingEntryWithId,
  monthlyWalletName: string,
  specialWalletNames: string[],
  categories: string[],
): AttributionValue {
  if (specialWalletNames.includes(entry.wallet)) {
    return `WALLET:${entry.wallet}`;
  }
  // 月次財布でも特別財布でもない場合: タイプミス等の未知財布 → 未分類として表示
  if (entry.wallet !== monthlyWalletName) {
    return "CATEGORY:";
  }
  return `CATEGORY:${categories.includes(entry.category) ? entry.category : ""}`;
}

function decodeAttribution(
  value: string,
  monthlyWalletName: string,
): { walletName: string; categoryName: string } {
  const colonIdx = value.indexOf(":");
  const type = value.slice(0, colonIdx);
  const name = value.slice(colonIdx + 1);
  if (type === "WALLET") {
    return { walletName: name, categoryName: "一括" };
  }
  return { walletName: monthlyWalletName, categoryName: name };
}

// ---- カテゴリ絞り込みチップ ------------------------------------------------

type CalendarDetailData = {
  categories: string[];
  specialWalletNames: string[];
  unsettledSpecialWallets: string[];
  userNames: string[];
};

const UNCATEGORIZED_COLOR = "oklch(0.72 0 0)";

function FilterChip({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[11px] font-medium transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-foreground/70 hover:bg-muted/70",
      )}
    >
      {color && (
        <span
          className="size-1.5 rounded-full shrink-0"
          style={{ backgroundColor: active ? "currentColor" : color }}
          aria-hidden
        />
      )}
      {label}
    </button>
  );
}

/** deferred データが揃ったら描画するチップ列。Suspense の子として使う。 */
function FilterChipsRow({
  detailDataPromise,
  entries,
  monthlyWalletName,
  activeFilter,
  onFilterChange,
}: {
  detailDataPromise: Promise<CalendarDetailData>;
  entries: LedgerEntryWithId[];
  monthlyWalletName: string;
  activeFilter: string | null;
  onFilterChange: (filter: string | null) => void;
}) {
  const { categories, specialWalletNames } = use(detailDataPromise);

  const chips = useMemo(() => {
    const present = new Set<string>();
    for (const e of entries) {
      const key = spendingLensKey(
        e,
        monthlyWalletName,
        specialWalletNames,
        categories,
      );
      if (key !== null) present.add(key);
    }
    const result: { key: string; label: string; color: string }[] = [];
    categories.forEach((cat, i) => {
      if (present.has(cat))
        result.push({ key: cat, label: cat, color: getCategoryColor(i) });
    });
    if (present.has(UNCATEGORIZED_KEY)) {
      result.push({
        key: UNCATEGORIZED_KEY,
        label: "未分類",
        color: UNCATEGORIZED_COLOR,
      });
    }
    return result;
  }, [entries, categories, specialWalletNames, monthlyWalletName]);

  if (chips.length === 0) return null;

  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-5 px-5 py-0.5">
      <FilterChip
        label="すべて"
        active={activeFilter === null}
        onClick={() => onFilterChange(null)}
      />
      {chips.map((chip) => (
        <FilterChip
          key={chip.key || "__misc__"}
          label={chip.label}
          color={chip.color}
          active={activeFilter === chip.key}
          onClick={() =>
            onFilterChange(activeFilter === chip.key ? null : chip.key)
          }
        />
      ))}
    </div>
  );
}

/**
 * カテゴリレンズ適用中のカレンダーグリッド。
 * deferred データ（categories / specialWalletNames）が揃ってから、
 * 選択カテゴリに一致する支出のみで日別合計を組み直して描画する。
 * 入金は spendingLensKey が null を返すためカテゴリ絞り込み時は集計対象外になり、
 * 日別パネルのヘッダ合計（matchesFilter）と集合が揃う。
 */
function FilteredMonthCalendar({
  detailDataPromise,
  entries,
  monthlyWalletName,
  activeFilter,
  year,
  month,
  selectedDate,
  onDateSelect,
}: {
  detailDataPromise: Promise<CalendarDetailData>;
  entries: LedgerEntryWithId[];
  monthlyWalletName: string;
  activeFilter: string;
  year: number;
  month: number;
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
}) {
  const { categories, specialWalletNames } = use(detailDataPromise);

  const { dailyTotals, dailyIncomes } = useMemo(() => {
    const totals: Record<string, number> = {};
    const incomes: Record<string, number> = {};
    for (const e of entries) {
      const matches =
        spendingLensKey(
          e,
          monthlyWalletName,
          specialWalletNames,
          categories,
        ) === activeFilter;
      if (!matches) continue;
      if (e.type === "支出") {
        totals[e.date] = (totals[e.date] ?? 0) + e.amount;
      } else if (e.type === "入金") {
        incomes[e.date] = (incomes[e.date] ?? 0) + e.amount;
      }
    }
    return { dailyTotals: totals, dailyIncomes: incomes };
  }, [
    entries,
    categories,
    specialWalletNames,
    monthlyWalletName,
    activeFilter,
  ]);

  return (
    <MonthCalendar
      year={year}
      month={month}
      dailyTotals={dailyTotals}
      dailyIncomes={dailyIncomes}
      selectedDate={selectedDate}
      onDateSelect={onDateSelect}
      lensActive
    />
  );
}

// ---- カテゴリ選択行 --------------------------------------------------------

function EntryRow({
  entry,
  categories,
  colorMap,
  specialWalletNames,
  unsettledSpecialWallets,
  monthlyWalletName,
  userNames,
}: {
  entry: SpendingEntryWithId;
  categories: string[];
  colorMap: Map<string, string>;
  specialWalletNames: string[];
  unsettledSpecialWallets: string[];
  monthlyWalletName: string;
  userNames: string[];
}) {
  const fetcher = useFetcher<typeof action>();
  const actorFetcher = useFetcher<typeof action>();
  const actionData = fetcher.data as ActionError | null | undefined;
  const actorActionData = actorFetcher.data as ActionError | null | undefined;
  useActionErrorToast(actionData);
  useActionErrorToast(actorActionData);

  const currentAttribution = encodeAttribution(
    entry,
    monthlyWalletName,
    specialWalletNames,
    categories,
  );
  const optimisticAttribution = useMemo(() => {
    const fd = fetcher.formData;
    if (!fd) return currentAttribution;
    const w = fd.get("walletName") as string | null;
    const c = fd.get("categoryName") as string | null;
    if (w && c !== null) {
      return specialWalletNames.includes(w)
        ? (`WALLET:${w}` as AttributionValue)
        : (`CATEGORY:${c}` as AttributionValue);
    }
    return currentAttribution;
  }, [fetcher.formData, currentAttribution, specialWalletNames]);

  const optimisticActor = useMemo(() => {
    const fd = actorFetcher.formData;
    if (!fd) return entry.actor;
    return String(fd.get("actor") ?? entry.actor);
  }, [actorFetcher.formData, entry.actor]);

  const [actorModalOpen, setActorModalOpen] = useState(false);
  const [actorModalVisible, setActorModalVisible] = useState(false);

  function openActorModal() {
    setActorModalOpen(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setActorModalVisible(true));
    });
  }

  function closeActorModal() {
    setActorModalVisible(false);
    setTimeout(() => setActorModalOpen(false), 250);
  }

  function handleSelectActor(actor: string) {
    actorFetcher.submit(
      { intent: "updateActor", entryId: entry.id, actor },
      { method: "post", action: "/calendar" },
    );
    closeActorModal();
  }

  const isUserActor = userNames.includes(optimisticActor);
  const actorLabel = isUserActor ? `${optimisticActor}立替` : null;

  const isPending = fetcher.state !== "idle";
  const isSpecialWallet = optimisticAttribution.startsWith("WALLET:");
  const optimisticCategory = isSpecialWallet
    ? ""
    : optimisticAttribution.slice("CATEGORY:".length);
  const dotColor = colorMap.get(optimisticCategory) ?? UNCATEGORIZED_COLOR;

  // 現在の財布が精算済みで選択肢にない場合、disabled option として補完する
  const currentWalletName = optimisticAttribution.startsWith("WALLET:")
    ? optimisticAttribution.slice("WALLET:".length)
    : null;
  const needsSettledOption =
    currentWalletName !== null &&
    !unsettledSpecialWallets.includes(currentWalletName);

  return (
    <>
      <div className="bg-background rounded-2xl px-4 py-3 flex items-start gap-3 border border-border/30 shadow-[0_1px_4px_-2px_oklch(0.30_0.02_30_/_0.08)]">
        {/* アトリビューションドット＋セレクト＋アクター＋メモ */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            {isSpecialWallet ? (
              <span
                className="size-2 rounded-full shrink-0 mt-px border border-foreground/40 bg-background"
                aria-hidden
              />
            ) : (
              <span
                className="size-2 rounded-full shrink-0 mt-px"
                style={{ backgroundColor: dotColor }}
                aria-hidden
              />
            )}
            <select
              key={optimisticAttribution}
              defaultValue={optimisticAttribution}
              disabled={isPending}
              onChange={(e) => {
                const { walletName, categoryName } = decodeAttribution(
                  e.target.value,
                  monthlyWalletName,
                );
                fetcher.submit(
                  {
                    intent: "updateAttribution",
                    entryId: entry.id,
                    walletName,
                    categoryName,
                  },
                  { method: "post", action: "/calendar" },
                );
              }}
              className="text-[13px] font-medium rounded-lg border border-border/40 bg-muted px-2 py-0.5 text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50"
            >
              <optgroup label="月次カテゴリ">
                {categories.map((cat) => (
                  <option key={cat} value={`CATEGORY:${cat}`}>
                    {cat}
                  </option>
                ))}
                <option value="CATEGORY:">未分類</option>
              </optgroup>
              <optgroup label="特別財布">
                {unsettledSpecialWallets.map((name) => (
                  <option key={name} value={`WALLET:${name}`}>
                    {name}
                  </option>
                ))}
                {needsSettledOption && (
                  <option value={`WALLET:${currentWalletName}`} disabled>
                    {currentWalletName}（精算済み）
                  </option>
                )}
              </optgroup>
            </select>

            {/* アクタートリガー: バッジ（立替設定時）or 点線丸ボタン（未設定時） */}
            <button
              type="button"
              onClick={openActorModal}
              disabled={actorFetcher.state !== "idle"}
              className={
                actorLabel
                  ? "shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 active:bg-amber-200 transition-colors disabled:opacity-50"
                  : "shrink-0 text-[10px] px-1.5 py-0.5 rounded-full text-muted-foreground/40 border border-border/30 hover:text-muted-foreground/70 hover:border-border/60 transition-colors disabled:opacity-30"
              }
              aria-label={
                actorLabel ? `${actorLabel}（タップで変更）` : "立替を設定"
              }
            >
              {actorLabel ?? "共同"}
            </button>
          </div>

          {entry.memo && (
            <p className="text-[11px] text-muted-foreground/65 truncate pl-4">
              {entry.memo}
            </p>
          )}
        </div>

        {/* 金額 */}
        <span className="font-numeric tabular-nums font-bold text-base text-foreground/90 shrink-0 pt-0.5">
          ¥{entry.amount.toLocaleString()}
        </span>
      </div>

      {/* アクター選択モーダル */}
      {actorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* バックドロップ */}
          <div
            className="absolute inset-0 bg-black/50 transition-opacity duration-200"
            style={{ opacity: actorModalVisible ? 1 : 0 }}
            onClick={closeActorModal}
          />
          {/* ボトムシート */}
          <div
            className="relative w-full max-w-md rounded-t-3xl bg-card border-t border-x border-border/50 shadow-[0_-8px_40px_-4px_oklch(0.30_0.02_30_/_0.20)] overflow-hidden transition-transform duration-[250ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            style={{
              transform: actorModalVisible
                ? "translateY(0)"
                : "translateY(100%)",
            }}
          >
            {/* ドラッグハンドル */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-border/80" />
            </div>

            {/* タイトル */}
            <p className="text-center text-[13px] font-semibold text-muted-foreground pb-1">
              立替を設定
            </p>

            {/* 選択肢 */}
            <div className="px-3 pb-4">
              {(["共同", ...userNames] as string[]).map((name) => {
                const label =
                  name === "共同" ? "共同（立替なし）" : `${name}立替`;
                const isSelected = optimisticActor === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleSelectActor(name)}
                    className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-muted/60 active:bg-muted transition-colors"
                  >
                    <span
                      className={
                        isSelected
                          ? "text-[15px] font-bold text-primary"
                          : "text-[15px] text-foreground"
                      }
                    >
                      {label}
                    </span>
                    {isSelected && (
                      <span className="text-primary font-bold text-base">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}

              <div className="mt-1 border-t border-border/30 pt-1">
                <button
                  type="button"
                  onClick={closeActorModal}
                  className="w-full py-3 text-[14px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---- 入金行（カテゴリ・財布の選択なし） ----------------------------------

function IncomeRow({ entry }: { entry: IncomeEntryWithId }) {
  return (
    <div
      className="rounded-2xl px-4 py-3 flex items-start gap-3"
      style={{ backgroundColor: COLOR_INCOME_BG }}
    >
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2">
          <span
            className="size-2 rounded-full shrink-0 mt-px"
            style={{ backgroundColor: COLOR_INCOME_DOT }}
            aria-hidden
          />
          <span className="text-[13px] font-medium text-foreground/80">
            入金
          </span>
          <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-border/40 text-muted-foreground/70">
            {entry.actor}
          </span>
        </div>
        {entry.memo && (
          <p className="text-[11px] text-muted-foreground/65 truncate pl-4">
            {entry.memo}
          </p>
        )}
      </div>
      <span
        className="font-numeric tabular-nums font-bold text-base shrink-0 pt-0.5"
        style={{ color: COLOR_INCOME_AMOUNT }}
      >
        +¥{entry.amount.toLocaleString()}
      </span>
    </div>
  );
}

// ---- 日別パネル（スライドアップ、オーバーレイなし） ----------------------

/** deferred データ待ちのスケルトン。実際はほぼ瞬時に切り替わる。 */
function DayPanelSkeleton({
  date,
  onClose,
}: {
  date: string;
  onClose: () => void;
}) {
  const [, m, d] = date.split("-");
  const label = `${Number(m)}月${Number(d)}日`;
  return (
    <div className="fixed inset-x-0 z-30" style={{ bottom: 68 }}>
      <div className="max-w-md mx-auto rounded-t-3xl bg-card border-t border-x border-border/50 shadow-[0_-8px_40px_-4px_oklch(0.30_0.02_30_/_0.20)]">
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-border/80" />
        </div>
        <div className="flex items-start justify-between px-5 pb-5">
          <p className="font-bold text-lg">{label}</p>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground/50 hover:text-foreground transition-colors p-1 -mr-1 mt-0.5"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

/** deferred データが揃ったら DayDetailPanel を描画する薄いラッパー。 */
function DayDetailPanelDeferred({
  detailDataPromise,
  date,
  entries,
  monthlyWalletName,
  activeFilter,
  onClose,
}: {
  detailDataPromise: Promise<CalendarDetailData>;
  date: string;
  entries: LedgerEntryWithId[];
  monthlyWalletName: string;
  activeFilter: string | null;
  onClose: () => void;
}) {
  const { categories, specialWalletNames, unsettledSpecialWallets, userNames } =
    use(detailDataPromise);
  return (
    <DayDetailPanel
      date={date}
      entries={entries}
      categories={categories}
      specialWalletNames={specialWalletNames}
      unsettledSpecialWallets={unsettledSpecialWallets}
      monthlyWalletName={monthlyWalletName}
      userNames={userNames}
      activeFilter={activeFilter}
      onClose={onClose}
    />
  );
}

function DayDetailPanel({
  date,
  entries,
  categories,
  specialWalletNames,
  unsettledSpecialWallets,
  monthlyWalletName,
  userNames,
  activeFilter,
  onClose,
}: {
  date: string;
  entries: LedgerEntryWithId[];
  categories: string[];
  specialWalletNames: string[];
  unsettledSpecialWallets: string[];
  monthlyWalletName: string;
  userNames: string[];
  activeFilter: string | null;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // カテゴリ名 → カラー の Map（順序でパレットを割り当て）
  const colorMap = useMemo(
    () => new Map(categories.map((cat, i) => [cat, getCategoryColor(i)])),
    [categories],
  );

  const [, m, d] = date.split("-");
  const label = `${Number(m)}月${Number(d)}日`;
  // レンズ適用中はヘッダ合計もカレンダーセルと揃え、該当カテゴリのみ集計する。
  const matchesFilter = (entry: LedgerEntryWithId) =>
    activeFilter === null ||
    spendingLensKey(
      entry,
      monthlyWalletName,
      specialWalletNames,
      categories,
    ) === activeFilter;
  const totalSpending = entries
    .filter((e) => e.type === "支出" && matchesFilter(e))
    .reduce((s, e) => s + e.amount, 0);
  const totalIncome = entries
    .filter((e) => e.type === "入金" && matchesFilter(e))
    .reduce((s, e) => s + e.amount, 0);

  return (
    // bottom: 68px = BottomNav の高さ分上に配置。オーバーレイなし。
    <div
      className="fixed inset-x-0 z-30 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
      style={{
        bottom: 68,
        transform: visible ? "translateY(0)" : "translateY(110%)",
      }}
    >
      <div className="max-w-md mx-auto rounded-t-3xl bg-card border-t border-x border-border/50 shadow-[0_-8px_40px_-4px_oklch(0.30_0.02_30_/_0.20)] overflow-hidden">
        {/* ドラッグハンドル */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-border/80" />
        </div>

        {/* ヘッダー */}
        <div className="flex items-start justify-between px-5 pb-3">
          <div>
            <p className="font-bold text-lg leading-tight">{label}</p>
            {(totalSpending > 0 || totalIncome > 0) && (
              <div className="flex items-center gap-3 mt-0.5">
                {totalSpending > 0 && (
                  <div className="flex items-baseline gap-1">
                    <span className="text-[11px] text-muted-foreground">
                      支出
                    </span>
                    <span className="font-numeric tabular-nums font-bold text-base text-primary">
                      ¥{totalSpending.toLocaleString()}
                    </span>
                  </div>
                )}
                {totalIncome > 0 && (
                  <div className="flex items-baseline gap-1">
                    <span className="text-[11px] text-muted-foreground">
                      入金
                    </span>
                    <span
                      className="font-numeric tabular-nums font-bold text-base"
                      style={{ color: COLOR_INCOME_TOTAL }}
                    >
                      +¥{totalIncome.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground/50 hover:text-foreground transition-colors p-1 -mr-1 mt-0.5"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        {/* エントリ一覧（muted 背景 + カード形式） */}
        <div className="bg-muted/30 border-t border-border/40 px-3 py-3 overflow-y-auto max-h-[45vh] space-y-2">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-5">
              この日の記録はありません
            </p>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className={cn(
                  "transition-opacity",
                  !matchesFilter(entry) && "opacity-35",
                )}
              >
                {entry.type === "入金" ? (
                  <IncomeRow entry={entry} />
                ) : (
                  <EntryRow
                    entry={entry}
                    categories={categories}
                    colorMap={colorMap}
                    specialWalletNames={specialWalletNames}
                    unsettledSpecialWallets={unsettledSpecialWallets}
                    monthlyWalletName={monthlyWalletName}
                    userNames={userNames}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ---- ページ本体 -----------------------------------------------------------

export default function CalendarPage() {
  const {
    entries,
    detailDataPromise,
    monthlyWalletName,
    selectedMonth,
    monthRange,
  } = useLoaderData<typeof loader>();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // カテゴリレンズ。null = すべて / カテゴリ名 / UNCATEGORIZED_KEY（未分類）。
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const idx = monthRange.indexOf(selectedMonth);
  const prevMonth = idx > 0 ? monthRange[idx - 1] : null;
  const nextMonth =
    idx >= 0 && idx < monthRange.length - 1 ? monthRange[idx + 1] : null;

  const [year, month] = selectedMonth.split("-").map(Number);

  // レンズ未適用時（およびレンズ適用中の fallback）に使う全エントリ合計。
  // deferred データ不要で即時描画できる。レンズ適用時は FilteredMonthCalendar が組み直す。
  const dailyTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of entries) {
      if (e.type === "支出") map[e.date] = (map[e.date] ?? 0) + e.amount;
    }
    return map;
  }, [entries]);

  const dailyIncomes = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of entries) {
      if (e.type === "入金") map[e.date] = (map[e.date] ?? 0) + e.amount;
    }
    return map;
  }, [entries]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: selectedMonth が変化したときだけ実行したい（effect 内部では参照しないが trigger として使用）
  useEffect(() => {
    setSelectedDate(null);
    setActiveFilter(null);
  }, [selectedMonth]);

  const selectedEntries = useMemo(
    () => (selectedDate ? entries.filter((e) => e.date === selectedDate) : []),
    [entries, selectedDate],
  );

  const handleDateSelect = (date: string) => {
    setSelectedDate((prev) => (prev === date ? null : date));
  };

  return (
    <PageLayout>
      <MonthSelector
        selectedMonth={selectedMonth}
        prevMonth={prevMonth}
        nextMonth={nextMonth}
        basePath="/calendar"
      />

      {/* カテゴリレンズ: deferred データが揃い次第チップを描画 */}
      <Suspense fallback={null}>
        <FilterChipsRow
          detailDataPromise={detailDataPromise}
          entries={entries}
          monthlyWalletName={monthlyWalletName}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />
      </Suspense>

      {/*
        横方向は -mx-5 で PageLayout の padding を打ち消して全幅表示。
        上下のみ薄いボーダーで区切る。
      */}
      <div className="-mx-5 border-y border-border/40 bg-card">
        {activeFilter === null ? (
          // レンズ未適用時は全エントリ合計を即時描画（deferred データ不要）。
          <MonthCalendar
            year={year}
            month={month}
            dailyTotals={dailyTotals}
            dailyIncomes={dailyIncomes}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
          />
        ) : (
          // レンズ適用中は deferred データで該当カテゴリのみの合計に組み直す。
          // フィルタチップ自体が deferred 解決後にしか現れないため fallback はほぼ通らないが、
          // 念のため全合計表示でセルの欠落を防ぐ。
          <Suspense
            fallback={
              <MonthCalendar
                year={year}
                month={month}
                dailyTotals={dailyTotals}
                dailyIncomes={dailyIncomes}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
              />
            }
          >
            <FilteredMonthCalendar
              detailDataPromise={detailDataPromise}
              entries={entries}
              monthlyWalletName={monthlyWalletName}
              activeFilter={activeFilter}
              year={year}
              month={month}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
            />
          </Suspense>
        )}
      </div>

      {/* 日別詳細パネル（オーバーレイなし・ナビ上部に固定） */}
      {selectedDate && (
        <Suspense
          fallback={
            <DayPanelSkeleton
              date={selectedDate}
              onClose={() => setSelectedDate(null)}
            />
          }
        >
          <DayDetailPanelDeferred
            detailDataPromise={detailDataPromise}
            date={selectedDate}
            entries={selectedEntries}
            monthlyWalletName={monthlyWalletName}
            activeFilter={activeFilter}
            onClose={() => setSelectedDate(null)}
          />
        </Suspense>
      )}
    </PageLayout>
  );
}
