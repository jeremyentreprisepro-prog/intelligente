import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PASSWORD_COOKIE_NAME = "map-auth";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();

  const host = request.headers.get("host") ?? "localhost:3000";
  const protocol = request.headers.get("x-forwarded-proto") ?? "http";
  const base = `${protocol}://${host}`;
  const res = NextResponse.redirect(new URL("/login", base));
  res.cookies.set(PASSWORD_COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return res;
}
