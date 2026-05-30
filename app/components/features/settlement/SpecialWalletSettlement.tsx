import { ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { WalletSettlement } from "~/features/budget/special-wallet";

export function SpecialWalletSettlement({
  settlement,
}: {
  settlement: WalletSettlement;
}) {
  const { perUser, transfer } = settlement;
  const receiverName = transfer?.to;

  return (
    <div className="mt-5 rounded-2xl bg-foreground/[0.03] px-4 py-3.5">
      <p className="text-[11px] font-semibold text-muted-foreground/80 mb-2.5">
        精算
      </p>
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
                      受取
                    </p>
                    <p className="font-numeric text-sm font-bold tabular-nums text-primary">
                      ¥{transfer.amount.toLocaleString()}
                    </p>
                  </>
                ) : u.deposit > 0 ? (
                  <>
                    <p className="text-[10px] text-muted-foreground/60 mb-0.5">
                      共同口座へ入金
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
    </div>
  );
}
