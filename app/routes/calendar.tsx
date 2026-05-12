import { useEffect, useMemo, useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { MonthCalendar } from "~/components/features/calendar/MonthCalendar";
import { MonthSelector } from "~/components/features/wallet/MonthSelector";
import { PageLayout } from "~/components/layout/PageLayout";
import {
  GoogleSheetsError,
  ValidationError,
  wrapUnknownError,
} from "~/domain/errors";
import type { LedgerEntryWithId } from "~/domain/storage";
import { createStorage } from "~/infra/factory";
import {
  type ActionError,
  actionError,
  useActionErrorToast,
} from "~/lib/action-result";
import { requireAuth } from "~/lib/auth";
import { buildMonthRange, getCurrentMonthJST, isValidMonth } from "~/lib/date";
import type { Route } from "./+types/calendar";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "カレンダー" }];
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

  const walletName = `${selectedMonth}通常`;
  const [entries, budgetRecords] = await Promise.all([
    storage.getLedgerEntriesForCalendar(walletName),
    storage.getBudgetRecords(walletName),
  ]);

  const categories = budgetRecords.map((b) => b.categoryName);

  return { entries, categories, selectedMonth, monthRange };
}

export async function action({
  request,
  context,
}: Route.ActionArgs): Promise<ActionError | null> {
  const { env } = (context as { cloudflare: { env: Env } }).cloudflare;
  await requireAuth(request, env);
  const storage = createStorage(env);

  const formData = await request.formData();
  const entryId = String(formData.get("entryId") ?? "");
  const categoryName = String(formData.get("categoryName") ?? "");

  if (!entryId || !categoryName) {
    return actionError(
      new ValidationError({
        message: "entryId and categoryName are required",
        userMessage: "必須項目が不足しています。",
      }),
    );
  }

  try {
    await storage.updateLedgerEntryCategory(entryId, categoryName);
    return null;
  } catch (e) {
    const wrapped = e instanceof GoogleSheetsError ? e : wrapUnknownError(e);
    return actionError(wrapped);
  }
}

// ---- カテゴリ選択行 --------------------------------------------------------

const UNCATEGORIZED = "未分類";

function EntryRow({
  entry,
  categories,
}: {
  entry: LedgerEntryWithId;
  categories: string[];
}) {
  const fetcher = useFetcher<typeof action>();
  const actionData = fetcher.data as ActionError | null | undefined;
  useActionErrorToast(actionData);

  // 予算カテゴリにない場合は「未分類」として扱う
  const resolvedCategory = categories.includes(entry.category)
    ? entry.category
    : UNCATEGORIZED;
  const optimisticCategory =
    (fetcher.formData?.get("categoryName") as string | null) ??
    resolvedCategory;
  const isPending = fetcher.state !== "idle";

  // 選択肢: 予算カテゴリ + 「未分類」（常時表示）
  const options = [...categories, UNCATEGORIZED];

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/40 last:border-0">
      <div className="flex-1 min-w-0">
        {entry.memo && (
          <p className="text-xs text-muted-foreground/70 truncate mb-1">
            {entry.memo}
          </p>
        )}
        <select
          key={optimisticCategory}
          defaultValue={optimisticCategory}
          disabled={isPending}
          onChange={(e) => {
            fetcher.submit(
              { entryId: entry.id, categoryName: e.target.value },
              { method: "post", action: "/calendar" },
            );
          }}
          className="text-xs rounded-lg border border-border/60 bg-background px-2 py-1 text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50 cursor-pointer"
        >
          {options.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>
      <span className="font-numeric tabular-nums font-semibold text-sm shrink-0">
        ¥{entry.amount.toLocaleString()}
      </span>
    </div>
  );
}

// ---- 日別パネル（スライドアップ、オーバーレイなし） ----------------------

function DayDetailPanel({
  date,
  entries,
  categories,
  onClose,
}: {
  date: string;
  entries: LedgerEntryWithId[];
  categories: string[];
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const [, m, d] = date.split("-");
  const label = `${Number(m)}月${Number(d)}日`;
  const total = entries
    .filter((e) => e.type === "支出")
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
      <div className="max-w-md mx-auto rounded-t-3xl bg-background border-t border-x border-border/60 shadow-[0_-6px_32px_-6px_oklch(0.30_0.02_30_/_0.18)] overflow-hidden">
        {/* ドラッグハンドル */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-2 border-b border-border/50">
          <div>
            <p className="font-semibold text-base">{label}</p>
            {total > 0 && (
              <p className="text-xs text-muted-foreground font-numeric tabular-nums">
                支出合計 ¥{total.toLocaleString()}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground/60 hover:text-foreground transition-colors p-1 -mr-1"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        {/* エントリ一覧 */}
        <div className="px-5 overflow-y-auto max-h-[45vh] pb-4">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              この日の記録はありません
            </p>
          ) : (
            entries.map((entry) => (
              <EntryRow key={entry.id} entry={entry} categories={categories} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ---- ページ本体 -----------------------------------------------------------

export default function CalendarPage() {
  const { entries, categories, selectedMonth, monthRange } =
    useLoaderData<typeof loader>();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const idx = monthRange.indexOf(selectedMonth);
  const prevMonth = idx > 0 ? monthRange[idx - 1] : null;
  const nextMonth =
    idx >= 0 && idx < monthRange.length - 1 ? monthRange[idx + 1] : null;

  const [year, month] = selectedMonth.split("-").map(Number);

  // 日別支出合計マップ
  const dailyTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of entries) {
      if (e.type === "支出") {
        map[e.date] = (map[e.date] ?? 0) + e.amount;
      }
    }
    return map;
  }, [entries]);

  // 月ナビゲーション時のみパネルを閉じる。
  // カテゴリ更新による entries 再ロードでは selectedMonth は変わらないためパネルは維持される。
  // biome-ignore lint/correctness/useExhaustiveDependencies: selectedMonth が変化したときだけ実行したい（effect 内部では参照しないが trigger として使用）
  useEffect(() => {
    setSelectedDate(null);
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

      {/*
        横方向は -mx-5 で PageLayout の padding を打ち消して全幅表示。
        上下のみ薄いボーダーで区切る。
      */}
      <div className="-mx-5 border-y border-border/40 bg-card">
        <MonthCalendar
          year={year}
          month={month}
          dailyTotals={dailyTotals}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
        />
      </div>

      {/* 日別詳細パネル（オーバーレイなし・ナビ上部に固定） */}
      {selectedDate && (
        <DayDetailPanel
          date={selectedDate}
          entries={selectedEntries}
          categories={categories}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </PageLayout>
  );
}
