import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { MoneyInput } from "./MoneyInput";

type InlineBudgetFieldProps = {
  name: string;
  /**
   * 初期値。undefined の場合は「未設定」とみなし、入力があれば dirty 扱い。
   * 0 を渡すと "0" 表示で開始（明示的な 0 円予算）。
   */
  initialValue: number | undefined;
  ariaLabel?: string;
  placeholder?: string;
  /** 入力幅などの調整に使う（ラッパー側に当たる） */
  wrapperClassName?: string;
};

/**
 * インライン予算編集フィールド（dirty-aware）。
 *
 * - 値が initialValue から変わった時だけ保存ボタンが fade-in で現れる
 * - 保存ボタン用の領域は常に確保しておりレイアウトシフトしない
 * - Form の中で使う想定（type="submit" のボタンが Form の送信を担う）
 */
export function InlineBudgetField({
  name,
  initialValue,
  ariaLabel = "予算額",
  placeholder,
  wrapperClassName,
}: InlineBudgetFieldProps) {
  const initialStr = initialValue !== undefined ? String(initialValue) : "";
  const [amount, setAmount] = useState<string>(initialStr);

  const isDirty = amount !== initialStr && amount.trim() !== "";
  const isInvalid = amount !== "" && Number(amount) < 0;
  const showSubmit = isDirty && !isInvalid;

  return (
    <div className="flex items-center gap-2">
      <MoneyInput
        name={name}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        aria-label={ariaLabel}
        placeholder={placeholder}
        wrapperClassName={cn("w-28", wrapperClassName)}
        className={cn(
          "font-medium transition-colors",
          isDirty && "ring-2 ring-primary/30 border-primary/40",
        )}
      />
      {/* ボタン領域は常時確保し、表示切り替えでレイアウトシフトしない */}
      <div className="size-6 shrink-0 flex items-center justify-center">
        {showSubmit && (
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
      </div>
    </div>
  );
}
