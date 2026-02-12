import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { createSignedAuthCookie, AUTH_COOKIE_MAX_AGE } from "@/lib/auth-cookie";
import { createClient } from "@/lib/supabase/server";

const COOKIE_NAME = "map-auth";
const COOKIE_MAX_AGE = AUTH_COOKIE_MAX_AGE;

function getAdminPassword(): string {
  return process.env.MAP_PASSWORD_ADMIN ?? "";
}
function getUserPassword(): string {
  return process.env.MAP_PASSWORD_USER ?? "";
}
function getLegacyPassword(): string {
  return process.env.MAP_PASSWORD ?? "";
}

/** Utilisé pour usePassword (affichage du formulaire). Aussi true si Supabase (connexion par compte). */
export function hasAnyPassword(): boolean {
  const hasEnvPasswords = !!(getAdminPassword() || getUserPassword() || getLegacyPassword());
  const hasSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return hasEnvPasswords || hasSupabase;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const login = typeof body?.login === "string" ? body.login.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const adminPwd = getAdminPassword();
  const userPwd = getUserPassword();
  const legacyPwd = getLegacyPassword();

  let role: "admin" | "user" = "admin";
  let accountId: string | undefined;

  if (login) {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: "Service indisponible" }, { status: 500 });
    }
    const { data, error } = await supabase
      .from("accounts")
      .select("id, password_hash")
      .eq("login", login)
      .single();
    if (error || !data) {
      return NextResponse.json({ ok: false, error: "Identifiant ou mot de passe incorrect" }, { status: 401 });
    }
    const ok = await compare(password, data.password_hash);
    if (!ok) {
      return NextResponse.json({ ok: false, error: "Identifiant ou mot de passe incorrect" }, { status: 401 });
    }
    role = "user";
    accountId = data.id;
  } else if (adminPwd && password === adminPwd) {
    role = "admin";
  } else if (userPwd && password === userPwd) {
    role = "user";
  } else if (legacyPwd && password === legacyPwd) {
    role = "admin";
  } else {
    return NextResponse.json({ ok: false, error: "Mot de passe incorrect" }, { status: 401 });
  }

  const signed = createSignedAuthCookie(role, accountId);
  if (!signed) {
    return NextResponse.json({ ok: false, error: "Non configuré" }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true, role });
  res.cookies.set(COOKIE_NAME, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const ok = !!token;
  return NextResponse.json({
    ok: !hasAnyPassword() ? true : ok,
    usePassword: hasAnyPassword(),
  });
}
