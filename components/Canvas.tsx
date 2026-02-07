"use client";

import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type Connection,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ZoneNode } from "./ZoneNode";
import { CardNode } from "./CardNode";
import type { NodeTypes } from "@xyflow/react";

const nodeTypes = { zone: ZoneNode, card: CardNode } as NodeTypes;

export const defaultViewport: Viewport = { x: 0, y: 0, zoom: 1 };

type CanvasProps = {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect?: (connection: Connection) => void;
  defaultViewport: Viewport;
  onViewportChange: (vp: Viewport) => void;
  onAddZone: () => void;
  onAddCard: () => void;
};

export function Canvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  defaultViewport: vp,
  onViewportChange,
  onAddZone,
  onAddCard,
}: CanvasProps) {
  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onViewportChange={onViewportChange}
        nodeTypes={nodeTypes}
        defaultViewport={vp}
        fitView
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{ type: "smoothstep" }}
      >
        <Background
          variant={BackgroundVariant.Cross}
          gap={20}
          size={1}
          color="var(--tl-color-grid-subtle)"
        />
        <Controls />
        <MiniMap
          nodeColor="var(--tl-color-primary)"
          maskColor="rgba(0,0,0,0.05)"
        />
        <Panel position="top-left" className="m-0">
          <div
            className="flex gap-2"
            style={{ padding: "var(--tl-space-2)" }}
          >
            <button
              type="button"
              onClick={onAddZone}
              className="tldraw-button"
              style={{
                padding: "var(--tl-space-2) var(--tl-space-4)",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--tl-color-text-1)",
                background: "var(--tl-color-panel)",
                border: "2px solid var(--tl-color-background)",
                borderRadius: "var(--tl-radius-2)",
                boxShadow: "var(--tl-shadow-1)",
              }}
            >
              + Zone
            </button>
            <button
              type="button"
              onClick={onAddCard}
              className="tldraw-button"
              style={{
                padding: "var(--tl-space-2) var(--tl-space-4)",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--tl-color-text-1)",
                background: "var(--tl-color-panel)",
                border: "2px solid var(--tl-color-background)",
                borderRadius: "var(--tl-radius-2)",
                boxShadow: "var(--tl-shadow-1)",
              }}
            >
              + Carte
            </button>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export { applyNodeChanges, applyEdgeChanges };
