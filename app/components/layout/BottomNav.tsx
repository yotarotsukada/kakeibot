import {
  Coins01Icon,
  PiggyBankIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { NavLink } from "react-router";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold tracking-wide transition-all",
    isActive
      ? "text-primary"
      : "text-muted-foreground/60 hover:text-foreground",
  ].join(" ");

/**
 * BottomNav。
 *
 * デザイン意図:
 *   - 「家計（コイン）」「予算（豚の貯金箱）」「特別財布（★）」のメタファでアプリの性格を伝える
 *   - 選択中は色で示す（追加の装飾は控えて画面を喧しくしない）
 *   - backdrop-blur で背景がほのかに透けて軽快な印象
 */
export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[68px] bg-background/90 backdrop-blur-xl border-t border-border/60 flex items-stretch z-40 pb-[env(safe-area-inset-bottom)]">
      <NavLink to="/" end className={navLinkClass}>
        {({ isActive }) => (
          <>
            <HugeiconsIcon
              icon={Coins01Icon}
              size={22}
              strokeWidth={isActive ? 2 : 1.5}
            />
            <span>家計</span>
          </>
        )}
      </NavLink>
      <NavLink to="/special-wallets" className={navLinkClass}>
        {({ isActive }) => (
          <>
            <HugeiconsIcon
              icon={Wallet01Icon}
              size={22}
              strokeWidth={isActive ? 2 : 1.5}
            />
            <span>財布</span>
          </>
        )}
      </NavLink>
      <NavLink to="/budget" className={navLinkClass}>
        {({ isActive }) => (
          <>
            <HugeiconsIcon
              icon={PiggyBankIcon}
              size={22}
              strokeWidth={isActive ? 2 : 1.5}
            />
            <span>予算</span>
          </>
        )}
      </NavLink>
    </nav>
  );
}
