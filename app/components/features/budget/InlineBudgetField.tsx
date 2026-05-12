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
}: InlineBudgetFieldProps) {
  const initialStr = initialValue !== undefined ? String(initialValue) : "";
  const [amount, setAmount] = useState<string>(initialStr);

  const isDirty = amount !== initialStr && amount.trim() !== "";
  const isInvalid =
    amount !== "" && (Number.isNaN(Number(amount)) || Number(amount) < 0);
  const showSubmit = isDirty && !isInvalid;

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
        aria-label={ariaLabel}
        placeholder={placeholder}
        className={cn(
          // pr-7 で右側にボタンのスペースを常時確保（数値の表示位置が安定する）
          "pl-5 pr-7 text-right tabular-nums font-numeric font-medium transition-colors",
          isDirty && "ring-2 ring-primary/30 border-primary/40",
        )}
      />
      {showSubmit && (
        <Button
          type="submit"
          size="icon-sm"
          aria-label="この変更を保存"
          title="保存"
          className="absolute right-0.5 top-1/2 -translate-y-1/2 z-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm animate-in fade-in zoom-in-90 duration-150"
        >
          <HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={2.5} />
        </Button>
      )}
    </div>
  );
}
