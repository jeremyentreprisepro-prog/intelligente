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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAdmin(_request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase non configuré" }, { status: 500 });
  }
  const { data, error } = await supabase
    .from("accounts")
    .select("id, login, allowed_pages")
    .eq("id", id)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  }
  const pages = Array.isArray(data.allowed_pages) ? data.allowed_pages : ["/"];
  return NextResponse.json({ pages });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const { id } = await params;
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
    .from("accounts")
    .update({ allowed_pages: pages })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, pages });
}
