import { createHmac } from "crypto";

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 jours

function getSecret(): string {
  return process.env.MAP_AUTH_SECRET || process.env.MAP_PASSWORD || "";
}

/** Crée la valeur du cookie signé (côté serveur API). */
export function createSignedAuthCookie(): string {
  const secret = getSecret();
  if (!secret) return "";
  const exp = Date.now() + COOKIE_MAX_AGE_SEC * 1000;
  const payload = `auth:${exp}`;
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  const payloadB64 = Buffer.from(payload, "utf8").toString("base64url");
  return `${payloadB64}.${sig}`;
}

/** Vérifie le cookie signé (côté serveur Node, ex. API routes). */
export function verifySignedAuthCookie(cookieValue: string): boolean {
  const secret = getSecret();
  if (!secret || !cookieValue) return false;
  const parts = cookieValue.split(".");
  if (parts.length !== 2) return false;
  const [payloadB64, sigB64] = parts;
  let payload: string;
  try {
    payload = Buffer.from(payloadB64, "base64url").toString("utf8");
  } catch {
    return false;
  }
  const payloadParts = payload.split(":");
  const exp = parseInt(payloadParts[payloadParts.length - 1], 10);
  if (Number.isNaN(exp) || Date.now() > exp) return false;
  const expectedSig = createHmac("sha256", secret).update(payload).digest("base64url");
  return expectedSig === sigB64;
}

export const AUTH_COOKIE_MAX_AGE = COOKIE_MAX_AGE_SEC;
