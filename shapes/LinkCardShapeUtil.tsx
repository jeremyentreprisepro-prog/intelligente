"use client";

import {
  BaseBoxShapeUtil,
  HTMLContainer,
  RecordProps,
  T,
  TLBaseShape,
  createShapeId,
  createShapePropsMigrationIds,
  createShapePropsMigrationSequence,
  toDomPrecision,
  useEditor,
} from "tldraw";
import { useCallback, useRef, useState } from "react";
import { getServiceIconInfo, getServiceName } from "./linkCardHelpers";

const LINKCARD_TYPE = "linkcard" as const;
export const LINKCARD_WIDTH = 210;
export const LINKCARD_HEIGHT = 195;
export const LINKCARD_COMPACT_SIZE = 54;

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32] as const;
type FontSize = (typeof FONT_SIZES)[number];

declare module "tldraw" {
  export interface TLGlobalShapePropsMap {
    [LINKCARD_TYPE]: { url: string; title: string; compact: boolean; fontSize: number; w: number; h: number };
  }
}

export type TLLinkCardShape = TLBaseShape<typeof LINKCARD_TYPE, { url: string; title: string; compact: boolean; fontSize: number; w: number; h: number }>;

const linkCardShapeProps: RecordProps<TLLinkCardShape> = {
  url: T.string,
  title: T.string,
  compact: T.boolean,
  fontSize: T.number,
  w: T.number,
  h: T.number,
};

const Versions = createShapePropsMigrationIds("linkcard", { AddUrl: 1, AddCompact: 2, AddFontSize: 3 });
const linkCardShapeMigrations = createShapePropsMigrationSequence({
  sequence: [
    { id: Versions.AddUrl, up: (props) => ({ ...props, url: (props as { url?: string }).url ?? "", title: (props as { title?: string }).title ?? "" }), down: (props) => props },
    { id: Versions.AddCompact, up: (props) => ({ ...props, compact: (props as { compact?: boolean }).compact ?? false }), down: (props) => props },
    { id: Versions.AddFontSize, up: (props) => ({ ...props, fontSize: (props as { fontSize?: number }).fontSize ?? 16 }), down: (props) => props },
  ],
});

export class LinkCardShapeUtil extends BaseBoxShapeUtil<TLLinkCardShape> {
  static override type = LINKCARD_TYPE;
  static override props = linkCardShapeProps;
  static override migrations = linkCardShapeMigrations;

  override canResize() {
    return false;
  }

  override hideSelectionBoundsFg() {
    return true;
  }

  override getDefaultProps(): TLLinkCardShape["props"] {
    return {
      url: "",
      title: "Lien",
      compact: false,
      fontSize: 16,
      w: LINKCARD_WIDTH,
      h: LINKCARD_HEIGHT,
    };
  }

  override component(shape: TLLinkCardShape) {
    return <LinkCardComponent shape={shape} />;
  }

  override indicator(shape: TLLinkCardShape) {
    return (
      <rect
        width={toDomPrecision(shape.props.w)}
        height={toDomPrecision(shape.props.h)}
        rx={8}
        ry={8}
      />
    );
  }

  getIndicatorPath(shape: TLLinkCardShape): Path2D {
    const path = new Path2D();
    path.roundRect(0, 0, shape.props.w, shape.props.h, 8);
    return path;
  }
}

function LinkCardComponent({ shape }: { shape: TLLinkCardShape }) {
  const editor = useEditor();
  const { url, title, compact, fontSize } = shape.props;
  const fs = FONT_SIZES.includes(fontSize as FontSize) ? (fontSize as FontSize) : 16;
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  const iconInfo = url ? getServiceIconInfo(url) : null;
  const displayTitle = title || "Sans titre";
  const iconSize = compact ? 36 : 56;

  const save = useCallback(() => {
    if (shape.id) {
      editor.updateShape({ id: shape.id, type: "linkcard", props: { title: editTitle.trim() || "Lien" } });
    }
    setEditing(false);
  }, [editor, shape.id, editTitle]);

  const openUrl = useCallback(
    (e: React.PointerEvent) => {
      if (!editor.inputs.getShiftKey() && url) {
        e.preventDefault();
        window.open(url, "_blank", "noopener,noreferrer");
      }
    },
    [editor, url]
  );

  const startEdit = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    editor.markEventAsHandled(e);
    setEditTitle(displayTitle);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [editor, displayTitle]);

  return (
    <HTMLContainer>
      <div
        className="linkcard-container"
        style={{
          width: shape.props.w,
          height: shape.props.h,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: compact ? "center" : "flex-start",
          padding: compact ? 9 : 16,
          borderRadius: compact ? 8 : 8,
          background: "var(--tl-color-panel)",
          border: "2px solid var(--tl-color-background)",
          boxShadow: "var(--tl-shadow-1)",
          cursor: url ? "pointer" : "default",
          position: "relative",
          pointerEvents: "all",
        }}
        title={compact ? displayTitle : undefined}
      >
        {iconInfo && url && (
          <div
            style={{ marginBottom: compact ? 0 : 12, flexShrink: 0 }}
            onPointerDown={(e) => {
              e.stopPropagation();
              editor.markEventAsHandled(e);
              openUrl(e);
            }}
          >
            {iconInfo.type === "local" ? (
              <div
                style={{
                  width: iconSize,
                  height: iconSize,
                  backgroundColor: `#${iconInfo.hex}`,
                  maskImage: `url(${iconInfo.url})`,
                  maskSize: "contain",
                  maskRepeat: "no-repeat",
                  maskPosition: "center",
                  WebkitMaskImage: `url(${iconInfo.url})`,
                  WebkitMaskSize: "contain",
                  WebkitMaskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                }}
                draggable={false}
              />
            ) : (
              <img
                src={iconInfo.url}
                alt=""
                style={{ width: iconSize, height: iconSize, objectFit: "contain" }}
                draggable={false}
              />
            )}
          </div>
        )}
        {!compact && (
        <>
        <div
          style={{ width: "100%", textAlign: "center", minHeight: 32, cursor: "text" }}
          onPointerDown={startEdit}
        >
          {editing ? (
            <input
              ref={inputRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={() => save()}
              onKeyDown={(e) => { e.stopPropagation(); editor.markEventAsHandled(e); e.key === "Enter" && save(); }}
              onPointerDown={(e) => editor.markEventAsHandled(e)}
              style={{
                width: "100%",
                fontSize: fs,
                fontWeight: 600,
                color: "var(--tl-color-text-1)",
                background: "var(--tl-color-background)",
                border: "1px solid var(--tl-color-focus)",
                borderRadius: 4,
                padding: "2px 6px",
                outline: "none",
              }}
            />
          ) : (
            <span style={{ fontSize: fs, fontWeight: 600, color: "var(--tl-color-text-1)" }}>
              {displayTitle}
            </span>
            )}
        </div>
        {url && (
          <div
            style={{
              width: "100%",
              fontSize: Math.max(11, fs - 2),
              color: "var(--tl-color-text-3)",
              textAlign: "center",
              marginTop: 6,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              padding: "0 4px",
              cursor: "default",
            }}
            title={url}
            onPointerDown={(e) => editor.markEventAsHandled(e)}
          >
            {url.length > 38 ? url.slice(0, 35) + "…" : url}
          </div>
        )}
        </>
        )}
      </div>
    </HTMLContainer>
  );
}

const STORAGE_CARDS = "map-font-cards";

function getDefaultFontSize(): number {
  if (typeof window === "undefined") return 12;
  const v = Number(window.localStorage?.getItem(STORAGE_CARDS));
  return FONT_SIZES.includes(v as FontSize) ? v : 16;
}

export function createLinkCardShapePartial(url: string, point: { x: number; y: number }) {
  return {
    id: createShapeId(),
    type: "linkcard" as const,
    x: point.x - LINKCARD_WIDTH / 2,
    y: point.y - LINKCARD_HEIGHT / 2,
    props: {
      url,
      title: getServiceName(url),
      compact: false,
      fontSize: getDefaultFontSize(),
      w: LINKCARD_WIDTH,
      h: LINKCARD_HEIGHT,
    },
  };
}
