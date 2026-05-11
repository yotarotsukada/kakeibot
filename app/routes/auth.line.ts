import { redirect } from "react-router";
import { buildAuthorizationUrl } from "~/lib/line-login";
import type { Route } from "./+types/auth.line";

export async function loader({ context }: Route.LoaderArgs) {
  const { env } = (context as { cloudflare: { env: Env } }).cloudflare;
  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();
  const authUrl = buildAuthorizationUrl({
    channelId: env.LINE_LOGIN_CHANNEL_ID,
    callbackUrl: env.LINE_LOGIN_CALLBACK_URL,
    state,
    nonce,
  });
  return redirect(authUrl, {
    headers: {
      "Set-Cookie": `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/`,
    },
  });
}
