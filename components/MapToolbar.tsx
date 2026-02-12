"use client";

import { createShapeId, useEditor } from "tldraw";
import { LINKCARD_WIDTH, LINKCARD_HEIGHT } from "@/shapes/LinkCardShapeUtil";
import { useCallback, useEffect, useState } from "react";

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
