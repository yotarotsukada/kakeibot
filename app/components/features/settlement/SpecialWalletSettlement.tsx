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
  const hasBreakdown = !isSettled && settlement.total > 0;

  return (
    <div className="mt-5 rounded-2xl bg-foreground/[0.03] px-4 py-3.5">
      <div
        className={cn(
          "flex items-center justify-between gap-3",
          hasBreakdown && "mb-3",
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
        <div className="grid grid-cols-2 divide-x divide-border/40">
          {perUser.map((u, i) => {
            const isReceiver = transfer?.to === u.userName;
            const isSender = transfer?.from === u.userName;
            const actions: { label: string; amount: number }[] = [];
            if (isReceiver && transfer) {
              actions.push({ label: "受け取り", amount: transfer.amount });
            } else {
              if (u.deposit > 0) {
                actions.push({ label: "振込", amount: u.deposit });
              }
              if (isSender && transfer) {
                actions.push({ label: "送金", amount: transfer.amount });
              }
            }

            return (
              <div key={u.userName} className={i === 0 ? "pr-3.5" : "pl-3.5"}>
                <p className="text-[10px] font-semibold text-muted-foreground/80 truncate mb-2">
                  {u.userName}
                </p>
                {actions.length > 0 ? (
                  <div className="space-y-1.5">
                    {actions.map((a) => (
                      <div key={a.label}>
                        <p className="text-[10px] text-muted-foreground/60 mb-0.5">
                          {a.label}
                        </p>
                        <p className="font-numeric text-sm font-bold tabular-nums leading-none text-foreground">
                          <span className="text-xs font-bold mr-0.5 align-baseline opacity-70">
                            ¥
                          </span>
                          {a.amount.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground/50">
                    精算なし
                  </p>
                )}
                <div className="mt-2.5">
                  <p className="text-[10px] text-muted-foreground/60">立替</p>
                  <p className="font-numeric text-xs tabular-nums text-muted-foreground mt-0.5">
                    ¥{u.advanced.toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
