import { NextRequest, NextResponse } from "next/server";
import { verifySignedAuthCookie } from "@/lib/auth-cookie";
import { createClient } from "@/lib/supabase/server";

const AUTH_COOKIE_NAME = "map-auth";

function requireAdmin(request: NextRequest): boolean {
  const cookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!cookie) return false;
  const parsed = verifySignedAuthCookie(cookie);
  return parsed?.role === "admin";
}

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase non configuré" }, { status: 500 });
  }
  const { data, error } = await supabase
    .from("accounts")
    .select("id, login, allowed_pages, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ accounts: data ?? [] });
}
