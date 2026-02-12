"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") ?? "/";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((data) => setUsePassword(!!data.usePassword))
      .catch(() => setUsePassword(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.ok) {
        window.location.href = returnUrl;
        return;
      }
      setError(data.error || "Mot de passe incorrect");
    } catch {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1a1a1a",
        fontFamily: "system-ui",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
          padding: 32,
          background: "#2a2a2a",
          borderRadius: 12,
          minWidth: 320,
          alignItems: "center",
        }}
      >
        <h1 style={{ margin: 0, color: "#fff", fontSize: 20, fontWeight: 600 }}>
          Accès à la carte
        </h1>
        {error && (
          <span style={{ color: "#f44", fontSize: 14, textAlign: "center" }}>
            {error}
          </span>
        )}

        {usePassword && (
          <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              width: "100%",
            }}
          >
            <label style={{ color: "#ccc", fontWeight: 500 }}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              disabled={loading}
              autoComplete="current-password"
              style={{
                padding: "12px 16px",
                fontSize: 16,
                borderRadius: 8,
                border: "1px solid #444",
                background: "#1a1a1a",
                color: "#fff",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "12px 16px",
                fontSize: 16,
                fontWeight: 600,
                borderRadius: 8,
                border: "none",
                background: "#3b82f6",
                color: "#fff",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              Accéder
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#1a1a1a",
            color: "#999",
          }}
        >
          Chargement…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
