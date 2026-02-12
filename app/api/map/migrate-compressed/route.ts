import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { gunzipSync } from "zlib";
import { MAP_TABLE, MAP_ID } from "@/lib/supabase";

/**
 * Une seule fois : copie le contenu de document_compressed (décompressé) dans document,
 * puis vide document_compressed.
 * À appeler en GET : ouvre dans le navigateur /api/map/migrate-compressed
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Supabase non configuré" }, { status: 500 });
  }

  const supabase = createClient(url, key);
  const { data: row, error: fetchError } = await supabase
    .from(MAP_TABLE)
    .select("document_compressed")
    .eq("id", MAP_ID)
    .single();

  if (fetchError || !row) {
    return NextResponse.json({ error: fetchError?.message ?? "Ligne introuvable" }, { status: 500 });
  }

  const compressedB64 = row.document_compressed;
  if (!compressedB64 || typeof compressedB64 !== "string") {
    return NextResponse.json({ ok: true, message: "Rien à migrer (document_compressed vide)" });
  }

  let document: object;
  try {
    const buffer = Buffer.from(compressedB64, "base64");
    const decompressed = gunzipSync(buffer).toString("utf8");
    document = JSON.parse(decompressed) as object;
  } catch (e) {
    return NextResponse.json(
      { error: "Décompression impossible: " + (e instanceof Error ? e.message : String(e)) },
      { status: 500 }
    );
  }

  const { error: updateError } = await supabase
    .from(MAP_TABLE)
    .update({
      document,
      document_compressed: null,
      updated_at: new Date().toISOString(),
      updated_by_session: "migrate-compressed",
    })
    .eq("id", MAP_ID);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "document_compressed a été décompressé et copié dans document. document_compressed a été vidé.",
  });
}
