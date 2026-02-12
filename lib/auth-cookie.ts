import { createHmac } from "crypto";

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 jours

function getSecret(): string {
  return (
    process.env.MAP_AUTH_SECRET ||
    process.env.MAP_PASSWORD_ADMIN ||
    process.env.MAP_PASSWORD_USER ||
    process.env.MAP_PASSWORD ||
    ""
  );
}

/** Crée la valeur du cookie signé (côté serveur API). accountId pour rôle user (compte). */
export function createSignedAuthCookie(role: string, accountId?: string): string {
  const secret = getSecret();
  if (!secret) return "";
  const exp = Date.now() + COOKIE_MAX_AGE_SEC * 1000;
  const payload = accountId && role === "user" ? `user:${accountId}:${exp}` : `${role}:${exp}`;
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  const payloadB64 = Buffer.from(payload, "utf8").toString("base64url");
  return `${payloadB64}.${sig}`;
}

export type AuthCookiePayload = { role: string; accountId?: string };

/** Vérifie le cookie signé (côté serveur Node, ex. API routes). */
export function verifySignedAuthCookie(cookieValue: string): AuthCookiePayload | null {
  const secret = getSecret();
  if (!secret || !cookieValue) return null;
  const parts = cookieValue.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  let payload: string;
  try {
    payload = Buffer.from(payloadB64, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const payloadParts = payload.split(":");
  const exp = parseInt(payloadParts[payloadParts.length - 1], 10);
  if (Number.isNaN(exp) || Date.now() > exp) return null;
  const expectedSig = createHmac("sha256", secret).update(payload).digest("base64url");
  if (expectedSig !== sigB64) return null;
  if (payloadParts.length === 3 && payloadParts[0] === "user") {
    return { role: "user", accountId: payloadParts[1] };
  }
  if (payloadParts.length === 2) {
    const role = payloadParts[0];
    return role ? { role } : null;
  }
  return null;
}

export const AUTH_COOKIE_MAX_AGE = COOKIE_MAX_AGE_SEC;
