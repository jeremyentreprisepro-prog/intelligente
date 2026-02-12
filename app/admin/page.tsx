"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Account = { id: string; login: string; allowed_pages: string[]; created_at: string };

export default function AdminPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/accounts")
      .then((r) => {
        if (r.status === 403) throw new Error("Non autorisé");
        return r.json();
      })
      .then((data) => setAccounts(Array.isArray(data.accounts) ? data.accounts : []))
      .catch((e) => setError(e?.message || "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  const updateAccountPages = (accountId: string, pages: string[]) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === accountId ? { ...a, allowed_pages: pages } : a))
    );
  };

  const saveAccount = async (accountId: string, pages: string[]) => {
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/accounts/${accountId}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erreur");
      setMessage(`Accès mis à jour pour le compte.`);
    } catch (e) {
      setError((e as Error)?.message || "Erreur lors de l’enregistrement");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui" }}>
        Chargement…
      </div>
    );
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", maxWidth: 640 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Link href="/" style={{ color: "#3b82f6", textDecoration: "none" }}>
          ← Retour à la carte
        </Link>
      </div>
      <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 600 }}>
        Comptes et accès
      </h1>
      <p style={{ margin: "0 0 24px", color: "#666", fontSize: 14 }}>
        Chaque compte (identifiant + mot de passe) peut avoir accès à des pages différentes. Modifie la liste des pages autorisées pour chaque compte.
      </p>

      {error && (
        <div style={{ marginBottom: 16, padding: 12, background: "#fef2f2", color: "#b91c1c", borderRadius: 8 }}>
          {error}
        </div>
      )}
      {message && (
        <div style={{ marginBottom: 16, padding: 12, background: "#f0fdf4", color: "#15803d", borderRadius: 8 }}>
          {message}
        </div>
      )}

      {accounts.length === 0 ? (
        <p style={{ color: "#666" }}>Aucun compte pour l’instant. Les utilisateurs peuvent en créer un sur la page <a href="/signup" style={{ color: "#3b82f6" }}>Créer un compte</a>.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onUpdatePages={(pages) => updateAccountPages(account.id, pages)}
              onSave={() => saveAccount(account.id, account.allowed_pages)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AccountCard({
  account,
  onUpdatePages,
  onSave,
}: {
  account: Account;
  onUpdatePages: (pages: string[]) => void;
  onSave: () => void;
}) {
  const [newPath, setNewPath] = useState("");
  const [saving, setSaving] = useState(false);
  const pages = account.allowed_pages ?? ["/"];

  const addPath = () => {
    const p = newPath.trim();
    if (!p) return;
    const path = p.startsWith("/") ? p : "/" + p;
    if (pages.includes(path)) {
      setNewPath("");
      return;
    }
    onUpdatePages([...pages, path].sort());
    setNewPath("");
  };

  const removePath = (path: string) => {
    onUpdatePages(pages.filter((p) => p !== path));
  };

  return (
    <div
      style={{
        padding: 16,
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        background: "#fafafa",
      }}
    >
      <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <strong style={{ fontSize: 16 }}>{account.login}</strong>
        <span style={{ color: "#666", fontSize: 12 }}>
          (créé le {new Date(account.created_at).toLocaleDateString("fr-FR")})
        </span>
      </div>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "#666" }}>
        Pages autorisées pour ce compte :
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          value={newPath}
          onChange={(e) => setNewPath(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPath())}
          placeholder="Ex: / ou /carte"
          style={{
            flex: 1,
            padding: "8px 12px",
            fontSize: 14,
            borderRadius: 8,
            border: "1px solid #ccc",
          }}
        />
        <button
          type="button"
          onClick={addPath}
          style={{
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 500,
            borderRadius: 8,
            border: "none",
            background: "#3b82f6",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Ajouter
        </button>
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px" }}>
        {pages.map((path) => (
          <li
            key={path}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 10px",
              marginBottom: 4,
              background: "#fff",
              borderRadius: 6,
              border: "1px solid #eee",
            }}
          >
            <code style={{ fontSize: 13 }}>{path || "/"}</code>
            <button
              type="button"
              onClick={() => removePath(path)}
              style={{
                padding: "2px 8px",
                fontSize: 12,
                color: "#b91c1c",
                background: "transparent",
                border: "1px solid #fecaca",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Retirer
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={async () => {
          setSaving(true);
          await onSave();
          setSaving(false);
        }}
        disabled={saving}
        style={{
          padding: "8px 16px",
          fontSize: 14,
          fontWeight: 600,
          borderRadius: 8,
          border: "none",
          background: saving ? "#94a3b8" : "#22c55e",
          color: "#fff",
          cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {saving ? "Enregistrement…" : "Enregistrer pour ce compte"}
      </button>
    </div>
  );
}
