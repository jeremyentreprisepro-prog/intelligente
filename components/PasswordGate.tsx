"use client";

import { useState, useEffect } from "react";

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "ok" | "prompt">("loading");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((data) => setStatus(data.ok ? "ok" : "prompt"))
      .catch(() => setStatus("prompt"));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (data.ok) {
      setStatus("ok");
    } else {
      setError(data.error || "Mot de passe incorrect");
    }
  };

  if (status === "loading") {
    return (
      <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a1a", color: "#999" }}>
        Chargement…
      </div>
    );
  }

  if (status === "prompt") {
    return (
      <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a1a", fontFamily: "system-ui" }}>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16, padding: 32, background: "#2a2a2a", borderRadius: 12, minWidth: 280 }}>
          <label style={{ color: "#fff", fontWeight: 600 }}>Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Entrez le mot de passe"
            autoFocus
            style={{ padding: "12px 16px", fontSize: 16, borderRadius: 8, border: "1px solid #444", background: "#1a1a1a", color: "#fff", outline: "none" }}
          />
          {error && <span style={{ color: "#f44", fontSize: 14 }}>{error}</span>}
          <button type="submit" style={{ padding: "12px 16px", fontSize: 16, fontWeight: 600, borderRadius: 8, border: "none", background: "#3b82f6", color: "#fff", cursor: "pointer" }}>
            Accéder
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
