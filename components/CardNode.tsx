"use client";

import { useState, useRef, useEffect } from "react";
import type { NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { useNodeId } from "@xyflow/react";
import type { CardData } from "@/types";
import { useMapContext } from "@/context/MapContext";

export function CardNode({ data }: NodeProps) {
  const id = useNodeId();
  const ctx = useMapContext();
  const d = (data ?? {}) as CardData;
  const title = d.title ?? "Sans titre";
  const description = d.description ?? "";
  const color = d.color ?? "#ffffff";

  const [editing, setEditing] = useState<"title" | "description" | null>(null);
  const [editTitle, setEditTitle] = useState(title);
  const [editDesc, setEditDesc] = useState(description);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const areaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (editing === "title" && inputRef.current) inputRef.current.focus();
    if (editing === "description" && areaRef.current) areaRef.current.focus();
  }, [editing]);

  const saveTitle = () => {
    if (id && ctx) ctx.updateNodeData(id, { title: editTitle.trim() || "Sans titre" });
    setEditing(null);
  };
  const saveDescription = () => {
    if (id && ctx) ctx.updateNodeData(id, { description: editDesc });
    setEditing(null);
  };

  const cardStyle = {
    background: color,
    borderRadius: "var(--tl-radius-2)",
    border: "1px solid var(--tl-color-divider)",
    boxShadow: "var(--tl-shadow-1)",
    minWidth: 200,
    maxWidth: 320,
  };

  return (
    <div className="overflow-hidden" style={cardStyle}>
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3"
        style={{ background: "var(--tl-color-primary)" }}
      />
      <div
        style={{
          padding: "var(--tl-space-2) var(--tl-space-4)",
          borderBottom: "1px solid var(--tl-color-divider)",
        }}
      >
        {editing === "title" ? (
          <input
            ref={inputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === "Enter" && saveTitle()}
            style={{
              width: "100%",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--tl-color-text-1)",
              background: "transparent",
              borderBottom: "1px solid var(--tl-color-focus)",
              outline: "none",
            }}
          />
        ) : (
          <span
            className="cursor-text block min-h-[1.25em]"
            style={{ fontSize: 12, fontWeight: 600, color: "var(--tl-color-text-1)" }}
            onDoubleClick={() => {
              setEditTitle(title);
              setEditing("title");
            }}
          >
            {title}
          </span>
        )}
      </div>
      <div
        style={{
          padding: "var(--tl-space-2) var(--tl-space-4)",
          fontSize: 11,
          color: "var(--tl-color-text-3)",
          minHeight: "2.5em",
        }}
      >
        {editing === "description" ? (
          <textarea
            ref={areaRef}
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            onBlur={saveDescription}
            onKeyDown={(e) => e.key === "Escape" && saveDescription()}
            style={{
              width: "100%",
              minHeight: "3em",
              color: "var(--tl-color-text-3)",
              background: "transparent",
              border: "1px solid var(--tl-color-divider)",
              borderRadius: "var(--tl-radius-1)",
              outline: "none",
              resize: "none",
            }}
            placeholder="Description (optionnel)"
          />
        ) : (
          <span
            className="cursor-text block line-clamp-3"
            onDoubleClick={() => {
              setEditDesc(description);
              setEditing("description");
            }}
          >
            {description || "Double-clic pour ajouter une description"}
          </span>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3"
        style={{ background: "var(--tl-color-primary)" }}
      />
    </div>
  );
}
