import { Card } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import type { UserSettlement } from "~/features/budget/dashboard";

export function SettlementCard({
  userName,
  advancedAmount,
  transferAmount,
}: UserSettlement) {
  const isReceive = transferAmount < 0;

  return (
    <Card className="rounded-3xl gap-0 py-0 ring-1 ring-foreground/[0.06] shadow-[0_2px_24px_-12px_oklch(0.30_0.02_30_/_0.15)]">
      <div className="px-5 pt-4 pb-5">
        <p className="text-xs font-semibold text-muted-foreground/80 mb-3 truncate">
          {userName}
        </p>
        <p className="text-[10px] text-muted-foreground/60 mb-0.5">
          {isReceive ? "受取" : "振込"}
        </p>
        <p
          className={cn(
            "font-numeric text-2xl font-extrabold leading-none tracking-tight tabular-nums",
            isReceive ? "text-emerald-600" : "text-foreground",
          )}
        >
          <span className="text-base font-bold mr-0.5 align-baseline opacity-70">
            ¥
          </span>
          {Math.abs(transferAmount).toLocaleString()}
        </p>
        <div className="mt-3 pt-3 border-t border-border/60">
          <p className="text-[10px] text-muted-foreground/60">立替</p>
          <p className="font-numeric text-xs tabular-nums text-muted-foreground mt-0.5">
            ¥{advancedAmount.toLocaleString()}
          </p>
        </div>
      </div>
    </Card>
  );
}
