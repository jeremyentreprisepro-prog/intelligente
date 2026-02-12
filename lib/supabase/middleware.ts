import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATHS = ["/"];
const PASSWORD_COOKIE_NAME = "map-auth";

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

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (isPublicPath(pathname) || !isProtectedPath(pathname)) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    if (!url || !key) return NextResponse.next({ request });
    return NextResponse.next({ request });
  }

  const hasPasswordCookie = !!request.cookies.get(PASSWORD_COOKIE_NAME)?.value;
  if (process.env.MAP_PASSWORD && hasPasswordCookie) {
    return NextResponse.next({ request });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !key) {
    if (process.env.MAP_PASSWORD) {
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

  if (!user && !(process.env.MAP_PASSWORD && hasPasswordCookie)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
