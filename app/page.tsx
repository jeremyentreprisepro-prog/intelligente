"use client";

import { Tldraw, createTLStore, getSnapshot, loadSnapshot, defaultShapeUtils, type TLStoreSnapshot } from "tldraw";
import "tldraw/tldraw.css";
import React, { useMemo, useEffect, useRef, useCallback, useState } from "react";
import { LinkCardShapeUtil, createLinkCardShapePartial } from "@/shapes/LinkCardShapeUtil";
import { CollapsibleNodeShapeUtil } from "@/shapes/CollapsibleNodeShapeUtil";
import { MapToolbar } from "@/components/MapToolbar";
import { supabase, MAP_TABLE, MAP_ID } from "@/lib/supabase";
import { decompressDocument, compressDocument, MAP_COMPRESS_THRESHOLD } from "@/lib/map-compress";

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
  const doSaveRef = useRef<(() => void) | null>(null);
  const saveWasManualRef = useRef(false);
  const _shapeUtils = useMemo(() => [...defaultShapeUtils, ...shapeUtils], []);

  useEffect(() => {
    const s = createTLStore({ shapeUtils: _shapeUtils });
    setStore(s);

    let cancelled = false;
    const enableSaves = () => {
      if (!cancelled) initialLoadDone.current = true;
    };
    const safetyTimer = setTimeout(enableSaves, 3000);

    (async () => {
      try {
        const { data, error: fetchError } = await supabase!
          .from(MAP_TABLE)
          .select("document, document_compressed, updated_at")
          .eq("id", MAP_ID)
          .single();

        if (cancelled) return;
        if (!fetchError && data) {
          const d = data as { document?: object; document_compressed?: string; updated_at?: string };
          let doc: object | null = null;
          if (typeof d?.document_compressed === "string" && d.document_compressed.length > 0) {
            try {
              doc = decompressDocument(d.document_compressed);
            } catch {
              // ignore
            }
          } else if (d?.document && typeof d.document === "object") {
            doc = d.document;
          }
          if (doc && JSON.stringify(doc).length >= 300) {
            try {
              isRemoteUpdate.current = true;
              loadSnapshot(s, { document: doc as TLStoreSnapshot });
            } finally {
              isRemoteUpdate.current = false;
            }
          }
          if (d?.updated_at) lastKnownUpdatedAt.current = d.updated_at;
        }
      } catch {
        // ignore
      }
      enableSaves();
    })();

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
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
      const updatedAt = new Date().toISOString();
      const useCompressed = docStr.length > MAP_COMPRESS_THRESHOLD;
      const payload: Record<string, unknown> = {
        id: MAP_ID,
        updated_at: updatedAt,
        updated_by_session: sessionId,
      };
      if (useCompressed) {
        payload.document = {};
        payload.document_compressed = compressDocument(doc);
      } else {
        payload.document = doc;
      }
      const runSave = (retryCount: number) => {
        if (!supabase) return;
        supabase
          .from(MAP_TABLE)
          .upsert(payload, { onConflict: "id" })
          .then(
            () => {
              saveTimeout.current = null;
              setSaveError(null);
              lastKnownUpdatedAt.current = updatedAt;
              const manual = saveWasManualRef.current;
              saveWasManualRef.current = false;
              window.dispatchEvent(new CustomEvent("map-saved", { detail: { at: Date.now(), manual } }));
            },
            (e) => {
              const msg = (e as Error)?.message ?? "Erreur sauvegarde";
              const isTimeout = /timeout|timed out/i.test(msg);
              if (isTimeout && retryCount < 2) {
                setTimeout(() => runSave(retryCount + 1), 2000);
                setSaveError("Timeout Supabase, nouvelle tentative…");
                return;
              }
              if (isTimeout) {
                setSaveError("Timeout Supabase (document trop lourd). Exécute supabase-migration-timeout.sql dans Supabase → SQL Editor.");
              } else {
                setSaveError(msg);
              }
              console.error("Sauvegarde Supabase:", msg, e);
            }
          );
      };
      runSave(0);
    };
    doSaveRef.current = doSave;

    const onSaveNow = () => {
      saveWasManualRef.current = true;
      doSaveRef.current?.();
    };
    window.addEventListener("map-save-now", onSaveNow);

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
      doSaveRef.current = null;
      window.removeEventListener("map-save-now", onSaveNow);
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
            const row = payload.new as { document?: object; document_compressed?: string; updated_at?: string; updated_by_session?: string } | undefined;
            if (row?.updated_by_session === sessionId) return;
            if (!isNewer(lastKnownUpdatedAt.current, row?.updated_at)) return;
            let doc: object | null = null;
            if (typeof row?.document_compressed === "string" && row.document_compressed.length > 0) {
              try {
                doc = decompressDocument(row.document_compressed);
              } catch {
                return;
              }
            } else if (row?.document && typeof row.document === "object") {
              doc = row.document;
            }
            if (!doc || JSON.stringify(doc).length < 300) return;
            lastKnownUpdatedAt.current = row?.updated_at ?? null;
            isRemoteUpdate.current = true;
            loadSnapshot(store, { document: doc as TLStoreSnapshot });
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
          shapeUtils={allShapeUtils}
          components={components}
          onMount={onMount}
          licenseKey={tldrawLicenseKey}
        />
      )}
    </div>
  );
}
