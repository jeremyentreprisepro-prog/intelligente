"use client";

import { createShapeId, useEditor, getSnapshot, loadSnapshot, type TLStoreSnapshot } from "tldraw";
import { LINKCARD_WIDTH, LINKCARD_HEIGHT } from "@/shapes/LinkCardShapeUtil";
import { useCallback, useEffect, useRef, useState } from "react";

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32] as const;
const STORAGE_GROUPS = "map-font-groups";
const STORAGE_CARDS = "map-font-cards";
const NODE_WIDTH = 210;
const NODE_HEIGHT = 150;

function getStored(key: string, def: number): number {
  if (typeof window === "undefined") return def;
  const v = Number(window.localStorage?.getItem(key));
  return FONT_SIZES.includes(v as (typeof FONT_SIZES)[number]) ? v : def;
}

export function MapToolbar() {
  const editor = useEditor();
  const [fontGroups, setFontGroups] = useState(() => getStored(STORAGE_GROUPS, 16));
  const [fontCards, setFontCards] = useState(() => getStored(STORAGE_CARDS, 16));
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onSaved = (e: Event) => setSavedAt((e as CustomEvent<{ at: number }>).detail?.at ?? null);
    window.addEventListener("map-saved", onSaved);
    return () => window.removeEventListener("map-saved", onSaved);
  }, []);

  const saveNow = useCallback(() => {
    setSavedAt(null);
    window.dispatchEvent(new CustomEvent("map-save-now"));
  }, []);

  useEffect(() => {
    try { window.localStorage?.setItem(STORAGE_GROUPS, String(fontGroups)); } catch {}
  }, [fontGroups]);
  useEffect(() => {
    try { window.localStorage?.setItem(STORAGE_CARDS, String(fontCards)); } catch {}
  }, [fontCards]);

  const addGroupe = useCallback(() => {
    const viewport = editor.getViewportPageBounds();
    const marginLeft = 120;
    const marginTop = 120;
    editor.createShape({
      id: createShapeId(),
      type: "collapsible",
      x: viewport.x + marginLeft,
      y: viewport.y + marginTop,
      props: {
        label: "Groupe",
        collapsed: false,
        savedLayout: "",
        fontSize: fontGroups,
        imageUrl: "",
        compact: false,
        w: NODE_WIDTH,
        h: NODE_HEIGHT,
      },
    });
  }, [editor, fontGroups]);

  const applyFontToAllGroups = useCallback((size: number) => {
    setFontGroups(size);
    const shapes = editor.getCurrentPageShapes().filter((s) => s.type === "collapsible");
    if (shapes.length) {
      editor.updateShapes(shapes.map((s) => ({ id: s.id, type: "collapsible" as const, props: { fontSize: size } })));
    }
  }, [editor]);

  const applyFontToAllCards = useCallback((size: number) => {
    setFontCards(size);
    const shapes = editor.getCurrentPageShapes().filter((s) => s.type === "linkcard");
    if (shapes.length) {
      editor.updateShapes(shapes.map((s) => ({ id: s.id, type: "linkcard" as const, props: { fontSize: size } })));
    }
  }, [editor]);

  const unifyGroupSizes = useCallback(() => {
    const shapes = editor.getCurrentPageShapes().filter((s) => s.type === "collapsible");
    if (shapes.length) {
      editor.updateShapes(shapes.map((s) => ({ id: s.id, type: "collapsible" as const, props: { w: NODE_WIDTH, h: NODE_HEIGHT, compact: false } })));
    }
  }, [editor]);

  const unifyCardSizes = useCallback(() => {
    const shapes = editor.getCurrentPageShapes().filter((s) => s.type === "linkcard");
    if (shapes.length) {
      editor.updateShapes(shapes.map((s) => ({ id: s.id, type: "linkcard" as const, props: { w: LINKCARD_WIDTH, h: LINKCARD_HEIGHT, compact: false } })));
    }
  }, [editor]);

  const downloadBackup = useCallback(() => {
    const snapshot = getSnapshot(editor.store);
    const blob = new Blob([JSON.stringify({ document: snapshot.document }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `carte-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [editor.store]);

  const restoreFromFile = useCallback(() => {
    setRestoreError(null);
    fileInputRef.current?.click();
  }, []);

  const onRestoreFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      setRestoreError(null);
      try {
        const text = await file.text();
        const data = JSON.parse(text) as { document?: unknown };
        const doc = data?.document;
        if (!doc || typeof doc !== "object") {
          setRestoreError("Fichier invalide (attendu: { document: ... })");
          return;
        }
        loadSnapshot(editor.store, { document: doc as TLStoreSnapshot });
        const res = await fetch("/api/map", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ document: doc }),
        });
        const result = await res.json();
        if (!res.ok) {
          setRestoreError(result?.error ?? "Erreur lors de l’envoi vers Supabase");
          return;
        }
      } catch (err) {
        setRestoreError(err instanceof Error ? err.message : "Fichier invalide");
      }
    },
    [editor.store]
  );

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: 300,
        zIndex: 400,
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexWrap: "wrap",
        pointerEvents: "auto",
      }}
    >
      <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--tl-color-text-2)" }}>
        Groupes:
        <select
          value={fontGroups}
          onChange={(e) => applyFontToAllGroups(Number(e.target.value))}
          style={{ padding: "2px 4px", fontSize: 11, borderRadius: 4, border: "1px solid var(--tl-color-muted-2)" }}
        >
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>{s}px</option>
          ))}
        </select>
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--tl-color-text-2)" }}>
        Cartes:
        <select
          value={fontCards}
          onChange={(e) => applyFontToAllCards(Number(e.target.value))}
          style={{ padding: "2px 4px", fontSize: 11, borderRadius: 4, border: "1px solid var(--tl-color-muted-2)" }}
        >
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>{s}px</option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={addGroupe}
        style={{
          padding: "6px 12px",
          fontSize: 12,
          fontWeight: 500,
          color: "var(--tl-color-text-1)",
          background: "var(--tl-color-panel)",
          border: "2px solid var(--tl-color-background)",
          borderRadius: 6,
          boxShadow: "var(--tl-shadow-1)",
          cursor: "pointer",
        }}
        title="Ajouter un groupe"
      >
        + Groupe
      </button>
      <button
        type="button"
        onClick={unifyGroupSizes}
        style={{ padding: "6px 10px", fontSize: 11, fontWeight: 500, color: "var(--tl-color-text-1)", background: "var(--tl-color-panel)", border: "2px solid var(--tl-color-background)", borderRadius: 6, boxShadow: "var(--tl-shadow-1)", cursor: "pointer" }}
        title="Mettre tous les groupes à la même taille (210×150)"
      >
        📐 Groupes
      </button>
      <button
        type="button"
        onClick={unifyCardSizes}
        style={{ padding: "6px 10px", fontSize: 11, fontWeight: 500, color: "var(--tl-color-text-1)", background: "var(--tl-color-panel)", border: "2px solid var(--tl-color-background)", borderRadius: 6, boxShadow: "var(--tl-shadow-1)", cursor: "pointer" }}
        title="Mettre toutes les cartes à la même taille (210×195)"
      >
        📐 Cartes
      </button>
      <button
        type="button"
        onClick={saveNow}
        style={{ padding: "6px 10px", fontSize: 11, fontWeight: 600, color: "var(--tl-color-text-1)", background: "var(--tl-color-selected)", border: "2px solid var(--tl-color-background)", borderRadius: 6, boxShadow: "var(--tl-shadow-1)", cursor: "pointer" }}
        title="Enregistrer la carte sur Supabase maintenant"
      >
        {savedAt ? `✓ Sauvegardé ${new Date(savedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : "💾 Sauvegarder maintenant"}
      </button>
      <button
        type="button"
        onClick={downloadBackup}
        style={{ padding: "6px 10px", fontSize: 11, fontWeight: 500, color: "var(--tl-color-text-1)", background: "var(--tl-color-panel)", border: "2px solid var(--tl-color-background)", borderRadius: 6, boxShadow: "var(--tl-shadow-1)", cursor: "pointer" }}
        title="Télécharger une copie en fichier JSON (backup local)"
      >
        📥 Télécharger une copie
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: "none" }}
        onChange={onRestoreFile}
      />
      <button
        type="button"
        onClick={restoreFromFile}
        style={{ padding: "6px 10px", fontSize: 11, fontWeight: 500, color: "var(--tl-color-text-1)", background: "var(--tl-color-panel)", border: "2px solid var(--tl-color-background)", borderRadius: 6, boxShadow: "var(--tl-shadow-1)", cursor: "pointer" }}
        title="Restaurer la carte depuis un fichier backup .json"
      >
        📂 Restaurer depuis un fichier
      </button>
      {restoreError && (
        <span style={{ fontSize: 11, color: "var(--tl-color-danger)" }}>{restoreError}</span>
      )}
      <a
        href="/api/auth/logout"
        style={{ padding: "6px 10px", fontSize: 11, color: "var(--tl-color-text-2)", textDecoration: "none" }}
        title="Se déconnecter"
      >
        Déconnexion
      </a>
    </div>
  );
}
