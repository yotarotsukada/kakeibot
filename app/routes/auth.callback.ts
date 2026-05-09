import { redirect } from "react-router";
import { createSessionToken, sessionCookieHeader } from "~/lib/auth";
import { exchangeCodeForUserId } from "~/lib/line-login";
import type { Route } from "./+types/auth.callback";

export async function loader({ request, context }: Route.LoaderArgs) {
  const { env } = (context as { cloudflare: { env: Env } }).cloudflare;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = request.headers
    .get("Cookie")
    ?.match(/oauth_state=([^;]+)/)?.[1];

  if (!code || !state || state !== storedState) {
    return redirect("/auth/line");
  }

  const lineUserId = await exchangeCodeForUserId({
    code,
    channelId: env.LINE_LOGIN_CHANNEL_ID,
    channelSecret: env.LINE_LOGIN_CHANNEL_SECRET,
    callbackUrl: env.LINE_LOGIN_CALLBACK_URL,
  });

  const sessionToken = await createSessionToken(lineUserId, env.JWT_SECRET);
  return redirect("/", {
    headers: {
      "Set-Cookie": [
        sessionCookieHeader(sessionToken),
        "oauth_state=; HttpOnly; Max-Age=0; Path=/",
      ].join(", "),
    },
  });
}
