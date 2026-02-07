"use client";

import { createContext, useContext } from "react";

type UpdateNodeData = (nodeId: string, newData: Record<string, unknown>) => void;

const MapContext = createContext<{ updateNodeData: UpdateNodeData } | null>(null);

export function MapProvider({
  updateNodeData,
  children,
}: {
  updateNodeData: UpdateNodeData;
  children: React.ReactNode;
}) {
  return (
    <MapContext.Provider value={{ updateNodeData }}>
      {children}
    </MapContext.Provider>
  );
}

export function useMapContext() {
  const ctx = useContext(MapContext);
  if (!ctx) return null;
  return ctx;
}
