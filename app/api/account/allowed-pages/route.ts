import { NextRequest, NextResponse } from "next/server";
import { verifySignedAuthCookie } from "@/lib/auth-cookie";
import { createClient } from "@/lib/supabase/server";

const AUTH_COOKIE_NAME = "map-auth";

/**
 * Retourne la liste des noms de pages tldraw autorisées pour le compte connecté.
 * Si pas de compte (admin, Google, etc.) → 404 (pas de restriction).
 */
export async function GET(request: NextRequest) {
  const cookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!cookie) {
    return NextResponse.json({ error: "Non connecté" }, { status: 404 });
  }
  const parsed = verifySignedAuthCookie(cookie);
  if (!parsed || parsed.role !== "user" || !parsed.accountId) {
    return NextResponse.json({ error: "Pas un compte" }, { status: 404 });
  }
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Indisponible" }, { status: 500 });
  }
  const { data, error } = await supabase
    .from("accounts")
    .select("allowed_pages")
    .eq("id", parsed.accountId)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  }
  const pages = Array.isArray(data.allowed_pages) ? data.allowed_pages.filter((p) => typeof p === "string") : [];
  return NextResponse.json({ allowedPages: pages });
}
