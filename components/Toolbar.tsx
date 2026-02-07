"use client";

type ToolbarProps = {
  onAddZone: () => void;
  onAddCard: () => void;
};

export function Toolbar({ onAddZone, onAddCard }: ToolbarProps) {
  return (
    <div className="flex gap-2 p-2 bg-white/90 backdrop-blur border-b border-zinc-200 shadow-sm">
      <button
        type="button"
        onClick={onAddZone}
        className="px-3 py-1.5 text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-md"
      >
        + Zone
      </button>
      <button
        type="button"
        onClick={onAddCard}
        className="px-3 py-1.5 text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-md"
      >
        + Carte
      </button>
      <span className="ml-2 text-xs text-zinc-500 self-center">
        Ctrl+N carte · Ctrl+K recherche
      </span>
    </div>
  );
}
