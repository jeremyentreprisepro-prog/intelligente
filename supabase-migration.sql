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
