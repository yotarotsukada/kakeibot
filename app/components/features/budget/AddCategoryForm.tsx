import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef } from "react";
import { Form, useNavigation } from "react-router";
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
  const navigation = useNavigation();
  const isPending =
    navigation.state !== "idle" &&
    navigation.formData?.get("intent") === "upsert";

  const formRef = useRef<HTMLFormElement>(null);
  // 成功時は action が redirect するため state が "loading" を経由する。
  // エラー時は redirect なしで即 "idle" に戻るのでリセットしない。
  const wentThroughLoading = useRef(false);
  useEffect(() => {
    if (navigation.state === "loading") wentThroughLoading.current = true;
    if (navigation.state === "idle" && wentThroughLoading.current) {
      wentThroughLoading.current = false;
      formRef.current?.reset();
    }
  }, [navigation.state]);

  return (
    <Form ref={formRef} method="post" className="flex items-center gap-3 py-3">
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
        disabled={isPending}
        className="flex-1 bg-muted/40 placeholder:text-muted-foreground/60"
      />
      <MoneyInput
        name="amount"
        placeholder="金額"
        required
        disabled={isPending}
        wrapperClassName="w-28"
        className="bg-muted/40"
      />
      <Button
        type="submit"
        size="icon-sm"
        aria-label={isPending ? "追加中" : "追加"}
        disabled={isPending}
        className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shrink-0"
      >
        {isPending ? (
          <span className="size-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
        ) : (
          <HugeiconsIcon icon={PlusSignIcon} size={14} strokeWidth={2.5} />
        )}
      </Button>
    </Form>
  );
}
