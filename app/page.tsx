"use client";

import { Tldraw, createTLStore, getSnapshot, loadSnapshot, defaultShapeUtils, type TLStoreSnapshot } from "tldraw";
import "tldraw/tldraw.css";
import React, { useMemo, useEffect, useRef, useCallback, useState } from "react";
import { LinkCardShapeUtil, createLinkCardShapePartial } from "@/shapes/LinkCardShapeUtil";
import { CollapsibleNodeShapeUtil } from "@/shapes/CollapsibleNodeShapeUtil";
import { MapToolbar } from "@/components/MapToolbar";
import { supabase, MAP_TABLE, MAP_ID } from "@/lib/supabase";

const shapeUtils = [LinkCardShapeUtil, CollapsibleNodeShapeUtil];

function generateSessionId() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const components = { InFrontOfTheCanvas: () => <MapToolbar /> };

const tldrawLicenseKey = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY ?? "" : "";

const onMount = (editor: Parameters<NonNullable<React.ComponentProps<typeof Tldraw>["onMount"]>>[0]) => {
  editor.registerExternalContentHandler("url", async (content) => {
    const point =
      content.point ??
      (editor.inputs.getShiftKey()
        ? editor.inputs.getCurrentPagePoint()
        : editor.getViewportPageBounds().center);

    const partial = createLinkCardShapePartial(content.url, point);
    if (editor.canCreateShape(partial)) {
      editor.createShape(partial).select(partial.id);
    }
  });
};

/** Mode Supabase : carte partagée en temps réel */
function SupabaseMap() {
  const sessionId = useRef(generateSessionId()).current;
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRemoteUpdate = useRef(false);
  const [store, setStore] = useState<ReturnType<typeof createTLStore> | null>(null);
  const _shapeUtils = useMemo(() => [...defaultShapeUtils, ...shapeUtils], []);

  useEffect(() => {
    const s = createTLStore({ shapeUtils: _shapeUtils });

    (async () => {
      try {
        const { data, error: fetchError } = await supabase!
          .from(MAP_TABLE)
          .select("document")
          .eq("id", MAP_ID)
          .single();

        if (!fetchError && data?.document && typeof data.document === "object") {
          try {
            loadSnapshot(s, { document: data.document as TLStoreSnapshot });
          } catch (loadErr) {
            console.warn("Chargement du document ignoré (format invalide?):", loadErr);
          }
        }
      } catch {
        // document vide ou erreur réseau
      }
      setStore(s);
    })();

    return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current); };
  }, [_shapeUtils]);

  useEffect(() => {
    if (!store || !supabase) return;

    const unsubscribe = store.listen(() => {
      if (isRemoteUpdate.current) return;
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        if (!supabase) return;
        const { document: doc } = getSnapshot(store);
        supabase.from(MAP_TABLE).upsert(
          { id: MAP_ID, document: doc, updated_at: new Date().toISOString(), updated_by_session: sessionId },
          { onConflict: "id" }
        ).then(() => { saveTimeout.current = null; }, (e) => console.warn("Erreur sauvegarde Supabase:", (e as Error)?.message ?? e));
      }, 800);
    }, { source: "user", scope: "document" });

    return () => { unsubscribe(); if (saveTimeout.current) clearTimeout(saveTimeout.current); };
  }, [store, sessionId]);

  useEffect(() => {
    if (!store || !supabase) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase.channel("map-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: MAP_TABLE, filter: `id=eq.${MAP_ID}` }, (payload) => {
          try {
            const row = payload.new as { document?: object; updated_by_session?: string } | undefined;
            if (!row?.document || row.updated_by_session === sessionId) return;
            isRemoteUpdate.current = true;
            loadSnapshot(store, { document: row.document as TLStoreSnapshot });
            requestAnimationFrame(() => { isRemoteUpdate.current = false; });
          } catch (e) {
            console.warn("Erreur Realtime loadSnapshot:", e);
          }
        });
      channel.subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("Realtime non disponible (sync désactivé):", err?.message ?? status);
        }
      });
    } catch (e) {
      console.warn("Erreur initialisation Realtime:", e);
    }

    return () => {
      if (channel) supabase?.removeChannel(channel);
    };
  }, [store, sessionId]);

  if (!store) {
    return (
      <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--tl-color-background)" }}>
        <span style={{ color: "var(--tl-color-text-2)" }}>Chargement…</span>
      </div>
    );
  }

  return <Tldraw store={store} shapeUtils={_shapeUtils} components={components} onMount={onMount} licenseKey={tldrawLicenseKey} />;
}

export default function Home() {
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      {supabase ? <SupabaseMap /> : (
        <Tldraw
          persistenceKey="map-intelligente"
          shapeUtils={shapeUtils}
          components={components}
          onMount={onMount}
          licenseKey={tldrawLicenseKey}
        />
      )}
    </div>
  );
}
