/**
 * Script à lancer en local pour migrer document_compressed → document.
 * Usage (à la racine du projet) :
 *   node scripts/migrate-compressed-to-document.mjs
 * Les variables NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY
 * doivent être dans .env.local ou en variables d'environnement.
 */

import { createClient } from "@supabase/supabase-js";
import { gunzipSync } from "zlib";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvLocal() {
  const path = join(root, ".env.local");
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) {
      const value = m[2].replace(/^["']|["']$/g, "").trim();
      process.env[m[1]] = value;
    }
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const MAP_TABLE = "maps";
const MAP_ID = "map-intelligente";

if (!url || !key) {
  console.error("Manque NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY (dans .env.local ou env).");
  process.exit(1);
}

const supabase = createClient(url, key);

const { data: row, error: fetchError } = await supabase
  .from(MAP_TABLE)
  .select("document_compressed")
  .eq("id", MAP_ID)
  .single();

if (fetchError || !row) {
  console.error("Erreur fetch:", fetchError?.message ?? "Ligne introuvable");
  process.exit(1);
}

const compressedB64 = row.document_compressed;
if (!compressedB64 || typeof compressedB64 !== "string") {
  console.log("Rien à migrer (document_compressed vide).");
  process.exit(0);
}

let document;
try {
  const buffer = Buffer.from(compressedB64, "base64");
  const decompressed = gunzipSync(buffer).toString("utf8");
  document = JSON.parse(decompressed);
} catch (e) {
  console.error("Décompression impossible:", e.message);
  process.exit(1);
}

const { error: updateError } = await supabase
  .from(MAP_TABLE)
  .update({
    document,
    document_compressed: null,
    updated_at: new Date().toISOString(),
    updated_by_session: "migrate-compressed-script",
  })
  .eq("id", MAP_ID);

if (updateError) {
  console.error("Erreur update:", updateError.message);
  process.exit(1);
}

console.log("OK : document_compressed a été décompressé et copié dans document. document_compressed a été vidé.");
