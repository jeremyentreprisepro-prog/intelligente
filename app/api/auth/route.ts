import { NextRequest, NextResponse } from "next/server";
import { createSignedAuthCookie, AUTH_COOKIE_MAX_AGE } from "@/lib/auth-cookie";

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

/** Utilisé pour usePassword (affichage du formulaire). */
export function hasAnyPassword(): boolean {
  return !!(getAdminPassword() || getUserPassword() || getLegacyPassword());
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const password = typeof body?.password === "string" ? body.password : "";
  const adminPwd = getAdminPassword();
  const userPwd = getUserPassword();
  const legacyPwd = getLegacyPassword();

  let role: "admin" | "user" = "admin";

  if (adminPwd && password === adminPwd) {
    role = "admin";
  } else if (userPwd && password === userPwd) {
    role = "user";
  } else if (legacyPwd && password === legacyPwd) {
    role = "admin";
  } else {
    return NextResponse.json({ ok: false, error: "Mot de passe incorrect" }, { status: 401 });
  }

  const signed = createSignedAuthCookie(role);
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
