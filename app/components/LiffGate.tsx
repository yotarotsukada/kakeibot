import { useEffect, useRef, useState } from "react";

type LiffState =
  | { phase: "initializing" }
  | { phase: "ready" }
  | { phase: "error"; message: string };

export function LiffGate({
  liffId,
  useMockLiff,
  children,
}: {
  liffId: string;
  useMockLiff: boolean;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<LiffState>({ phase: "initializing" });
  const initialized = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: LIFF SDK はシングルトンのため再初期化不要
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      try {
        const { default: liff } = await import("@line/liff");

        if (useMockLiff) {
          const { LiffMockPlugin } = await import("@line/liff-mock");
          liff.use(new LiffMockPlugin());
          // mock: true は @line/liff-mock が拡張した init シグネチャ
          await (liff.init as unknown as (c: unknown) => Promise<void>)({
            liffId,
            mock: true,
          });
          // ログイン済み状態をモックに注入し、login() でセッションを確立
          (
            liff as unknown as { $mock: { set: (d: unknown) => void } }
          ).$mock.set({
            isLoggedIn: true,
            getProfile: {
              displayName: "テストユーザー",
              userId: "U_MOCK_USER_A",
              statusMessage: "",
            },
          });
          liff.login(); // mock では redirect せず loginIsCalled をマークするだけ
        } else {
          await liff.init({ liffId });
          if (!liff.isLoggedIn()) {
            liff.login(); // LINE ログインページへリダイレクト
            return; // ページ遷移中のため state 更新しない
          }
        }

        setState({ phase: "ready" });
      } catch (e) {
        setState({
          phase: "error",
          message: e instanceof Error ? e.message : String(e),
        });
      }
    })();
  }, []); // マウント時に一度だけ実行

  if (state.phase === "initializing") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (state.phase === "error") {
    // root ErrorBoundary と同系統のデザイン（Family Savings Cheer トーン）。
    return (
      <div className="min-h-svh flex items-center justify-center px-5 py-10 bg-background">
        <div className="w-full max-w-md space-y-5 text-center">
          <div className="mx-auto size-16 rounded-full bg-destructive/10 ring-1 ring-destructive/15 flex items-center justify-center">
            <span className="text-2xl text-destructive" aria-hidden>
              !
            </span>
          </div>
          <div className="space-y-2">
            <h1 className="text-base font-semibold text-foreground">
              LINE ログインを準備できませんでした
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              通信状況をご確認のうえ、ページを再読み込みしてください。
            </p>
            {import.meta.env.DEV && (
              <p className="pt-1 text-[11px] text-muted-foreground/60 break-all">
                {state.message}
              </p>
            )}
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") window.location.reload();
              }}
              className="inline-flex h-9 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              再読み込み
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
