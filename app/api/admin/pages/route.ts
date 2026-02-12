import { NextRequest, NextResponse } from "next/server";
import { verifySignedAuthCookie } from "@/lib/auth-cookie";
import { createClient } from "@/lib/supabase/server";

const AUTH_COOKIE_NAME = "map-auth";
const CONFIG_KEY = "user_allowed_pages";

function requireAdmin(request: NextRequest): { role: string } | null {
  const cookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!cookie) return null;
  const parsed = verifySignedAuthCookie(cookie);
  return parsed?.role === "admin" ? parsed : null;
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
    .from("app_config")
    .select("value")
    .eq("key", CONFIG_KEY)
    .single();
  if (error || !data?.value) {
    return NextResponse.json({ pages: ["/"] });
  }
  let pages: string[] = ["/"];
  try {
    const parsed = JSON.parse(data.value) as unknown;
    if (Array.isArray(parsed)) pages = parsed.filter((p) => typeof p === "string");
  } catch {
    // keep default
  }
  return NextResponse.json({ pages });
}

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const body = await request.json();
  const raw = body?.pages;
  const pages = Array.isArray(raw)
    ? raw.filter((p) => typeof p === "string").map((p) => String(p).trim()).filter(Boolean)
    : ["/"];
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase non configuré" }, { status: 500 });
  }
  const { error } = await supabase
    .from("app_config")
    .upsert({ key: CONFIG_KEY, value: JSON.stringify(pages) }, { onConflict: "key" });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, pages });
}
