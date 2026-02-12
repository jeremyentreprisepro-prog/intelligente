import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { gzipSync } from "zlib";
import { MAP_TABLE, MAP_ID } from "@/lib/supabase";

const COMPRESS_THRESHOLD = 1024 * 1024; // 1 Mo

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Supabase non configuré" }, { status: 500 });
  }

  let body: { document?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const document = body?.document;
  if (!document || typeof document !== "object") {
    return NextResponse.json({ error: "document requis (objet)" }, { status: 400 });
  }

  const docStr = JSON.stringify(document);
  if (docStr.length < 300) {
    return NextResponse.json({ error: "Document trop petit (carte vide?)" }, { status: 400 });
  }

  const supabase = createClient(url, key);
  const updatedAt = new Date().toISOString();

  if (docStr.length > COMPRESS_THRESHOLD) {
    const compressed = gzipSync(Buffer.from(docStr, "utf8"));
    const document_compressed = compressed.toString("base64");
    const { error } = await supabase.from(MAP_TABLE).upsert(
      {
        id: MAP_ID,
        document: {},
        document_compressed,
        updated_at: updatedAt,
        updated_by_session: "restore",
      },
      { onConflict: "id" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase.from(MAP_TABLE).upsert(
      {
        id: MAP_ID,
        document,
        document_compressed: null,
        updated_at: updatedAt,
        updated_by_session: "restore",
      },
      { onConflict: "id" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
