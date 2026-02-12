"use client";

import { useState } from "react";
import Link from "next/link";

export default function SignupPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: login.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (data.ok) {
        setDone(true);
      } else {
        setError(data.error || "Erreur lors de l’inscription");
      }
    } catch {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
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
            padding: 32,
            background: "#2a2a2a",
            borderRadius: 12,
            minWidth: 320,
            textAlign: "center",
          }}
        >
          <p style={{ margin: "0 0 16px", color: "#fff", fontSize: 18 }}>
            Compte créé. Tu peux te connecter.
          </p>
          <Link href="/login" style={{ color: "#3b82f6", fontSize: 16 }}>
            Aller à la connexion
          </Link>
        </div>
      </div>
    );
  }

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
        }}
      >
        <h1 style={{ margin: 0, color: "#fff", fontSize: 20, fontWeight: 600 }}>
          Créer un compte
        </h1>
        <p style={{ margin: 0, color: "#999", fontSize: 14 }}>
          Choisis un identifiant et un mot de passe. L’admin pourra t’autoriser l’accès à certaines pages.
        </p>
        {error && (
          <span style={{ color: "#f44", fontSize: 14 }}>{error}</span>
        )}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ color: "#ccc", fontWeight: 500 }}>Identifiant</label>
          <input
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="Ex: jean.dupont"
            disabled={loading}
            required
            minLength={2}
            maxLength={64}
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
          <label style={{ color: "#ccc", fontWeight: 500 }}>Mot de passe (6 caractères min.)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            disabled={loading}
            required
            minLength={6}
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
          <label style={{ color: "#ccc", fontWeight: 500 }}>Confirmer le mot de passe</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirmer"
            disabled={loading}
            required
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
              background: "#22c55e",
              color: "#fff",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Création…" : "Créer mon compte"}
          </button>
        </form>
        <p style={{ margin: 0, fontSize: 14, color: "#999" }}>
          Déjà un compte ? <a href="/login" style={{ color: "#3b82f6" }}>Se connecter</a>
        </p>
      </div>
    </div>
  );
}
