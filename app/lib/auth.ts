import { SignJWT, jwtVerify } from "jose";
import { redirect } from "react-router";

function key(secret: string) {
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  lineUserId: string,
  secret: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ purpose: "session" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(lineUserId)
    .setIssuedAt(now)
    .setExpirationTime(now + 30 * 24 * 3600)
    .sign(key(secret));
}

export function sessionCookieHeader(token: string): string {
  return `session=${token}; HttpOnly; Secure; SameSite=Lax; Max-Age=${30 * 24 * 3600}; Path=/`;
}

export async function requireAuth(
  request: Request,
  env: Env,
): Promise<string> {
  if (env.USE_MOCK_AUTH === "true") return "U_MOCK_USER_A";
  const cookie = request.headers.get("Cookie");
  const token = cookie?.match(/(?:^|;\s*)session=([^;]+)/)?.[1];
  if (!token) throw redirect("/auth/line");
  try {
    const { payload } = await jwtVerify(token, key(env.JWT_SECRET));
    if (payload["purpose"] !== "session") throw new Error("invalid purpose");
    return payload.sub!;
  } catch {
    throw redirect("/auth/line");
  }
}
