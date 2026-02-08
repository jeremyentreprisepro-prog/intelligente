# Configuration Supabase – Carte partagée

Pour que toi et ton collègue travailliez sur la **même carte**, configure Supabase :

## 1. Créer un projet Supabase

1. Va sur [supabase.com](https://supabase.com) et crée un compte
2. Crée un nouveau projet (gratuit)
3. Récupère l’**URL** et la **clé anon** dans : Settings → API

## 2. Créer la table

Dans Supabase : **SQL Editor** → New query, colle et exécute :

```sql
CREATE TABLE IF NOT EXISTS public.maps (
  id TEXT PRIMARY KEY,
  document JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_session TEXT
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.maps;

ALTER TABLE public.maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for maps" ON public.maps
  FOR ALL USING (true) WITH CHECK (true);
```

## 3. Variables d’environnement

Crée un fichier `.env.local` à la racine du projet :

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Remplace par les vraies valeurs de ton projet Supabase.

## 4. Mot de passe (optionnel)

Pour protéger l'accès, ajoute dans `.env.local` et sur Vercel :

```
MAP_PASSWORD=ton_mot_de_passe_secret
```

Seules les personnes connaissant ce mot de passe pourront accéder à la carte.

## 5. Déployer

Déploie sur Vercel et ajoute ces variables dans **Project Settings** → **Environment Variables** :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `MAP_PASSWORD` (pour la protection par mot de passe)

Tu pourras alors partager l’URL et travailler à deux sur la même carte en temps réel.
