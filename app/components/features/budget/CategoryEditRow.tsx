import { Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";
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

export function CategoryEditRow({
  record,
  walletName,
  selectedMonth,
  color,
  isUsed,
}: CategoryEditRowProps) {
  const navigation = useNavigation();
  const [isConfirming, setIsConfirming] = useState(false);
  const deleteFormRef = useRef<HTMLFormElement>(null);

  const isDeletePending =
    navigation.state !== "idle" &&
    navigation.formData?.get("intent") === "delete" &&
    navigation.formData?.get("categoryName") === record.categoryName;

  const isUpsertPending =
    navigation.state !== "idle" &&
    navigation.formData?.get("intent") === "upsert" &&
    navigation.formData?.get("categoryName") === record.categoryName;

  // 削除成功（redirect → loading → idle）でコンファーム状態をリセット
  const wentThroughLoading = useRef(false);
  useEffect(() => {
    if (isDeletePending) wentThroughLoading.current = true;
    if (navigation.state === "idle" && wentThroughLoading.current) {
      wentThroughLoading.current = false;
      setIsConfirming(false);
    }
  }, [navigation.state, isDeletePending]);

  function handleDeleteClick() {
    if (isUsed) {
      setIsConfirming(true);
    } else {
      deleteFormRef.current?.requestSubmit();
    }
  }

  return (
    <div className="py-3">
      <div className="flex items-center gap-3">
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

        <Form ref={deleteFormRef} method="post">
          <input type="hidden" name="intent" value="delete" />
          <input type="hidden" name="walletName" value={walletName} />
          <input type="hidden" name="month" value={selectedMonth} />
          <input type="hidden" name="categoryName" value={record.categoryName} />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={isDeletePending}
            aria-label={isDeletePending ? "削除中" : "削除"}
            onClick={handleDeleteClick}
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

      {isConfirming && (
        <div className="mt-2 ml-[22px] rounded-xl bg-destructive/8 px-3 py-2.5 flex items-start gap-3">
          <p className="flex-1 text-xs text-destructive/80 leading-relaxed">
            このカテゴリの明細が未分類になります。削除しますか？
          </p>
          <div className="flex gap-1.5 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 text-xs text-muted-foreground"
              onClick={() => setIsConfirming(false)}
            >
              キャンセル
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 px-2.5 text-xs bg-destructive hover:bg-destructive/90 text-white"
              disabled={isDeletePending}
              onClick={() => deleteFormRef.current?.requestSubmit()}
            >
              削除する
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
