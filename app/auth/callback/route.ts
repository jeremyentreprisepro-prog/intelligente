import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/";
  if (!next.startsWith("/")) next = "/";

  if (code) {
    const supabase = await createClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
        const proto = request.headers.get("x-forwarded-proto") ?? "http";
        const base = `${proto}://${host}`;
        return NextResponse.redirect(`${base}${next}`);
      }
    }
  }

  const host = request.headers.get("host") ?? "localhost:3000";
  return NextResponse.redirect(`http://${host}/login?error=auth`);
}
