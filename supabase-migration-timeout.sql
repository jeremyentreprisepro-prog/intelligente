-- À exécuter dans Supabase → SQL Editor (une seule fois)
-- Donne plus de temps aux requêtes (sauvegarde de gros documents).
-- Sans ça : "canceling statement due to statement timeout".

ALTER ROLE anon SET statement_timeout = '60s';
ALTER ROLE authenticated SET statement_timeout = '60s';

-- Recharger la config PostgREST (optionnel, un redémarrage du projet peut être nécessaire)
NOTIFY pgrst, 'reload config';
