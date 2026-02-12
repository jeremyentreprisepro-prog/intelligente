import { NextRequest, NextResponse } from "next/server";
import { createSignedAuthCookie, AUTH_COOKIE_MAX_AGE } from "@/lib/auth-cookie";

const COOKIE_NAME = "map-auth";
const COOKIE_MAX_AGE = AUTH_COOKIE_MAX_AGE;

function getPassword(): string {
  return process.env.MAP_PASSWORD ?? "";
}

export function hasAnyPassword(): boolean {
  return !!getPassword();
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const password = typeof body?.password === "string" ? body.password.trim() : "";
  const pwd = getPassword();

  if (!pwd) {
    return NextResponse.json(
      { ok: false, error: "Connexion désactivée (MAP_PASSWORD non défini)" },
      { status: 500 }
    );
  }

  if (password !== pwd) {
    return NextResponse.json({ ok: false, error: "Mot de passe incorrect" }, { status: 401 });
  }

  const signed = createSignedAuthCookie();
  if (!signed) {
    return NextResponse.json(
      { ok: false, error: "Connexion désactivée (MAP_PASSWORD ou MAP_AUTH_SECRET requis)" },
      { status: 500 }
    );
  }

  const res = NextResponse.json({ ok: true });
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
  return NextResponse.json({
    ok: !hasAnyPassword() ? true : !!token,
    usePassword: hasAnyPassword(),
  });
}
