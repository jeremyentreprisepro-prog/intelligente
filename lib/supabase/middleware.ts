import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATHS = ["/"];
const AUTH_COOKIE_NAME = "map-auth";

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

function base64UrlDecode(str: string): string {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  if (pad) b64 += "=".repeat(4 - pad);
  return atob(b64);
}

async function verifyAuthCookie(value: string): Promise<boolean> {
  const secret = process.env.MAP_AUTH_SECRET || process.env.MAP_PASSWORD;
  if (!secret || !value) return false;
  const parts = value.split(".");
  if (parts.length !== 2) return false;
  const [payloadB64, sigB64] = parts;
  let payload: string;
  try {
    payload = base64UrlDecode(payloadB64);
  } catch {
    return false;
  }
  const payloadParts = payload.split(":");
  const exp = parseInt(payloadParts[payloadParts.length - 1], 10);
  if (Number.isNaN(exp) || Date.now() > exp) return false;

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
  return sigB64FromUs === sigB64;
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (isPublicPath(pathname) || !isProtectedPath(pathname)) {
    return NextResponse.next({ request });
  }

  const pwd = process.env.MAP_PASSWORD;
  if (!pwd) {
    return NextResponse.next({ request });
  }

  const authCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (authCookie && (await verifyAuthCookie(authCookie))) {
    return NextResponse.next({ request });
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/login";
  redirectUrl.searchParams.set("returnUrl", pathname);
  return NextResponse.redirect(redirectUrl);
}
