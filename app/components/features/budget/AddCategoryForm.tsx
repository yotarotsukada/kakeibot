import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Form } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { MoneyInput } from "./MoneyInput";

type AddCategoryFormProps = {
  walletName: string;
  selectedMonth: string;
};

/**
 * 新規カテゴリ追加フォーム。
 *
 * デザイン意図:
 *   - 編集リストの末尾に視覚的に「続いて」追加できる空間を提示
 *   - 追加ボタンは primary の丸ボタンで「ここを押せばいい」を明確に
 *   - 金額入力は MoneyInput で他の予算系フォームと統一
 */
export function AddCategoryForm({
  walletName,
  selectedMonth,
}: AddCategoryFormProps) {
  return (
    <Form method="post" className="flex items-center gap-3 py-3">
      <span
        className="size-2.5 rounded-full shrink-0 ring-1 ring-dashed ring-muted-foreground/30 ring-offset-0"
        aria-hidden
      />
      <input type="hidden" name="intent" value="upsert" />
      <input type="hidden" name="walletName" value={walletName} />
      <input type="hidden" name="month" value={selectedMonth} />
      <Input
        type="text"
        name="categoryName"
        placeholder="あたらしいカテゴリ"
        required
        className="flex-1 bg-muted/40 placeholder:text-muted-foreground/60"
      />
      <MoneyInput
        name="amount"
        placeholder="金額"
        required
        wrapperClassName="w-28"
        className="bg-muted/40"
      />
      <Button
        type="submit"
        size="icon-sm"
        aria-label="追加"
        className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shrink-0"
      >
        <HugeiconsIcon icon={PlusSignIcon} size={14} strokeWidth={2.5} />
      </Button>
    </Form>
  );
}
