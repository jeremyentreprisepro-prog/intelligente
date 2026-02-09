/**
 * Layout hiérarchique des nœuds (groupes / cartes) : les enfants sont placés
 * au-dessus du parent, en ligne centrée (style dagre TB, sans dépendance externe).
 */

export type ChildNode = { id: string; width: number; height: number };
export type Bounds = { x: number; y: number; w: number; h: number };

const NODESEP = 20;
const RANKSEP = 40;

/**
 * Calcule les positions (x, y = coin supérieur gauche) des enfants au-dessus du parent.
 * Les enfants sont disposés en une ligne horizontale centrée au-dessus du parent.
 */
export function computeDagreLayout(
  _parentId: string,
  parentBounds: Bounds,
  children: ChildNode[]
): Record<string, { x: number; y: number }> {
  if (children.length === 0) return {};

  const totalWidth = children.reduce((sum, c) => sum + c.width, 0) + NODESEP * (children.length - 1);
  const maxHeight = Math.max(...children.map((c) => c.height));
  const parentCenterX = parentBounds.x + parentBounds.w / 2;
  const startX = parentCenterX - totalWidth / 2;
  const childY = parentBounds.y - RANKSEP - maxHeight;

  const positions: Record<string, { x: number; y: number }> = {};
  let x = startX;
  for (const c of children) {
    positions[c.id] = { x, y: childY };
    x += c.width + NODESEP;
  }
  return positions;
}
