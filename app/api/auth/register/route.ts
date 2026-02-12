import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { createClient } from "@/lib/supabase/server";

const MIN_LOGIN_LEN = 2;
const MAX_LOGIN_LEN = 64;
const MIN_PASSWORD_LEN = 6;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const login = typeof body?.login === "string" ? body.login.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (login.length < MIN_LOGIN_LEN || login.length > MAX_LOGIN_LEN) {
    return NextResponse.json(
      { ok: false, error: `Identifiant entre ${MIN_LOGIN_LEN} et ${MAX_LOGIN_LEN} caractères` },
      { status: 400 }
    );
  }
  if (password.length < MIN_PASSWORD_LEN) {
    return NextResponse.json(
      { ok: false, error: `Mot de passe d’au moins ${MIN_PASSWORD_LEN} caractères` },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Service indisponible" }, { status: 500 });
  }

  const password_hash = await hash(password, 10);

  const { error } = await supabase.from("accounts").insert({
    login,
    password_hash,
    allowed_pages: ["/"],
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: false, error: "Cet identifiant est déjà pris" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
