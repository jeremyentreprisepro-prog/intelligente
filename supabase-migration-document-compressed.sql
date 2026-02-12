-- À exécuter dans Supabase → SQL Editor si la table maps existe déjà
-- (pour supporter les gros documents via compression)

ALTER TABLE public.maps ADD COLUMN IF NOT EXISTS document_compressed TEXT;
