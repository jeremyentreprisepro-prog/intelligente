"use client";

import { Tldraw, createTLStore, getSnapshot, loadSnapshot, defaultShapeUtils, type TLStoreSnapshot } from "tldraw";
import "tldraw/tldraw.css";
import React, { useMemo, useEffect, useRef, useCallback, useState } from "react";
import { LinkCardShapeUtil, createLinkCardShapePartial } from "@/shapes/LinkCardShapeUtil";
import { CollapsibleNodeShapeUtil } from "@/shapes/CollapsibleNodeShapeUtil";
import { MapToolbar } from "@/components/MapToolbar";
import { supabase, MAP_TABLE, MAP_ID } from "@/lib/supabase";

const shapeUtils = [LinkCardShapeUtil, CollapsibleNodeShapeUtil];
const allShapeUtils = [...defaultShapeUtils, ...shapeUtils];

function generateSessionId() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const components = { InFrontOfTheCanvas: () => <MapToolbar /> };

const tldrawLicenseKey = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY ?? "" : "";

type Editor = Parameters<NonNullable<React.ComponentProps<typeof Tldraw>["onMount"]>>[0];

const onMount = (editor: Editor) => {
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

/** Compare deux updated_at ISO : true si a < b (b est plus récent). */
function isNewer(a: string | null, b: string | undefined): boolean {
  if (!b) return false;
  if (!a) return true;
  return a < b;
}

/** Mode Supabase : carte partagée en temps réel */
function SupabaseMap() {
  const sessionId = useRef(generateSessionId()).current;
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRemoteUpdate = useRef(false);
  /** true seulement après le premier chargement (fetch + loadSnapshot) : évite de sauver une carte vide au refresh. */
  const initialLoadDone = useRef(false);
  /** Dernière date de mise à jour qu’on a appliquée (chargement ou save), pour ignorer les événements Realtime en retard. */
  const lastKnownUpdatedAt = useRef<string | null>(null);
  const [store, setStore] = useState<ReturnType<typeof createTLStore> | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const _shapeUtils = useMemo(() => [...defaultShapeUtils, ...shapeUtils], []);

  useEffect(() => {
    const s = createTLStore({ shapeUtils: _shapeUtils });
    setStore(s);

    let cancelled = false;
    (async () => {
      try {
        const { data, error: fetchError } = await supabase!
          .from(MAP_TABLE)
          .select("document, updated_at")
          .eq("id", MAP_ID)
          .single();

        if (cancelled) return;
        if (!fetchError && data?.document && typeof data.document === "object") {
          try {
            isRemoteUpdate.current = true;
            loadSnapshot(s, { document: data.document as TLStoreSnapshot });
            if (data.updated_at) lastKnownUpdatedAt.current = data.updated_at;
          } catch (loadErr) {
            console.warn("Chargement du document ignoré (format invalide?):", loadErr);
          } finally {
            isRemoteUpdate.current = false;
          }
        }
      } catch {
        // ignore
      }
      if (!cancelled) {
        initialLoadDone.current = true;
        setDataLoaded(true);
      }
    })();

    return () => { cancelled = true; if (saveTimeout.current) clearTimeout(saveTimeout.current); };
  }, [_shapeUtils]);

  useEffect(() => {
    if (!store || !supabase) return;

    const doSave = () => {
      if (!initialLoadDone.current) return;
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
        saveTimeout.current = null;
      }
      if (!supabase) return;
      const { document: doc } = getSnapshot(store);
      const docStr = JSON.stringify(doc);
      if (docStr.length < 300) return;
      supabase.from(MAP_TABLE).upsert(
        { id: MAP_ID, document: doc, updated_at: new Date().toISOString(), updated_by_session: sessionId },
        { onConflict: "id" }
      ).then(() => { saveTimeout.current = null; setSaveError(null); }, (e) => setSaveError((e as Error)?.message ?? "Erreur sauvegarde"));
    };

    const unsubscribe = store.listen(() => {
      if (!initialLoadDone.current || isRemoteUpdate.current) return;
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(doSave, 400);
    }, { source: "user", scope: "document" });

    const onVisibilityChange = () => {
      if (initialLoadDone.current && document.visibilityState === "hidden") doSave();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const onBeforeUnload = () => {
      if (initialLoadDone.current) doSave();
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
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

  return (
    <>
      {!dataLoaded && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            padding: "8px 16px",
            background: "var(--tl-color-selected)",
            color: "var(--tl-color-selected-contrast)",
            fontSize: 13,
            textAlign: "center",
          }}
        >
          Chargement de la carte…
        </div>
      )}
      <Tldraw store={store} shapeUtils={_shapeUtils} components={components} onMount={onMount} licenseKey={tldrawLicenseKey} />
    </>
  );
}

export default function Home() {
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      {supabase ? <SupabaseMap /> : (
        <Tldraw
          persistenceKey="map-intelligente"
          shapeUtils={allShapeUtils}
          components={components}
          onMount={onMount}
          licenseKey={tldrawLicenseKey}
        />
      )}
    </div>
  );
}
