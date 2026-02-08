"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#1a1a1a",
        color: "#fff",
        fontFamily: "system-ui",
        padding: 24,
        gap: 16,
      }}
    >
      <h2 style={{ fontSize: 18, margin: 0 }}>Une erreur est survenue</h2>
      <p style={{ color: "#999", fontSize: 14, textAlign: "center", maxWidth: 400 }}>
        {error.message}
      </p>
      <button
        onClick={reset}
        style={{
          padding: "12px 24px",
          fontSize: 14,
          fontWeight: 600,
          borderRadius: 8,
          border: "none",
          background: "#3b82f6",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        Réessayer
      </button>
    </div>
  );
}
