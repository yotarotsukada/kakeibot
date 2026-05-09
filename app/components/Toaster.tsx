/**
 * 全画面共通のトースト表示エリア。
 *
 * デザイン意図:
 *   - 画面下部に出現（モバイル親指動線、BottomNav の上）
 *   - max-w-md / px-5 で PageLayout と幅・余白を揃える
 *   - 4px の左色帯で variant を視覚的に区別（success/info/error）
 *   - rounded-2xl + soft shadow + slide-in アニメーションで「Family Savings Cheer」のトーンに合わせる
 *
 * 仕組み:
 *   - `toast.success(...)` / `toast.error(...)` がストアに追加 → このコンポーネントが購読・描画
 *   - Radix Toast 上に乗せることでアクセシビリティ（aria-live, スワイプクローズ等）を担保
 */

import {
  Alert02Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Toast } from "radix-ui";
import { useEffect } from "react";
import {
  type ToastItem,
  type ToastVariant,
  toast as toastApi,
  useToasts,
} from "~/lib/toast-store";
import { cn } from "~/lib/utils";

type VariantStyle = {
  icon: typeof CheckmarkCircle02Icon;
  /** カード全体を包む背景・縁取り・テキスト色（design-system §2 のステータスバッジ補助色に準拠） */
  shellClass: string;
  /** アイコン色の text-* */
  iconClass: string;
  /** タイトルの色 */
  titleClass: string;
  /** 説明文の色 */
  descriptionClass: string;
  /** 閉じるボタンの hover 背景・色 */
  closeClass: string;
};

const VARIANT_STYLES: Record<ToastVariant, VariantStyle> = {
  success: {
    icon: CheckmarkCircle02Icon,
    // 朝の若葉のような落ち着いた緑のトーン
    shellClass: "bg-emerald-50/85 ring-1 ring-emerald-200/70",
    iconClass: "text-emerald-600",
    titleClass: "text-emerald-800",
    descriptionClass: "text-emerald-700/80",
    closeClass:
      "text-emerald-700/50 hover:text-emerald-800 hover:bg-emerald-100/70",
  },
  error: {
    icon: Alert02Icon,
    // 既存インラインバナーと揃える（destructive/8 ring-destructive/20）
    shellClass: "bg-destructive/[0.08] ring-1 ring-destructive/25",
    iconClass: "text-destructive",
    titleClass: "text-destructive",
    descriptionClass: "text-destructive/75",
    closeClass:
      "text-destructive/50 hover:text-destructive hover:bg-destructive/10",
  },
  info: {
    icon: InformationCircleIcon,
    // primary を薄めた accent カラーで包む
    shellClass: "bg-accent/70 ring-1 ring-primary/20",
    iconClass: "text-primary",
    titleClass: "text-foreground",
    descriptionClass: "text-muted-foreground",
    closeClass: "text-muted-foreground/60 hover:text-foreground hover:bg-muted",
  },
};

export function Toaster() {
  const items = useToasts();

  return (
    <Toast.Provider swipeDirection="down" duration={4000}>
      {items.map((item) => (
        <ToastEntry key={item.id} item={item} />
      ))}
      <Toast.Viewport
        className={cn(
          // 画面下、BottomNav (高さ ~80px) より少し上に出す
          "fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-5 outline-none",
          // PageLayout と同じ最大幅
          "mx-auto max-w-md",
        )}
      />
    </Toast.Provider>
  );
}

function ToastEntry({ item }: { item: ToastItem }) {
  const style = VARIANT_STYLES[item.variant];

  // Radix の onOpenChange が false になったら（自動消滅 or 手動 close）store からも除去する。
  // duration は item ごとに上書き可能。
  return (
    <Toast.Root
      duration={item.duration}
      onOpenChange={(open) => {
        if (!open) toastApi.dismiss(item.id);
      }}
      className={cn(
        "group w-full rounded-2xl px-4 py-3.5 backdrop-blur-sm",
        "shadow-[0_8px_32px_-12px_oklch(0.30_0.02_30_/_0.18)]",
        // variant 色で全体を囲う（背景 tint + ring）
        style.shellClass,
        // 出現 / 消滅
        "data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:slide-in-from-bottom-4 data-[state=open]:duration-200",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:slide-out-to-bottom-2 data-[state=closed]:duration-150",
        "data-[swipe=move]:translate-y-[var(--radix-toast-swipe-move-y)]",
        "data-[swipe=cancel]:translate-y-0 data-[swipe=cancel]:transition-transform",
        "data-[swipe=end]:animate-out data-[swipe=end]:fade-out",
      )}
    >
      <div className="flex items-start gap-3">
        <HugeiconsIcon
          icon={style.icon}
          size={18}
          strokeWidth={2}
          className={cn("mt-0.5 shrink-0", style.iconClass)}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <Toast.Title
            className={cn(
              "text-sm font-medium leading-snug break-words",
              style.titleClass,
            )}
          >
            {item.title}
          </Toast.Title>
          {item.description && (
            <Toast.Description
              className={cn(
                "mt-1 text-xs leading-relaxed break-words",
                style.descriptionClass,
              )}
            >
              {item.description}
            </Toast.Description>
          )}
        </div>
        <Toast.Close
          aria-label="閉じる"
          className={cn(
            "shrink-0 rounded-full size-6 flex items-center justify-center",
            "transition-colors active:scale-95",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
            style.closeClass,
          )}
        >
          <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={2.5} />
        </Toast.Close>
      </div>
    </Toast.Root>
  );
}

/**
 * `toast` API を再エクスポート。
 * `Toaster` をマウントしているコードからも、フィーチャーコードからも、
 * 同じimportパスでimperativeに使えるように。
 */
export { toast } from "~/lib/toast-store";

/**
 * 単発トーストを発火する hook。
 * useEffect の依存配列で `key` を変えると再度発火する。
 */
export function useToastEffect(
  variant: ToastVariant,
  message: string | null | undefined,
  key: unknown,
) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyの変化のみを検知したい
  useEffect(() => {
    if (!message) return;
    if (variant === "success") toastApi.success(message);
    else if (variant === "error") toastApi.error(message);
    else toastApi.info(message);
  }, [key]);
}
