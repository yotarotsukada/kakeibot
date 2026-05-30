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
        <div className="space-y-2">
          {perUser.map((u) => {
            const isReceiver = transfer?.to === u.userName;
            const isSender = transfer?.from === u.userName;
            // 各人の精算アクション。共同口座への入金は「振込」、相手への
            // 個人間送金は「送金」。送金で個人間のやり取りは示せるため、
            // from→to の別表示ブロックは設けない。
            const actions: {
              label: string;
              amount: number;
              primary: boolean;
            }[] = [];
            if (isReceiver && transfer) {
              actions.push({
                label: "受け取り",
                amount: transfer.amount,
                primary: true,
              });
            } else {
              if (u.deposit > 0) {
                actions.push({
                  label: "振込",
                  amount: u.deposit,
                  primary: false,
                });
              }
              if (isSender && transfer) {
                actions.push({
                  label: "送金",
                  amount: transfer.amount,
                  primary: true,
                });
              }
            }

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
                <div className="text-right shrink-0 space-y-1">
                  {actions.length > 0 ? (
                    actions.map((a) => (
                      <div key={a.label}>
                        <p className="text-[10px] text-muted-foreground/60 mb-0.5">
                          {a.label}
                        </p>
                        <p
                          className={cn(
                            "font-numeric text-sm font-bold tabular-nums",
                            a.primary ? "text-primary" : "text-foreground",
                          )}
                        >
                          ¥{a.amount.toLocaleString()}
                        </p>
                      </div>
                    ))
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
      )}
    </div>
  );
}
