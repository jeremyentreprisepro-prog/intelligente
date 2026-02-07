export type ZoneData = {
  label: string;
  color?: string;
  collapsed?: boolean;
  width: number;
  height: number;
};

export type CardData = {
  title: string;
  description?: string;
  color?: string;
  tags?: string[];
};

export type MapState = {
  nodes: Array<{ id: string; type: string; position: { x: number; y: number }; data: ZoneData | CardData; width?: number; height?: number }>;
  edges: Array<{ id: string; source: string; target: string }>;
  viewport: { x: number; y: number; zoom: number };
};

/** Clé par défaut pour localStorage (utilisée si persistenceKey non fourni). */
export const DEFAULT_STORAGE_KEY = "map-intelligente-default";
