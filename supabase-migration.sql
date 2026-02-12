-- À exécuter dans le SQL Editor de Supabase (supabase.com → votre projet → SQL Editor)

CREATE TABLE IF NOT EXISTS public.maps (
  id TEXT PRIMARY KEY,
  document JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_session TEXT
);

-- Activer Realtime pour recevoir les mises à jour des autres utilisateurs
ALTER PUBLICATION supabase_realtime ADD TABLE public.maps;

-- Politique RLS : lecture et écriture pour tous (à adapter si vous ajoutez l'auth)
ALTER TABLE public.maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for maps" ON public.maps
  FOR ALL USING (true) WITH CHECK (true);

-- Config app (ex: pages accessibles aux users) — l’admin modifie depuis l’app
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for app_config" ON public.app_config
  FOR ALL USING (true) WITH CHECK (true);

-- Valeur par défaut (liste des chemins accessibles au rôle user)
INSERT INTO public.app_config (key, value) VALUES ('user_allowed_pages', '["/"]')
  ON CONFLICT (key) DO NOTHING;

-- Comptes utilisateurs : identifiant + mdp hashé, pages autorisées par compte (l’admin gère)
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  login TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  allowed_pages JSONB NOT NULL DEFAULT '["/"]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for accounts" ON public.accounts
  FOR ALL USING (true) WITH CHECK (true);
