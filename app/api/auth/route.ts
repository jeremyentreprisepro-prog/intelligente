import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "map-auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 jours

function getExpectedPassword(): string {
  return process.env.MAP_PASSWORD ?? "";
}

function hashPassword(pw: string): string {
  return Buffer.from(pw).toString("base64");
}

export async function POST(request: NextRequest) {
  const expected = getExpectedPassword();
  if (!expected) {
    return NextResponse.json({ ok: false, error: "Non configuré" }, { status: 500 });
  }

  const body = await request.json();
  const password = typeof body?.password === "string" ? body.password : "";

  if (password !== expected) {
    return NextResponse.json({ ok: false, error: "Mot de passe incorrect" }, { status: 401 });
  }

  const token = hashPassword(password + Date.now());
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}

export async function GET(request: NextRequest) {
  const expected = getExpectedPassword();
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const ok = !!token;
  return NextResponse.json({
    ok: !expected ? true : ok,
    usePassword: !!expected,
  });
}
