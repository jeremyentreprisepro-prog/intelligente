"use client";

import { useState, useRef, useEffect } from "react";
import type { NodeProps } from "@xyflow/react";
import { NodeResizer } from "@xyflow/react";
import { useNodeId } from "@xyflow/react";
import type { ZoneData } from "@/types";
import { useMapContext } from "@/context/MapContext";

export function ZoneNode({ data, selected }: NodeProps) {
  const id = useNodeId();
  const ctx = useMapContext();
  const d = (data ?? {}) as ZoneData;
  const label = d.label ?? "Zone";
  const color = d.color ?? "#e5e7eb";
  const collapsed = d.collapsed ?? false;

  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(label);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const save = () => {
    if (id && ctx) ctx.updateNodeData(id, { label: editLabel.trim() || "Zone" });
    setEditing(false);
  };

  const zoneStyle = {
    background: color,
    borderRadius: "var(--tl-radius-2)",
    border: "2px solid var(--tl-color-divider)",
    minWidth: 120,
    minHeight: 60,
  };
  const headerStyle = {
    padding: "var(--tl-space-2) var(--tl-space-4)",
    borderBottom: "1px solid var(--tl-color-divider)",
    background: "var(--tl-color-panel-contrast)",
    opacity: 0.9,
  };

  if (collapsed) {
    return (
      <div
        className="flex items-center justify-center"
        style={zoneStyle}
      >
        {editing ? (
          <input
            ref={inputRef}
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => e.key === "Enter" && save()}
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--tl-color-text-1)",
              background: "var(--tl-color-panel)",
              border: "1px solid var(--tl-color-divider)",
              borderRadius: "var(--tl-radius-1)",
              padding: "var(--tl-space-1) var(--tl-space-2)",
              width: 96,
              outline: "none",
            }}
          />
        ) : (
          <span
            className="truncate cursor-text"
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--tl-color-text-1)",
              padding: "0 var(--tl-space-2)",
            }}
            onDoubleClick={() => {
              setEditLabel(label);
              setEditing(true);
            }}
          >
            {label}
          </span>
        )}
      </div>
    );
  }

  return (
    <>
      <NodeResizer
        minWidth={200}
        minHeight={120}
        isVisible={selected}
        lineStyle={{ borderWidth: 2, borderColor: "var(--tl-color-selected)" }}
        handleStyle={{ width: 8, height: 8 }}
      />
      <div
        className="w-full h-full flex flex-col overflow-hidden"
        style={{ ...zoneStyle, borderRadius: "var(--tl-radius-2)" }}
      >
        <div style={headerStyle}>
          {editing ? (
            <input
              ref={inputRef}
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              onBlur={save}
              onKeyDown={(e) => e.key === "Enter" && save()}
              style={{
                width: "100%",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--tl-color-text-1)",
                background: "var(--tl-color-panel)",
                border: "1px solid var(--tl-color-divider)",
                borderRadius: "var(--tl-radius-1)",
                padding: "var(--tl-space-1) var(--tl-space-2)",
                outline: "none",
              }}
            />
          ) : (
            <span
              className="cursor-text block"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--tl-color-text-1)",
              }}
              onDoubleClick={() => {
                setEditLabel(label);
                setEditing(true);
              }}
            >
              {label}
            </span>
          )}
        </div>
        <div className="flex-1" style={{ minHeight: 60 }} />
      </div>
    </>
  );
}
