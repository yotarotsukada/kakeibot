import { ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { WalletSettlement } from "~/features/budget/special-wallet";
import { cn } from "~/lib/utils";

export function SpecialWalletSettlement({
  settlement,
  isSettled,
  isSettling,
  onToggle,
}: {
  settlement: WalletSettlement;
  isSettled: boolean;
  isSettling: boolean;
  onToggle: () => void;
}) {
  const { perUser, transfer } = settlement;
  const receiverName = transfer?.to;
  // 精算明細は未精算かつ精算対象の支出があるときだけ。精算済みは見出しとトグルのみ。
  const hasBreakdown = !isSettled && settlement.total > 0;

  return (
    <div className="mt-5 rounded-2xl bg-foreground/[0.03] px-4 py-3.5">
      {/* 見出し + 精算トグル: このカードを見たまま精算操作できるよう同じ箱に置く */}
      <div
        className={cn(
          "flex items-center justify-between gap-3",
          hasBreakdown && "mb-2.5",
        )}
      >
        <p className="text-[11px] font-semibold text-muted-foreground/80">
          精算
        </p>
        <button
          type="button"
          disabled={isSettling}
          onClick={onToggle}
          className={cn(
            "shrink-0 h-7 px-3 text-[11px] font-semibold rounded-full border transition-all duration-200",
            isSettling
              ? "animate-pulse text-muted-foreground/50 border-border/40 cursor-wait"
              : isSettled
                ? "text-muted-foreground/60 border-border/50 hover:text-foreground/80 hover:border-border"
                : "text-foreground/75 border-foreground/20 bg-foreground/[0.04] hover:bg-foreground/[0.08]",
          )}
        >
          {isSettling ? "処理中…" : isSettled ? "未精算に戻す" : "精算を完了"}
        </button>
      </div>

      {hasBreakdown && (
        <>
          <div className="space-y-2">
            {perUser.map((u) => {
              const isReceiver = u.userName === receiverName;
              return (
                <div
                  key={u.userName}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {u.userName}
                    </p>
                    <p className="font-numeric text-[10px] tabular-nums text-muted-foreground/60 mt-0.5">
                      立替 ¥{u.advanced.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {isReceiver && transfer ? (
                      <>
                        <p className="text-[10px] text-muted-foreground/60 mb-0.5">
                          受け取り
                        </p>
                        <p className="font-numeric text-sm font-bold tabular-nums text-primary">
                          ¥{transfer.amount.toLocaleString()}
                        </p>
                      </>
                    ) : u.deposit > 0 ? (
                      <>
                        <p className="text-[10px] text-muted-foreground/60 mb-0.5">
                          支払い
                        </p>
                        <p className="font-numeric text-sm font-bold tabular-nums text-foreground">
                          ¥{u.deposit.toLocaleString()}
                        </p>
                      </>
                    ) : (
                      <p className="text-[11px] text-muted-foreground/50">
                        精算なし
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {transfer && (
            <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground min-w-0">
                <span className="truncate">{transfer.from}</span>
                <HugeiconsIcon
                  icon={ArrowRight02Icon}
                  size={14}
                  strokeWidth={2.5}
                  className="text-muted-foreground/70 shrink-0"
                />
                <span className="truncate">{transfer.to}</span>
              </div>
              <p className="font-numeric text-sm font-bold tabular-nums text-foreground shrink-0">
                ¥{transfer.amount.toLocaleString()}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
