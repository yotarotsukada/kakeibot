import { Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Form, useNavigation } from "react-router";
import { Button } from "~/components/ui/button";
import type { BudgetRecord } from "~/domain/budget/budget";
import { InlineBudgetField } from "./InlineBudgetField";

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
 *   - InlineBudgetField で「値が変わった時だけ保存ボタンが現れる」を統一実装
 *     - 保存ボタン領域は常時確保しレイアウトシフトを防ぐ
 *   - 削除は常時表示の小さな ✕ ボタン（明細紐付き時は無効化）
 */
export function CategoryEditRow({
  record,
  walletName,
  selectedMonth,
  color,
  isUsed,
}: CategoryEditRowProps) {
  const navigation = useNavigation();

  const isUpsertPending =
    navigation.state !== "idle" &&
    navigation.formData?.get("intent") === "upsert" &&
    navigation.formData?.get("categoryName") === record.categoryName;

  const isDeletePending =
    navigation.state !== "idle" &&
    navigation.formData?.get("intent") === "delete" &&
    navigation.formData?.get("categoryName") === record.categoryName;

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

      <Form method="post">
        <input type="hidden" name="intent" value="upsert" />
        <input type="hidden" name="walletName" value={walletName} />
        <input type="hidden" name="month" value={selectedMonth} />
        <input type="hidden" name="categoryName" value={record.categoryName} />
        <InlineBudgetField
          name="amount"
          initialValue={record.amount}
          isPending={isUpsertPending}
        />
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
          disabled={isUsed || isDeletePending}
          aria-label={isDeletePending ? "削除中" : "削除"}
          title={isUsed ? "明細が紐づいているため削除できません" : "削除"}
          className="rounded-full text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 disabled:text-muted-foreground/20 disabled:hover:bg-transparent"
        >
          {isDeletePending ? (
            <span className="size-3 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground/60 animate-spin" />
          ) : (
            <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={1.8} />
          )}
        </Button>
      </Form>
    </div>
  );
}
