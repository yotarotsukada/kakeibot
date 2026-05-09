import { Delete02Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { Form } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import type { BudgetRecord } from "~/domain/budget/budget";

type CategoryEditRowProps = {
  record: BudgetRecord;
  walletName: string;
  selectedMonth: string;
  color: string;
  isUsed: boolean;
};

/**
 * カテゴリ別予算の編集行。
 *
 * UX 設計:
 *   - 入力値が変更されたときだけ「保存」ボタンが現れる（dirty-state-aware）
 *     → 通常は静かなリスト、編集中だけ保存導線が出現
 *     → アイコンの意味が直感的になる（チェック = この変更を保存）
 *   - 削除は常時表示の小さな ✕ ボタン（明細紐付き時は無効化）
 *   - 入力中は ring が灯り、編集中であることを視覚的に伝える
 */
export function CategoryEditRow({
  record,
  walletName,
  selectedMonth,
  color,
  isUsed,
}: CategoryEditRowProps) {
  const [amount, setAmount] = useState<string>(String(record.amount));
  const isDirty = amount !== String(record.amount) && amount !== "";
  const isInvalid = amount !== "" && Number(amount) < 0;

  return (
    <div className="flex items-center gap-3 py-3">
      <span
        className="size-2.5 rounded-full shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className="flex-1 text-sm font-medium text-foreground truncate">
        {record.categoryName}
      </span>

      <Form method="post" className="flex items-center gap-2">
        <input type="hidden" name="intent" value="upsert" />
        <input type="hidden" name="walletName" value={walletName} />
        <input type="hidden" name="month" value={selectedMonth} />
        <input type="hidden" name="categoryName" value={record.categoryName} />
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/60 pointer-events-none">
            ¥
          </span>
          <Input
            type="number"
            name="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={0}
            aria-label="予算額"
            className={`w-24 pl-5 text-right tabular-nums font-numeric font-medium transition-colors ${
              isDirty ? "ring-2 ring-primary/30 border-primary/40" : ""
            }`}
          />
        </div>
        {isDirty && !isInvalid && (
          <Button
            type="submit"
            size="icon-sm"
            aria-label="この変更を保存"
            title="保存"
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm animate-in fade-in zoom-in-90 duration-150"
          >
            <HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={2.5} />
          </Button>
        )}
      </Form>

      <Form method="post">
        <input type="hidden" name="intent" value="delete" />
        <input type="hidden" name="walletName" value={walletName} />
        <input type="hidden" name="month" value={selectedMonth} />
        <input type="hidden" name="categoryName" value={record.categoryName} />
        <Button
          type="submit"
          variant="ghost"
          size="icon-sm"
          disabled={isUsed}
          aria-label="削除"
          title={isUsed ? "明細が紐づいているため削除できません" : "削除"}
          className="rounded-full text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 disabled:text-muted-foreground/20 disabled:hover:bg-transparent"
        >
          <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={1.8} />
        </Button>
      </Form>
    </div>
  );
}
