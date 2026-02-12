"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

  const handlePasswordSubmit = async (e: React.FormEvent) => {
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

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase non configuré");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const host = typeof window !== "undefined" ? window.location.origin : "";
      const redirectTo = `${host}/auth/callback?next=${encodeURIComponent(returnUrl)}`;
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (err) {
        setError(err.message || "Erreur de connexion");
        setLoading(false);
        return;
      }
    } catch (e) {
      setError("Erreur de connexion");
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
            onSubmit={handlePasswordSubmit}
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
              placeholder="Entrez le mot de passe"
              disabled={loading}
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
              Accéder avec le mot de passe
            </button>
          </form>
        )}

        {usePassword && (
          <span style={{ color: "#666", fontSize: 13 }}>ou</span>
        )}

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "12px 24px",
            fontSize: 16,
            fontWeight: 600,
            borderRadius: 8,
            border: "none",
            background: "#fff",
            color: "#333",
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {loading ? "Redirection…" : "Continuer avec Google"}
        </button>
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
