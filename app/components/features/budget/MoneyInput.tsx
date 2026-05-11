import { forwardRef } from "react";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

type MoneyInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "prefix"
> & {
  /** ラッパー側に当てる class（width 指定はここで行う想定） */
  wrapperClassName?: string;
};

/**
 * ¥ プレフィックス付きの金額入力。
 *
 * 予算系UIで共通利用するビルディングブロック。
 * width は wrapperClassName で指定する（input は w-full でラッパーに従う）。
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ wrapperClassName, className, ...inputProps }, ref) => {
    return (
      <div className={cn("relative", wrapperClassName)}>
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/60 pointer-events-none">
          ¥
        </span>
        <Input
          ref={ref}
          type="number"
          min={0}
          {...inputProps}
          className={cn(
            "pl-5 text-right tabular-nums font-numeric",
            className,
          )}
        />
      </div>
    );
  },
);
MoneyInput.displayName = "MoneyInput";
