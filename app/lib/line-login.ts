const AUTH_URL = "https://access.line.me/oauth2/v2.1/authorize";
const TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";
const PROFILE_URL = "https://api.line.me/v2/profile";

export function buildAuthorizationUrl(params: {
  channelId: string;
  callbackUrl: string;
  state: string;
  nonce: string;
}): string {
  const url = new URL(AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.channelId);
  url.searchParams.set("redirect_uri", params.callbackUrl);
  url.searchParams.set("scope", "openid profile");
  url.searchParams.set("state", params.state);
  url.searchParams.set("nonce", params.nonce);
  return url.toString();
}

export async function exchangeCodeForUserId(params: {
  code: string;
  channelId: string;
  channelSecret: string;
  callbackUrl: string;
}): Promise<string> {
  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.callbackUrl,
      client_id: params.channelId,
      client_secret: params.channelSecret,
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(`LINE token exchange failed: ${tokenRes.status}`);
  }
  const { access_token } = (await tokenRes.json()) as { access_token: string };
  if (!access_token) throw new Error("access_token missing in LINE response");

  const profileRes = await fetch(PROFILE_URL, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!profileRes.ok) {
    throw new Error(`LINE profile fetch failed: ${profileRes.status}`);
  }
  const { userId } = (await profileRes.json()) as { userId: string };
  if (!userId) throw new Error("userId missing in LINE profile response");
  return userId;
}
