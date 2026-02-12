import { createClient as createBrowserClient } from "./supabase/client";

/** Client Supabase pour le navigateur (carte + auth). Utilise les cookies pour la session. */
export const supabase = createBrowserClient();
export const MAP_TABLE = "maps";
export const MAP_ID = "map-intelligente";
