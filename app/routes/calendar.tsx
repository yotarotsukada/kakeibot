import { format, getDay, parse, startOfWeek } from "date-fns";
import { ja } from "date-fns/locale";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  type SlotInfo,
  type View,
} from "react-big-calendar";
import { useFetcher, useLoaderData } from "react-router";
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

// date-fns ローカライザー（日曜始まり）
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 0 }),
  getDay,
  locales: { ja },
});

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

  return {
    entries,
    categories,
    walletName,
    selectedMonth,
    currentMonth,
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

  const optimisticCategory =
    (fetcher.formData?.get("categoryName") as string | null) ?? entry.category;
  const isPending = fetcher.state !== "idle";

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/40 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-numeric tabular-nums">
            {entry.actor}
          </span>
          {entry.memo && (
            <span className="text-xs text-muted-foreground truncate">
              {entry.memo}
            </span>
          )}
        </div>
        <fetcher.Form method="post">
          <input type="hidden" name="entryId" value={entry.id} />
          <select
            name="categoryName"
            defaultValue={optimisticCategory}
            key={optimisticCategory}
            disabled={isPending}
            onChange={(e) => {
              fetcher.submit(
                { entryId: entry.id, categoryName: e.target.value },
                { method: "post" },
              );
            }}
            className="mt-0.5 text-xs rounded-lg border border-border/60 bg-background px-2 py-1 text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50 cursor-pointer"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
            {!categories.includes(optimisticCategory) && (
              <option value={optimisticCategory}>{optimisticCategory}</option>
            )}
          </select>
        </fetcher.Form>
      </div>
      <div className="text-right shrink-0">
        <span
          className={[
            "font-numeric tabular-nums font-semibold text-sm",
            entry.type === "支出" ? "text-foreground" : "text-green-600",
          ].join(" ")}
        >
          {entry.type === "支出" ? "−" : "+"}¥{entry.amount.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

// ---- 日別パネル（スライドアップ） ----------------------------------------

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
  const panelRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // mount 直後にアニメーション開始
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const [, m, d] = date.split("-");
  const label = `${Number(m)}月${Number(d)}日`;
  const total = entries
    .filter((e) => e.type === "支出")
    .reduce((s, e) => s + e.amount, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      role="dialog"
      aria-modal="true"
      aria-label={`${date} の明細`}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      style={{ paddingBottom: 68 }}
    >
      {/* 半透明オーバーレイ（クリックで閉じる） */}
      <button
        type="button"
        className="absolute inset-0 bg-foreground/20 transition-opacity duration-300 cursor-default"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={onClose}
        aria-label="閉じる"
        tabIndex={-1}
      />

      {/* パネル本体 */}
      <div
        ref={panelRef}
        className="relative w-full max-w-md mx-auto rounded-t-3xl bg-background shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        style={{ transform: visible ? "translateY(0)" : "translateY(100%)" }}
      >
        {/* ハンドル */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
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
            className="text-muted-foreground/70 hover:text-foreground transition-colors text-lg leading-none p-1"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        {/* エントリ一覧 */}
        <div className="px-5 overflow-y-auto max-h-[50vh] pb-safe">
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

// ---- カレンダーページ本体 -------------------------------------------------

type CalendarEvent = {
  title: string;
  start: Date;
  end: Date;
  allDay: true;
  resource: string; // YYYY-MM-DD
};

export default function CalendarPage() {
  const { entries, categories, selectedMonth, monthRange } =
    useLoaderData<typeof loader>();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // react-big-calendar は SSR 非対応のため、クライアントでのみレンダリング
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const idx = monthRange.indexOf(selectedMonth);
  const prevMonth = idx > 0 ? monthRange[idx - 1] : null;
  const nextMonth =
    idx >= 0 && idx < monthRange.length - 1 ? monthRange[idx + 1] : null;

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

  // react-big-calendar 用イベント（日ごとに1件）
  const events = useMemo<CalendarEvent[]>(
    () =>
      Object.entries(dailyTotals).map(([dateStr, total]) => {
        // YYYY-MM-DD を Date にパース（ローカル時刻として扱う）
        const [y, m, d] = dateStr.split("-").map(Number);
        const date = new Date(y, m - 1, d);
        return {
          title: `¥${total.toLocaleString()}`,
          start: date,
          end: date,
          allDay: true as const,
          resource: dateStr,
        };
      }),
    [dailyTotals],
  );

  // カレンダーが表示する月を selectedMonth に合わせる
  const calendarDate = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    return new Date(y, m - 1, 1);
  }, [selectedMonth]);

  const selectedEntries = useMemo(
    () => (selectedDate ? entries.filter((e) => e.date === selectedDate) : []),
    [entries, selectedDate],
  );

  const handleSelectSlot = (slot: SlotInfo) => {
    const d = slot.start;
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    setSelectedDate(dateStr);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedDate(event.resource);
  };

  return (
    <PageLayout>
      <MonthSelector
        selectedMonth={selectedMonth}
        prevMonth={prevMonth}
        nextMonth={nextMonth}
        basePath="/calendar"
      />

      {/* カレンダー本体 */}
      <div className="rounded-3xl overflow-hidden ring-1 ring-foreground/[0.06] shadow-[0_2px_24px_-12px_oklch(0.30_0.02_30_/_0.15)] bg-card">
        {mounted ? (
          <Calendar<CalendarEvent>
            localizer={localizer}
            culture="ja"
            defaultView={"month" as View}
            views={["month"]}
            date={calendarDate}
            onNavigate={() => {}}
            events={events}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            selectable
            style={{ height: 420 }}
            toolbar={false}
            eventPropGetter={() => ({
              style: {
                backgroundColor: "oklch(0.74 0.13 28)",
                color: "oklch(0.99 0.005 70)",
                borderRadius: "6px",
                border: "none",
                fontSize: "11px",
                fontWeight: 600,
                padding: "1px 5px",
              },
            })}
          />
        ) : (
          // SSR スケルトン
          <div
            style={{ height: 420 }}
            className="flex items-center justify-center text-sm text-muted-foreground"
          >
            読み込み中…
          </div>
        )}
      </div>

      {/* 日別詳細パネル */}
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
