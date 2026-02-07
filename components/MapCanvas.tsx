"use client";

/**
 * MapCanvas — API inspirée de tldraw (https://tldraw.dev/quick-start)
 * - persistenceKey : sauvegarde en localStorage + sync entre onglets
 * - onMount : callback avec l'API pour contrôle programmatique
 */

import { useCallback, useEffect, useState, useRef } from "react";
import { Canvas, defaultViewport, applyNodeChanges, applyEdgeChanges } from "./Canvas";
import type { Node, Edge, Viewport } from "@xyflow/react";
import { MapProvider } from "@/context/MapContext";
import type { MapState } from "@/types";

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getStorageKey(persistenceKey: string) {
  return `map-intelligente-${persistenceKey}`;
}

function loadFromStorage(key: string): { nodes: Node[]; edges: Edge[]; viewport: Viewport } {
  if (typeof window === "undefined")
    return { nodes: [], edges: [], viewport: defaultViewport };
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { nodes: [], edges: [], viewport: defaultViewport };
    const s = JSON.parse(raw) as MapState;
    const nodes: Node[] = (s.nodes ?? []).map((n) => ({
      id: n.id,
      type: (n.type || "card") as "zone" | "card",
      position: n.position,
      data: n.data,
      ...(n.width != null && { width: n.width }),
      ...(n.height != null && { height: n.height }),
    }));
    const edges: Edge[] = (s.edges ?? []).map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    }));
    return {
      nodes,
      edges,
      viewport: s.viewport ?? defaultViewport,
    };
  } catch {
    return { nodes: [], edges: [], viewport: defaultViewport };
  }
}

function saveToStorage(
  key: string,
  nodes: Node[],
  edges: Edge[],
  viewport: Viewport
) {
  if (typeof window === "undefined") return;
  const s: MapState = {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type ?? "card",
      position: n.position,
      data: n.data as MapState["nodes"][0]["data"],
      width: n.width,
      height: n.height,
    })),
    edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
    viewport,
  };
  localStorage.setItem(key, JSON.stringify(s));
}

export type MapCanvasApi = {
  addZone: () => void;
  addCard: () => void;
  getNodes: () => Node[];
  getEdges: () => Edge[];
};

type MapCanvasProps = {
  /** Clé pour la persistance localStorage. Sync entre onglets du même navigateur. */
  persistenceKey?: string;
  /** Appelé au montage avec l'API pour contrôle programmatique (comme tldraw onMount). */
  onMount?: (api: MapCanvasApi) => void;
};

export function MapCanvas({
  persistenceKey = "default",
  onMount,
}: MapCanvasProps) {
  const storageKey = getStorageKey(persistenceKey);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [viewport, setViewport] = useState<Viewport>(defaultViewport);
  const [mounted, setMounted] = useState(false);
  const onMountRef = useRef(onMount);

  useEffect(() => {
    const { nodes: n, edges: e, viewport: v } = loadFromStorage(storageKey);
    setNodes(n);
    setEdges(e);
    setViewport(v);
    setMounted(true);
  }, [storageKey]);

  // Persistance avec debounce
  useEffect(() => {
    if (!mounted) return;
    const t = setTimeout(
      () => saveToStorage(storageKey, nodes, edges, viewport),
      400
    );
    return () => clearTimeout(t);
  }, [mounted, storageKey, nodes, edges, viewport]);

  // Sync cross-tabs (comme tldraw)
  useEffect(() => {
    if (!mounted) return;
    const handler = (e: StorageEvent) => {
      if (e.key !== storageKey || !e.newValue) return;
      try {
        const s = JSON.parse(e.newValue) as MapState;
        setNodes(
          (s.nodes ?? []).map((n) => ({
            id: n.id,
            type: (n.type || "card") as "zone" | "card",
            position: n.position,
            data: n.data,
            width: n.width,
            height: n.height,
          }))
        );
        setEdges(
          (s.edges ?? []).map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
          }))
        );
        if (s.viewport) setViewport(s.viewport);
      } catch {
        // ignore parse errors
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [mounted, storageKey]);

  const onNodesChange = useCallback(
    (changes: Parameters<typeof applyNodeChanges>[0]) =>
      setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: Parameters<typeof applyEdgeChanges>[0]) =>
      setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  const onConnect = useCallback((connection: { source: string; target: string }) => {
    setEdges((eds) => [
      ...eds,
      {
        id: generateId("edge"),
        source: connection.source,
        target: connection.target,
      },
    ]);
  }, []);

  const updateNodeData = useCallback((nodeId: string, newData: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n
      )
    );
  }, []);

  const addZone = useCallback(() => {
    const id = generateId("zone");
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "zone",
        position: { x: 100 + nds.length * 50, y: 100 + nds.length * 30 },
        data: { label: "Nouvelle zone", width: 400, height: 280 },
        width: 400,
        height: 280,
      },
    ]);
  }, []);

  const addCard = useCallback(() => {
    const id = generateId("card");
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "card",
        position: {
          x: 150 + (nds.length % 4) * 120,
          y: 200 + Math.floor(nds.length / 4) * 100,
        },
        data: { title: "Nouvelle carte", description: "" },
      },
    ]);
  }, []);

  // onMount — comme tldraw
  useEffect(() => {
    if (mounted && onMountRef.current) {
      onMountRef.current({
        addZone,
        addCard,
        getNodes: () => nodes,
        getEdges: () => edges,
      });
      onMountRef.current = undefined;
    }
  }, [mounted, addZone, addCard, nodes, edges]);

  if (!mounted) {
    return (
      <div
        className="flex items-center justify-center"
        style={{
          position: "fixed",
          inset: 0,
          background: "var(--tl-color-background)",
          color: "var(--tl-color-text-3)",
        }}
      >
        Chargement…
      </div>
    );
  }

  return (
    <MapProvider updateNodeData={updateNodeData}>
      <div
        className="tl-map flex flex-col"
        style={{
          position: "fixed",
          inset: 0,
          background: "var(--tl-color-background)",
          color: "var(--tl-color-text)",
        }}
      >
        <div
          className="flex-none flex flex-wrap items-center gap-x-4 gap-y-1 border-b"
          style={{
            padding: "var(--tl-space-2) var(--tl-space-4)",
            background: "var(--tl-color-panel)",
            borderColor: "var(--tl-color-divider)",
            fontSize: 12,
            color: "var(--tl-color-text-3)",
          }}
        >
          <span style={{ fontWeight: 500, color: "var(--tl-color-text-1)" }}>
            Map Intelligente
          </span>
          <span>·</span>
          <span>
            <strong>Zone</strong> = bloc pour regrouper. Double-clic sur le nom
            pour modifier.
          </span>
          <span>·</span>
          <span>
            <strong>Carte</strong> = élément (client, tâche, idée…). Double-clic
            pour éditer. Tirez du point du bas vers le point du haut d’une autre
            pour relier.
          </span>
        </div>
        <div className="flex-1 min-h-0">
          <Canvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            defaultViewport={viewport}
            onViewportChange={setViewport}
            onAddZone={addZone}
            onAddCard={addCard}
          />
        </div>
      </div>
    </MapProvider>
  );
}
