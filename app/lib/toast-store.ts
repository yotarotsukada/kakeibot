/**
 * Toast Store: 画面のどこからでも `toast.success(...)` / `toast.error(...)` で呼び出せる
 * 軽量な subscribe ベースのストア。
 *
 * Toaster コンポーネントが `useSyncExternalStore` で購読し、Radix Toast で描画する。
 */

import { useSyncExternalStore } from "react";

export type ToastVariant = "success" | "error" | "info";

export type ToastItem = {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  /** ms。指定がなければ variant ごとの既定値を使う */
  duration?: number;
};

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 4000,
  info: 4000,
  error: 7000,
};

let toasts: ToastItem[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return toasts;
}

function getServerSnapshot() {
  // SSR 時は常に空配列。クライアントで初めてトーストが表示される。
  return EMPTY;
}

const EMPTY: ToastItem[] = [];

function add(input: Omit<ToastItem, "id">): string {
  const id = crypto.randomUUID();
  toasts = [...toasts, { ...input, id }];
  emit();
  return id;
}

function dismiss(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function clear() {
  toasts = [];
  emit();
}

export const toast = {
  success(title: string, description?: string, opts?: { duration?: number }) {
    return add({
      variant: "success",
      title,
      description,
      duration: opts?.duration ?? DEFAULT_DURATION.success,
    });
  },
  error(title: string, description?: string, opts?: { duration?: number }) {
    return add({
      variant: "error",
      title,
      description,
      duration: opts?.duration ?? DEFAULT_DURATION.error,
    });
  },
  info(title: string, description?: string, opts?: { duration?: number }) {
    return add({
      variant: "info",
      title,
      description,
      duration: opts?.duration ?? DEFAULT_DURATION.info,
    });
  },
  dismiss,
  clear,
};

/** Toaster コンポーネント専用：購読してトースト一覧を取得する。 */
export function useToasts(): ToastItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
