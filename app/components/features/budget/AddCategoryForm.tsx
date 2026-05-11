import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Form } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

type AddCategoryFormProps = {
  walletName: string;
  selectedMonth: string;
};

/**
 * 新規カテゴリ追加フォーム。
 *
 * デザイン意図:
 *   - 編集リストの末尾に視覚的に「続いて」追加できる空間を提示
 *   - 「あたらしいカテゴリ」をひらがな混じりにして親しみを出す
 *   - 追加ボタンは primary の丸ボタンで「ここを押せばいい」を明確に
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
      <div className="relative">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/60 pointer-events-none">
          ¥
        </span>
        <Input
          type="number"
          name="amount"
          placeholder="金額"
          min={0}
          required
          className="w-24 pl-5 text-right tabular-nums font-numeric bg-muted/40"
        />
      </div>
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
