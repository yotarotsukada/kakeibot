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
        setState({ phase: "error", message: String(e) });
      }
    })();
  }, []); // マウント時に一度だけ実行

  if (state.phase === "initializing") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-green-500" />
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium text-gray-700">
            LIFFの初期化に失敗しました
          </p>
          <p className="text-xs text-gray-400">{state.message}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
