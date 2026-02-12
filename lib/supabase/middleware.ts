import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATHS = ["/", "/admin"];
const AUTH_COOKIE_NAME = "map-auth";
const AUTH_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7;
/** Chemins réservés à l’admin (pas accessibles au rôle user). */
const ADMIN_ONLY_PATHS = ["/admin"];

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/api")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/login") return true;
  if (pathname === "/signup") return true;
  if (pathname.startsWith("/auth")) return true;
  if (pathname === "/favicon.ico" || pathname.startsWith("/icons/") || pathname.endsWith(".svg")) return true;
  return false;
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname === p || (p !== "/" && pathname.startsWith(p + "/")));
}

/** Cache en mémoire (Edge) pour la liste des pages users, 60 s. */
let cachedUserPages: { paths: string[]; t: number } | null = null;
const CACHE_TTL_MS = 60_000;

async function fetchUserAllowedPathsFromSupabase(): Promise<string[] | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(
      `${url}/rest/v1/app_config?key=eq.user_allowed_pages&select=value`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const row = Array.isArray(data) ? data[0] : null;
    const value = row?.value;
    if (typeof value === "string") {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return parsed.filter((p) => typeof p === "string");
    }
  } catch {
    // ignore
  }
  return null;
}

async function getUserAllowedPaths(): Promise<string[]> {
  const now = Date.now();
  if (cachedUserPages && now - cachedUserPages.t < CACHE_TTL_MS) return cachedUserPages.paths;
  const fromDb = await fetchUserAllowedPathsFromSupabase();
  if (fromDb !== null && fromDb.length > 0) {
    cachedUserPages = { paths: fromDb, t: now };
    return fromDb;
  }
  const raw = process.env.MAP_USER_PAGES ?? "/";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function pathMatches(pathname: string, path: string): boolean {
  return pathname === path || (path !== "/" && pathname.startsWith(path + "/"));
}

/** Cache allowed_pages par account_id (Edge), 60 s. */
const accountPagesCache = new Map<string, { paths: string[]; t: number }>();

async function fetchAccountAllowedPaths(accountId: string): Promise<string[] | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const cached = accountPagesCache.get(accountId);
  if (cached && Date.now() - cached.t < CACHE_TTL_MS) return cached.paths;
  try {
    const res = await fetch(
      `${url}/rest/v1/accounts?id=eq.${encodeURIComponent(accountId)}&select=allowed_pages`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const row = Array.isArray(data) ? data[0] : null;
    const value = row?.allowed_pages;
    if (Array.isArray(value)) {
      const paths = value.filter((p) => typeof p === "string");
      accountPagesCache.set(accountId, { paths, t: Date.now() });
      return paths;
    }
  } catch {
    // ignore
  }
  return null;
}

async function userCanAccess(pathname: string, accountId?: string): Promise<boolean> {
  if (accountId) {
    const accountPaths = await fetchAccountAllowedPaths(accountId);
    if (accountPaths === null) return false;
    return accountPaths.some((p) => pathMatches(pathname, p));
  }
  const allowed = await getUserAllowedPaths();
  return allowed.some((p) => pathMatches(pathname, p));
}

function isAdminOnlyPath(pathname: string): boolean {
  return ADMIN_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/** Base64url → binaire pour atob (ajoute le padding si besoin). */
function base64UrlDecode(str: string): string {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  if (pad) b64 += "=".repeat(4 - pad);
  return atob(b64);
}

/** Vérifie le cookie signé (Edge: Web Crypto). Retourne role et optionnellement accountId (user compte). */
async function verifyAuthCookie(value: string): Promise<{ role: string; accountId?: string } | null> {
  const secret = process.env.MAP_AUTH_SECRET || process.env.MAP_PASSWORD_ADMIN || process.env.MAP_PASSWORD_USER || process.env.MAP_PASSWORD;
  if (!secret || !value) return null;
  const parts = value.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  let payload: string;
  try {
    payload = base64UrlDecode(payloadB64);
  } catch {
    return null;
  }
  const payloadParts = payload.split(":");
  const exp = parseInt(payloadParts[payloadParts.length - 1], 10);
  if (Number.isNaN(exp) || Date.now() > exp) return null;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const sigB64FromUs = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  if (sigB64FromUs !== sigB64) return null;
  if (payloadParts.length === 3 && payloadParts[0] === "user") {
    return { role: "user", accountId: payloadParts[1] };
  }
  const role = payloadParts[0];
  return role ? { role } : null;
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (isPublicPath(pathname) || !isProtectedPath(pathname)) {
    return NextResponse.next({ request });
  }

  const authCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const hasAdminOrUserPasswords = !!(process.env.MAP_PASSWORD_ADMIN || process.env.MAP_PASSWORD_USER);
  const legacyPassword = process.env.MAP_PASSWORD;

  if (authCookie) {
    const parsed = await verifyAuthCookie(authCookie);
    if (parsed) {
      if (parsed.role === "admin") return NextResponse.next({ request });
      if (parsed.role === "user" && isAdminOnlyPath(pathname)) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/login";
        redirectUrl.searchParams.set("returnUrl", pathname);
        redirectUrl.searchParams.set("forbidden", "1");
        return NextResponse.redirect(redirectUrl);
      }
      if (parsed.role === "user" && parsed.accountId) {
        return NextResponse.next({ request });
      }
      if (parsed.role === "user" && (await userCanAccess(pathname, parsed.accountId))) return NextResponse.next({ request });
      if (parsed.role === "user") {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/login";
        redirectUrl.searchParams.set("returnUrl", pathname);
        redirectUrl.searchParams.set("forbidden", "1");
        return NextResponse.redirect(redirectUrl);
      }
    } else if (legacyPassword) {
      return NextResponse.next({ request });
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !key) {
    if (hasAdminOrUserPasswords || legacyPassword) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("returnUrl", pathname);
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (user) return response;

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/login";
  redirectUrl.searchParams.set("returnUrl", pathname);
  return NextResponse.redirect(redirectUrl);
}
