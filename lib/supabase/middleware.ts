import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATHS = ["/"];
const AUTH_COOKIE_NAME = "map-auth";
const AUTH_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7;

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/api")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/login") return true;
  if (pathname.startsWith("/auth")) return true;
  if (pathname === "/favicon.ico" || pathname.startsWith("/icons/") || pathname.endsWith(".svg")) return true;
  return false;
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname === p || (p !== "/" && pathname.startsWith(p + "/")));
}

/** Pages que le rôle "user" peut accéder (env MAP_USER_PAGES, ex. "/,/carte"). */
function getUserAllowedPaths(): string[] {
  const raw = process.env.MAP_USER_PAGES ?? "/";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function userCanAccess(pathname: string): boolean {
  const allowed = getUserAllowedPaths();
  return allowed.some((p) => pathname === p || (p !== "/" && pathname.startsWith(p + "/")));
}

/** Vérifie le cookie signé (Edge: Web Crypto). */
async function verifyAuthCookie(value: string): Promise<{ role: string } | null> {
  const secret = process.env.MAP_AUTH_SECRET || process.env.MAP_PASSWORD_ADMIN || process.env.MAP_PASSWORD_USER || process.env.MAP_PASSWORD;
  if (!secret || !value) return null;
  const parts = value.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  let payload: string;
  try {
    payload = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
  } catch {
    return null;
  }
  const exp = parseInt(payload.split(":")[1], 10);
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
  const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  if (sigBase64 !== sigB64) return null;
  const role = payload.split(":")[0];
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
      if (parsed.role === "user" && userCanAccess(pathname)) return NextResponse.next({ request });
      if (parsed.role === "user" && !userCanAccess(pathname)) {
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
