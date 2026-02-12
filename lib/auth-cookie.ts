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

/** Crée la valeur du cookie signé (côté serveur API). */
export function createSignedAuthCookie(role: string): string {
  const secret = getSecret();
  if (!secret) return "";
  const exp = Date.now() + COOKIE_MAX_AGE_SEC * 1000;
  const payload = `${role}:${exp}`;
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  const payloadB64 = Buffer.from(payload, "utf8").toString("base64url");
  return `${payloadB64}.${sig}`;
}

export const AUTH_COOKIE_MAX_AGE = COOKIE_MAX_AGE_SEC;
