import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "map-auth";

export async function GET(request: NextRequest) {
  const host = request.headers.get("host") ?? "localhost:3000";
  const protocol = request.headers.get("x-forwarded-proto") ?? "http";
  const base = `${protocol}://${host}`;
  const res = NextResponse.redirect(new URL("/login", base));
  res.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return res;
}
