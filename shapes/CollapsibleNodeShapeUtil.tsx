"use client";

import {
  BaseBoxShapeUtil,
  Editor,
  HTMLContainer,
  RecordProps,
  T,
  TLArrowShape,
  TLBaseShape,
  TLShape,
  TLShapeId,
  createShapePropsMigrationIds,
  createShapePropsMigrationSequence,
  toDomPrecision,
  useEditor,
} from "tldraw";
import { LINKCARD_COMPACT_SIZE, LINKCARD_HEIGHT, LINKCARD_WIDTH } from "./LinkCardShapeUtil";
import { computeDagreLayout } from "@/lib/dagreLayout";
import { useCallback, useRef, useState } from "react";

const COLLAPSIBLE_TYPE = "collapsible" as const;
const NODE_WIDTH = 210;
const NODE_HEIGHT = 150;
export const COLLAPSIBLE_COMPACT_SIZE = 66;

type SavedLayout = Record<string, { x: number; y: number; w?: number; h?: number }>;

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32] as const;
type FontSize = (typeof FONT_SIZES)[number];

declare module "tldraw" {
  export interface TLGlobalShapePropsMap {
    [COLLAPSIBLE_TYPE]: { label: string; collapsed: boolean; savedLayout: string; fontSize: number; imageUrl: string; compact: boolean; w: number; h: number };
  }
}

export type TLCollapsibleNodeShape = TLBaseShape<
  typeof COLLAPSIBLE_TYPE,
  { label: string; collapsed: boolean; savedLayout: string; fontSize: number; imageUrl: string; compact: boolean; w: number; h: number }
>;

const collapsibleShapeProps: RecordProps<TLCollapsibleNodeShape> = {
  label: T.string,
  collapsed: T.boolean,
  savedLayout: T.string,
  fontSize: T.number,
  imageUrl: T.string,
  compact: T.boolean,
  w: T.number,
  h: T.number,
};

const Versions = createShapePropsMigrationIds("collapsible", { AddCollapsed: 1, AddSavedLayout: 2, AddFontImageCompact: 3 });
const collapsibleShapeMigrations = createShapePropsMigrationSequence({
  sequence: [
    { id: Versions.AddCollapsed, up: (props) => ({ ...props, collapsed: (props as { collapsed?: boolean }).collapsed ?? false }), down: (props) => props },
    { id: Versions.AddSavedLayout, up: (props) => ({ ...props, savedLayout: (props as { savedLayout?: string }).savedLayout ?? "" }), down: (props) => props },
    { id: Versions.AddFontImageCompact, up: (props) => ({ ...props, fontSize: (props as { fontSize?: number }).fontSize ?? 16, imageUrl: (props as { imageUrl?: string }).imageUrl ?? "", compact: (props as { compact?: boolean }).compact ?? false }), down: (props) => props },
  ],
});

function getChildShapesAndArrows(editor: Editor, parentId: TLShapeId): {
  shapes: TLShape[];
  linkCards: TLShape[];
  childGroups: TLShape[];
  otherShapes: TLShape[];
  arrows: TLArrowShape[];
  arrowsToGroups: TLArrowShape[];
} {
  const arrows: TLArrowShape[] = [];
  const arrowsToGroups: TLArrowShape[] = [];
  const childIds = new Set<TLShapeId>();

  const bindingsToParent = editor.getBindingsToShape(parentId, "arrow");
  bindingsToParent.forEach((b) => {
    if (b.props.terminal !== "start") return;
    const arrow = editor.getShape(b.fromId) as TLArrowShape | undefined;
    if (!arrow || arrow.type !== "arrow") return;
    const arrowBindings = editor.getBindingsFromShape(arrow.id, "arrow");
    const endBinding = arrowBindings.find((ab) => ab.props.terminal === "end");
    if (endBinding) {
      arrows.push(arrow);
      childIds.add(endBinding.toId);
      const endShape = editor.getShape(endBinding.toId);
      if (endShape?.type === "collapsible") arrowsToGroups.push(arrow);
    }
  });

  const shapes = Array.from(childIds)
    .map((id) => editor.getShape(id))
    .filter(Boolean) as TLShape[];

  const linkCards = shapes.filter((s) => s.type === "linkcard");
  const childGroups = shapes.filter((s) => s.type === "collapsible");
  const otherShapes = shapes.filter((s) => s.type !== "linkcard" && s.type !== "collapsible");

  return { shapes, linkCards, childGroups, otherShapes, arrows, arrowsToGroups };
}

/** Collecte récursivement tous les descendants (enfants, petits-enfants...) d'un groupe */
function getAllDescendantIds(editor: Editor, parentId: TLShapeId): Set<TLShapeId> {
  const ids = new Set<TLShapeId>();
  const stack: TLShapeId[] = [parentId];
  const visited = new Set<TLShapeId>();

  while (stack.length) {
    const pid = stack.pop()!;
    if (visited.has(pid)) continue;
    visited.add(pid);

    const bindings = editor.getBindingsToShape(pid, "arrow");
    for (const b of bindings) {
      if (b.props.terminal !== "start") continue;
      const arrow = editor.getShape(b.fromId) as TLArrowShape | undefined;
      if (!arrow || arrow.type !== "arrow") continue;
      const endBinding = editor.getBindingsFromShape(arrow.id, "arrow").find((ab) => ab.props.terminal === "end");
      if (endBinding) {
        ids.add(endBinding.toId);
        if (!visited.has(endBinding.toId)) stack.push(endBinding.toId);
      }
    }
  }
  return ids;
}

/** Retourne les parents directs d'un shape (shapes qui ont une flèche vers lui) */
function getDirectParentIds(editor: Editor, shapeId: TLShapeId): TLShapeId[] {
  const parents: TLShapeId[] = [];
  const bindings = editor.getBindingsToShape(shapeId, "arrow");
  for (const b of bindings) {
    if (b.props.terminal !== "end") continue;
    const arrow = editor.getShape(b.fromId) as TLArrowShape | undefined;
    if (!arrow || arrow.type !== "arrow") continue;
    const startBinding = editor.getBindingsFromShape(arrow.id, "arrow").find((ab) => ab.props.terminal === "start");
    if (startBinding) parents.push(startBinding.toId);
  }
  return parents;
}

/** Retourne les groupes ancêtres ordonnés du plus proche au plus éloigné */
function getAncestorGroupIdsOrdered(editor: Editor, shapeId: TLShapeId): TLShapeId[] {
  const result: TLShapeId[] = [];
  let current = [shapeId];
  const visited = new Set<TLShapeId>([shapeId]);

  while (current.length) {
    const next: TLShapeId[] = [];
    for (const sid of current) {
      for (const parentId of getDirectParentIds(editor, sid)) {
        if (visited.has(parentId)) continue;
        visited.add(parentId);
        const parent = editor.getShape(parentId);
        if (parent?.type === "collapsible") result.push(parentId);
        next.push(parentId);
      }
    }
    current = next;
  }
  return result;
}

/** Applique le collapse à un groupe (utilisable pour le groupe cliqué ou ses ancêtres) */
function performCollapse(editor: Editor, groupId: TLShapeId): void {
  const group = editor.getShape(groupId) as TLCollapsibleNodeShape | undefined;
  if (!group || group.type !== "collapsible" || group.props.collapsed) return;

  const { linkCards, childGroups, otherShapes, arrows, arrowsToGroups } = getChildShapesAndArrows(editor, groupId);
  const parentBounds = editor.getShapePageBounds(groupId);
  if (!parentBounds) return;

  const directChildIds = new Set([...linkCards, ...childGroups, ...otherShapes].map((s) => s.id));
  const allDescendantIds = getAllDescendantIds(editor, groupId);
  const nestedIds = [...allDescendantIds].filter((id) => !directChildIds.has(id));

  const arrowsToHide = arrows.filter((a) => !arrowsToGroups.includes(a));
  const descendantArrows = getArrowsFromDescendants(editor, allDescendantIds);
  const arrowsToHideAll = [...new Set([...arrowsToHide, ...descendantArrows.filter((a) => !arrowsToGroups.includes(a))])];

  const savedLayout: SavedLayout = {};
  const saveShape = (s: TLShape) => { savedLayout[s.id] = { x: s.x, y: s.y, w: (s.props as { w?: number }).w, h: (s.props as { h?: number }).h }; };
  allDescendantIds.forEach((id) => { const s = editor.getShape(id); if (s) saveShape(s); });

  editor.updateShape({ id: groupId, type: "collapsible", props: { collapsed: true, savedLayout: JSON.stringify(savedLayout) } });

  [...otherShapes, ...arrowsToHideAll].forEach((s) => editor.updateShape({ id: s.id, type: s.type, opacity: 0 }));
  nestedIds.forEach((id) => { const s = editor.getShape(id); if (s) editor.updateShape({ id: s.id, type: s.type, opacity: 0 }); });
  arrowsToGroups.forEach((a) => editor.updateShape({ id: a.id, type: a.type, opacity: 1 }));

  const children = [
    ...linkCards.map((lc) => ({ id: lc.id, width: LINKCARD_COMPACT_SIZE, height: LINKCARD_COMPACT_SIZE })),
    ...childGroups.map((g) => ({ id: g.id, width: COLLAPSIBLE_COMPACT_SIZE, height: COLLAPSIBLE_COMPACT_SIZE })),
  ];
  const positions = computeDagreLayout(
    groupId,
    { x: parentBounds.x, y: parentBounds.y, w: parentBounds.w, h: parentBounds.h },
    children
  );

  linkCards.forEach((lc) => {
    const pos = positions[lc.id];
    const newX = pos?.x ?? parentBounds.x + (parentBounds.w - LINKCARD_COMPACT_SIZE) / 2;
    const newY = pos?.y ?? parentBounds.y - LINKCARD_COMPACT_SIZE - 12;
    editor.updateShape({ id: lc.id, type: "linkcard", x: newX, y: newY, props: { compact: true, w: LINKCARD_COMPACT_SIZE, h: LINKCARD_COMPACT_SIZE } });
  });
  childGroups.forEach((g) => {
    const pos = positions[g.id];
    const newX = pos?.x ?? parentBounds.x + (parentBounds.w - COLLAPSIBLE_COMPACT_SIZE) / 2;
    const newY = pos?.y ?? parentBounds.y - COLLAPSIBLE_COMPACT_SIZE - 12;
    editor.updateShape({ id: g.id, type: "collapsible", x: newX, y: newY, props: { compact: true, w: COLLAPSIBLE_COMPACT_SIZE, h: COLLAPSIBLE_COMPACT_SIZE } });
  });
}

/** Récupère toutes les flèches dont le point de départ est un descendant (à rendre visibles) */
function getArrowsFromDescendants(editor: Editor, descendantIds: Set<TLShapeId>): TLArrowShape[] {
  const arrowIds = new Set<TLShapeId>();
  descendantIds.forEach((descId) => {
    const bindings = editor.getBindingsToShape(descId, "arrow");
    bindings.forEach((b) => {
      if (b.props.terminal !== "start") return;
      const arrow = editor.getShape(b.fromId);
      if (arrow?.type === "arrow") arrowIds.add(arrow.id);
    });
  });
  return Array.from(arrowIds)
    .map((id) => editor.getShape(id))
    .filter((s): s is TLArrowShape => s?.type === "arrow");
}

export class CollapsibleNodeShapeUtil extends BaseBoxShapeUtil<TLCollapsibleNodeShape> {
  static override type = COLLAPSIBLE_TYPE;
  static override props = collapsibleShapeProps;
  static override migrations = collapsibleShapeMigrations;

  override canResize() {
    return true;
  }

  override hideSelectionBoundsFg() {
    return false;
  }

  override getDefaultProps(): TLCollapsibleNodeShape["props"] {
    return {
      label: "Groupe",
      collapsed: false,
      savedLayout: "",
      fontSize: 16,
      imageUrl: "",
      compact: false,
      w: NODE_WIDTH,
      h: NODE_HEIGHT,
    };
  }

  override component(shape: TLCollapsibleNodeShape) {
    return <CollapsibleNodeComponent shape={shape} />;
  }

  override indicator(shape: TLCollapsibleNodeShape) {
    return (
      <rect
        width={toDomPrecision(shape.props.w)}
        height={toDomPrecision(shape.props.h)}
        rx={8}
        ry={8}
      />
    );
  }

  getIndicatorPath(shape: TLCollapsibleNodeShape): Path2D {
    const path = new Path2D();
    path.roundRect(0, 0, shape.props.w, shape.props.h, 8);
    return path;
  }
}

function CollapsibleNodeComponent({ shape }: { shape: TLCollapsibleNodeShape }) {
  const editor = useEditor();
  const { label, collapsed, fontSize, compact } = shape.props;
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  const fs = FONT_SIZES.includes(fontSize as FontSize) ? (fontSize as FontSize) : 16;

  const toggleCollapsed = useCallback(() => {
    const nextCollapsed = !collapsed;
    const { linkCards, childGroups, otherShapes, arrows } = getChildShapesAndArrows(editor, shape.id);

    if (nextCollapsed) {
      // Ne fermer que ce groupe : seuls ses enfants directs remontent vers lui.
      // On ne collapse pas les ancêtres, sinon tout remonte vers la racine (AXEL).
      performCollapse(editor, shape.id);
    } else {
      editor.updateShape({ id: shape.id, type: "collapsible", props: { collapsed: false } });

      const savedLayout: SavedLayout = (() => {
        try {
          const raw = shape.props.savedLayout;
          return raw ? (JSON.parse(raw) as SavedLayout) : {};
        } catch {
          return {};
        }
      })();

      const descendantIds = getAllDescendantIds(editor, shape.id);
      const descendantArrows = getArrowsFromDescendants(editor, descendantIds);
      const allArrowsToShow = [...new Set([...arrows, ...descendantArrows])];

      descendantIds.forEach((id) => {
        const s = editor.getShape(id);
        if (!s) return;
        editor.updateShape({ id: s.id, type: s.type, opacity: 1 });
        const saved = savedLayout[id];
        if (!saved) return;
        if (s.type === "linkcard") {
          editor.updateShape({
            id: s.id,
            type: "linkcard",
            x: saved.x,
            y: saved.y,
            props: { compact: false, w: saved.w ?? LINKCARD_WIDTH, h: saved.h ?? LINKCARD_HEIGHT },
          });
        } else if (s.type === "collapsible") {
          const g = s as TLCollapsibleNodeShape;
          editor.updateShape({
            id: s.id,
            type: "collapsible",
            x: saved.x,
            y: saved.y,
            props: { compact: false, fontSize: (g.props as { fontSize?: number }).fontSize ?? 16, imageUrl: (g.props as { imageUrl?: string }).imageUrl ?? "", w: saved.w ?? NODE_WIDTH, h: saved.h ?? NODE_HEIGHT },
          });
        } else {
          editor.updateShape({ id: s.id, type: s.type, x: saved.x, y: saved.y });
        }
      });
      allArrowsToShow.forEach((a) => editor.updateShape({ id: a.id, type: a.type, opacity: 1 }));

      editor.updateShape({ id: shape.id, type: "collapsible", props: { savedLayout: "" } });
    }
  }, [editor, shape.id, collapsed, shape.props.savedLayout]);

  const save = useCallback(() => {
    editor.updateShape({ id: shape.id, type: "collapsible", props: { label: editLabel.trim() || "Groupe" } });
    setEditing(false);
  }, [editor, shape.id, editLabel]);

  const startEdit = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    editor.markEventAsHandled(e);
    setEditLabel(label || "Groupe");
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [editor, label]);

  // Style inspiré de dagre test/console.html : .node rect (stroke #333, fill #fff), .subgraph rect (stroke #333, fill #333 0.15)
  const NODE_STROKE = "#333";
  const NODE_FILL = "#fff";
  const SUBGRAPH_FILL = "rgba(51, 51, 51, 0.12)";

  const compactStyle = compact ? {
    width: COLLAPSIBLE_COMPACT_SIZE,
    height: COLLAPSIBLE_COMPACT_SIZE,
    padding: 10,
    minHeight: "auto",
  } : {
    width: shape.props.w,
    height: shape.props.h,
    padding: 0,
    minHeight: 140,
  };

  const baseBox = {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "stretch",
    justifyContent: compact ? "center" : "flex-start",
    borderRadius: 5,
    border: `1px solid ${NODE_STROKE}`,
    background: compact ? NODE_FILL : SUBGRAPH_FILL,
    boxShadow: "none",
    pointerEvents: "all" as const,
    overflow: "hidden",
  };

  return (
    <HTMLContainer>
      <div style={{ ...compactStyle, ...baseBox }}>
        {compact ? (
          /* Cellule type .node : fond blanc, contour #333, padding 10, rx 5 (comme appendLabel) */
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              width: "100%",
              height: "100%",
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: NODE_STROKE,
                textAlign: "center",
                lineHeight: 1.2,
              }}
            >
              {(label || "Groupe").slice(0, 2).toUpperCase()}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: NODE_STROKE,
                maxWidth: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                padding: "0 2px",
              }}
            >
              {label || "Groupe"}
            </span>
          </div>
        ) : (
          <>
            {/* Bandeau type .node : fond blanc, contour en bas */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 12px",
                borderBottom: `1px solid ${NODE_STROKE}`,
                background: NODE_FILL,
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onPointerDown={(e) => { e.stopPropagation(); editor.markEventAsHandled(e); toggleCollapsed(); }}
                style={{
                  width: 26,
                  height: 26,
                  padding: 0,
                  border: `1px solid ${NODE_STROKE}`,
                  background: NODE_FILL,
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 11,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: NODE_STROKE,
                }}
                title={collapsed ? "Ouvrir le groupe" : "Réduire le groupe"}
              >
                {collapsed ? "▶" : "▼"}
              </button>
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: fs,
                  fontWeight: 600,
                  color: NODE_STROKE,
                  cursor: "text",
                }}
                onPointerDown={startEdit}
              >
                {editing ? (
                  <input
                    ref={inputRef}
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    onBlur={() => save()}
                    onKeyDown={(e) => { e.stopPropagation(); editor.markEventAsHandled(e); e.key === "Enter" && save(); }}
                    onPointerDown={(e) => editor.markEventAsHandled(e)}
                    style={{
                      width: "100%",
                      fontSize: fs,
                      fontWeight: 600,
                      color: NODE_STROKE,
                      background: NODE_FILL,
                      border: `1px solid ${NODE_STROKE}`,
                      borderRadius: 4,
                      padding: "4px 8px",
                      outline: "none",
                    }}
                  />
                ) : (
                  <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: fs }}>
                    {label || "Groupe"}
                  </span>
                )}
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 20 }} />
          </>
        )}
      </div>
    </HTMLContainer>
  );
}
