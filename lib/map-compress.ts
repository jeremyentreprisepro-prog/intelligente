import pako from "pako";

const COMPRESS_THRESHOLD = 1024 * 1024; // 1 Mo

export const MAP_COMPRESS_THRESHOLD = COMPRESS_THRESHOLD;

/** Décompresse une chaîne base64 gzip → objet. */
export function decompressDocument(base64: string): object {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const inflated = pako.ungzip(bytes, { to: "string" });
  return JSON.parse(inflated) as object;
}

/** Compresse un objet en base64 gzip. */
export function compressDocument(doc: object): string {
  const json = JSON.stringify(doc);
  const compressed = pako.gzip(json);
  let binary = "";
  for (let i = 0; i < compressed.length; i++) binary += String.fromCharCode(compressed[i]);
  return btoa(binary);
}
