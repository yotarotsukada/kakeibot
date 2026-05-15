import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import { BottomNav } from "~/components/layout/BottomNav";
import { Toaster } from "~/components/Toaster";
import { AppError } from "~/domain/errors";
import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Zen+Maru+Gothic:wght@400;500;700&display=swap",
  },
  { rel: "manifest", href: "/site.webmanifest" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="家計簿" />
        <meta name="theme-color" content="#F07355" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <>
      <main className="min-h-svh pb-20">
        <Outlet />
      </main>
      <BottomNav />
      <Toaster />
    </>
  );
}

/**
 * 画面全体のエラー表示。
 *
 * 方針:
 *   - 既知のエラー種別 → やさしいユーザー向けメッセージ
 *   - 404 → 専用文言
 *   - 開発時のみ詳細（スタック等）を <details> で折りたたみ表示
 *   - 純黒・SaaS的なテンプレ感を避け、Family Savings Cheer のトーンに合わせる
 */
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let title = "うまくいきませんでした";
  let description =
    "予期しないエラーが発生しました。少し時間をおいてお試しください。";
  let code: string | undefined;

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = "ページが見つかりません";
      description = "URL をご確認ください。";
    } else {
      title = `エラー (${error.status})`;
      description =
        error.statusText ||
        "ページを読み込めませんでした。再読み込みをお試しください。";
    }
  } else if (error instanceof AppError) {
    description = error.userMessage;
    code = error.code;
  }

  const detailMessage =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  return (
    <div className="min-h-svh flex items-center justify-center px-5 py-10 bg-background">
      <div className="w-full max-w-md space-y-5 text-center">
        <div className="mx-auto size-16 rounded-full bg-destructive/10 ring-1 ring-destructive/15 flex items-center justify-center">
          <span className="text-2xl text-destructive" aria-hidden>
            !
          </span>
        </div>
        <div className="space-y-2">
          <h1 className="text-base font-semibold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
          {code && (
            <p className="pt-1 text-[10px] font-numeric tabular-nums text-muted-foreground/60 tracking-wider">
              code: {code}
            </p>
          )}
        </div>
        <div className="pt-2">
          <a
            href="/"
            className="inline-flex h-9 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            ホームに戻る
          </a>
        </div>
        {import.meta.env.DEV && (
          <details className="pt-4 text-left">
            <summary className="cursor-pointer text-xs text-muted-foreground/60 hover:text-muted-foreground select-none">
              開発者向け詳細
            </summary>
            <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-muted/60 p-3 text-[11px] leading-relaxed text-foreground/80">
              <code>{stack ?? detailMessage}</code>
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
