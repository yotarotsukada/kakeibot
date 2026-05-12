import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

type InlineBudgetFieldProps = {
  name: string;
  /**
   * 初期値。undefined の場合は「未設定」扱いで入力があれば dirty。
   * 0 は明示的なゼロ円予算として扱う。
   */
  initialValue: number | undefined;
  ariaLabel?: string;
  placeholder?: string;
  wrapperClassName?: string;
  /** 保存処理中フラグ。true の間はスピナーを表示し入力を無効化する。 */
  isPending?: boolean;
  /** 編集不可フラグ。精算済みカードなど編集を抑制したいときに使う。 */
  disabled?: boolean;
};

/**
 * インライン予算編集フィールド（dirty-aware）。
 *
 * - 値が initialValue から変わった時だけ保存ボタンが input 内に fade-in
 * - ボタンは absolute 配置なのでレイアウトシフトしない
 * - Form の中で使う想定（type="submit" が Form の送信を担う）
 */
export function InlineBudgetField({
  name,
  initialValue,
  ariaLabel = "予算額",
  placeholder,
  wrapperClassName,
  isPending = false,
  disabled = false,
}: InlineBudgetFieldProps) {
  const initialStr = initialValue !== undefined ? String(initialValue) : "";
  const [amount, setAmount] = useState<string>(initialStr);

  const isDirty = amount !== initialStr && amount.trim() !== "";
  const isInvalid =
    amount !== "" && (Number.isNaN(Number(amount)) || Number(amount) < 0);
  const showSubmit = isDirty && !isInvalid && !disabled;

  return (
    <div className={cn("relative w-28", wrapperClassName)}>
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/60 pointer-events-none z-10">
        ¥
      </span>
      <Input
        type="number"
        name={name}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        min={0}
        disabled={isPending || disabled}
        aria-label={ariaLabel}
        placeholder={placeholder}
        className={cn(
          "pl-5 pr-7 text-right tabular-nums font-numeric font-medium transition-colors",
          isDirty && "ring-2 ring-primary/30 border-primary/40",
          (isPending || disabled) && "opacity-50",
        )}
      />
      {!disabled && isPending ? (
        <span className="absolute right-0.5 top-1/2 -translate-y-1/2 z-10 flex size-[22px] items-center justify-center">
          <span className="size-3 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        </span>
      ) : (
        showSubmit && (
          <Button
            type="submit"
            size="icon-sm"
            aria-label="この変更を保存"
            title="保存"
            className="absolute right-0.5 top-1/2 -translate-y-1/2 z-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm animate-in fade-in zoom-in-90 duration-150"
          >
            <HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={2.5} />
          </Button>
        )
      )}
    </div>
  );
}
