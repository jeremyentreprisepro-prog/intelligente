# Mettre la carte en ligne pour ton équipe — Guide détaillé

Ce guide décrit **chaque étape** pour que ton équipe puisse travailler sur la même carte en temps réel.

---

## Étape 1 — Créer la base de données (Supabase)

L’objectif de cette étape : avoir un **projet Supabase** (une base en ligne), récupérer **l’URL** et **la clé anon** pour que l’app puisse s’y connecter, puis créer la **table** qui stockera la carte.

---

### 1.1 Ouvrir Supabase et se connecter

1. Ouvre ton navigateur (Chrome, Firefox, Edge, etc.).
2. Dans la barre d’adresse, tape : **https://supabase.com** puis Entrée.
3. Sur la page d’accueil :
   - Si tu n’as pas de compte : clique sur **Start your project** (bouton vert).
   - Si tu as déjà un compte : clique sur **Sign in** (en haut à droite).
4. Connecte-toi avec **GitHub**, **Google** ou **email + mot de passe**, selon ce que tu utilises.
5. Une fois connecté, tu arrives sur le **Dashboard** : une page avec le menu à gauche (icônes) et au centre la liste de tes projets (ou un message "No projects yet").

---

### 1.2 Créer un nouveau projet

1. Sur le Dashboard, clique sur le bouton vert **New project** (en haut à droite ou au centre).
2. Tu arrives sur une page "Create a new project". Remplis :
   - **Organization** : laisse celui proposé (souvent "Personal" ou ton compte).
   - **Name** : donne un nom au projet, par exemple `map-equipe` ou `map-intelligente`. C’est juste pour toi, pas besoin que ce soit unique sur toute la planète.
   - **Database Password** : invente un mot de passe **fort** (lettres, chiffres, symboles) et **note-le** dans un endroit sûr. Ce mot de passe sert à protéger la base de données. On ne s’en sert pas dans l’app pour les utilisateurs, c’est uniquement pour l’accès admin à la base.
   - **Region** : choisis une région proche (ex. **West EU (Ireland)** pour la France). Ça limite le temps de réponse.
3. Clique sur **Create new project** (bouton en bas de la page).
4. Supabase crée le projet (environ 1 à 2 minutes). Tu vois un écran "Setting up your project..." puis "Your project is ready". Ne ferme pas la page.

---

### 1.3 Récupérer l’URL du projet et la clé "anon public"

Une fois le projet prêt, il faut récupérer **deux infos** que l’app va utiliser pour se connecter à ta base : l’**URL** et la **clé anon**.

1. Dans le **menu à gauche** (barre verticale avec des icônes), descends tout en bas et clique sur l’icône **engrenage** (⚙️).  
   → La page **Project Settings** s’ouvre.

2. Dans le **sous-menu à gauche** de Project Settings, clique sur **API**.  
   → Tu vois une page avec "Project URL", "API URL", "Project API keys", etc.

3. **Project URL**  
   - Tu vois un bloc avec **Project URL** et une adresse du type :  
     `https://xxxxxxxxxxxx.supabase.co`  
   - Clique sur l’icône **copier** (ou sélectionne l’URL et copie).  
   - Colle-la dans un fichier texte ou un bloc-notes sur ton PC.  
   - **C’est cette URL** que tu mettras dans `.env.local` sous le nom `NEXT_PUBLIC_SUPABASE_URL`.  
   - Avec ta ref Supabase, ton URL ressemble à :  
     `https://squimmlvdiduacmtclkx.supabase.co`

4. **Clé API à utiliser : anon public (pas la publishable)**  
   - Plus bas sur la même page, tu vois **Project API keys** avec plusieurs clés.
   - Il peut y avoir :
     - **anon** / **public** : une très longue chaîne qui **commence par `eyJ`** (ex. `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`).  
       → **C’est celle-ci qu’il faut utiliser.** C’est la clé "anon public". Tu la mets dans `.env.local` sous le nom `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
     - **service_role** : une autre longue clé. **Ne l’utilise pas** pour ce projet (elle donne tous les droits, elle ne doit jamais être exposée dans le navigateur).
     - Parfois une clé **"publishable"** ou **sb_publishable_...** (qui commence par `sb_publishable_`).  
       → **Pour ce projet, on n’utilise pas cette clé.** On utilise uniquement la clé **anon** qui commence par `eyJ...`.

5. **Résumé à retenir**  
   - Pour l’étape 2, tu auras besoin de :  
     - **URL** = celle qui se termine par `.supabase.co` (Project URL).  
     - **Clé** = la clé **anon public** (celle qui commence par `eyJ...`), **pas** la publishable (`sb_publishable_...`).

---

### 1.4 Créer la table qui stocke la carte

L’app envoie et reçoit la carte sous forme d’un gros JSON. Supabase doit avoir une **table** avec une colonne pour ce JSON. On la crée avec une requête SQL.

1. Dans le **menu à gauche**, clique sur **SQL Editor** (icône qui ressemble à `</>` ou à une fenêtre de code).  
   → La page SQL Editor s’ouvre.

2. Clique sur le bouton **+ New query** (en haut à droite).  
   → Un nouvel onglet ou un éditeur vide s’ouvre avec une zone de texte pour taper du SQL.

3. **Supprime** tout ce qui est déjà écrit dans l’éditeur (s’il y a un exemple ou du texte par défaut).

4. **Copie** tout le bloc SQL ci-dessous (du premier `CREATE` au dernier `;`) et **colle-le** dans l’éditeur :

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

5. En bas de l’éditeur, clique sur le bouton **Run** (ou utilise le raccourci **Ctrl+Entrée**).  
   → Supabase exécute la requête.

6. **Résultat attendu** : en bas de l’écran, un message vert du type **Success. No rows returned**.  
   - Si tu vois une **erreur en rouge** : vérifie que tu as bien tout collé (y compris les point-virgules en fin de ligne) et qu’il n’y a pas de ligne en double ou de caractère bizarre. Corrige et clique à nouveau sur **Run**.

7. **Vérifier que la table existe** :  
   - Dans le menu de gauche, clique sur **Table Editor** (icône tableau).  
   - Tu dois voir une table nommée **maps**.  
   - En cliquant dessus, tu vois les colonnes : `id`, `document`, `updated_at`, `updated_by_session`.  
   - La table peut être vide (0 rows), c’est normal. L’app créera la première ligne quand tu enregistreras la carte.

---

**Ce que tu as fait à la fin de l’étape 1**

- Un projet Supabase créé.  
- L’**URL** du projet notée (pour `NEXT_PUBLIC_SUPABASE_URL`).  
- La clé **anon public** (celle qui commence par `eyJ...`) notée (pour `NEXT_PUBLIC_SUPABASE_ANON_KEY`).  
- Une table **maps** créée et prête à recevoir la carte.

Tu peux passer à l’étape 2 (créer le fichier `.env.local` et y mettre cette URL et cette clé).

---

## Étape 2 — Configurer le projet en local

### 2.1 Où se trouve la racine du projet

La racine du projet est le dossier qui contient notamment :

- `package.json`
- `app/`
- `components/`
- `supabase-migration.sql`

Ouvre ce dossier dans Cursor (ou ton éditeur). Toutes les commandes et chemins ci-dessous sont à faire **depuis cette racine**.

### 2.2 Créer le fichier `.env.local`

1. À la **racine du projet** (même niveau que `package.json`), crée un **nouveau fichier**.
2. Nomme-le exactement : **`.env.local`** (avec le point au début, sans extension).
   - Sous Windows : si l’éditeur te propose "nom + extension", mets bien `.env.local` en entier.
   - Ce fichier est en général ignoré par Git (il ne doit **pas** contenir de secrets dans le dépôt).
3. Ouvre `.env.local` et ajoute **deux lignes** en remplaçant par tes vraies valeurs (celles copiées à l’étape 1.3) :

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

- **Pas d’espaces** autour du `=`.
- **Pas de guillemets** autour des valeurs (sauf si ta clé contient des espaces, ce qui est rare).
- L’URL doit commencer par `https://` et se terminer par `.supabase.co`.
- La clé anon fait souvent plusieurs lignes visuellement ; en réalité c’est **une seule ligne** sans retour à la ligne au milieu.

4. **Enregistre** le fichier.

### 2.3 Redémarrer le serveur de dev

1. Si le serveur Next.js tourne déjà (`npm run dev`), arrête-le avec **Ctrl+C** dans le terminal.
2. Relance :

```bash
npm run dev
```

3. Attends le message du type "Ready in X ms" et l’URL `http://localhost:3000`.

**Pourquoi redémarrer ?** Next.js lit `.env.local` au démarrage. Sans redémarrage, les nouvelles variables ne sont pas prises en compte.

### 2.4 Vérifier que la carte utilise Supabase

1. Ouvre **http://localhost:3000** dans ton navigateur.
2. Tu dois voir l’app avec la barre d’outils (Groupes, Cartes, + Groupe, etc.) et la zone de carte (blanche).
3. Clique sur **+ Groupe** : un bloc "Groupe" doit apparaître sur la carte.
4. **Ouvre un nouvel onglet** (ou une fenêtre privée) et va aussi sur **http://localhost:3000**. Tu dois voir **le même groupe** que dans le premier onglet (même position). Cela prouve que la carte est bien lue/écrite dans Supabase.
5. (Optionnel) Va dans Supabase → **Table Editor** → table **maps**. Tu dois voir une ligne avec un `id` (ex. `map-intelligente`) et une colonne `document` contenant du JSON.

**Si la carte ne se charge pas ou reste vide :**

- Vérifie que `.env.local` est bien à la racine et que les noms des variables sont **exactement** `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Vérifie qu’il n’y a pas d’espace en trop ou de caractère manquant dans l’URL ou la clé.
- Ouvre la **console** du navigateur (F12 → Console) et regarde s’il y a des erreurs en rouge.

**Résumé étape 2 :** En local, l’app lit et enregistre la carte dans Supabase ; tu as vérifié que ça fonctionne.

---

## Étape 3 — Mettre l’app en ligne (Vercel)

### 3.1 Pousser le code sur GitHub

1. Si le projet n’est pas encore sur GitHub :
   - Va sur **https://github.com** et connecte-toi.
   - Clique sur **+** → **New repository**.
   - Donne un nom (ex. `map-intelligente`), laisse le repo vide (pas de README ajouté par défaut si tu as déjà un projet local).
   - Crée le repo.
2. Dans un terminal, à la **racine du projet** :

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TON_COMPTE/TON_REPO.git
git push -u origin main
```

Remplace `TON_COMPTE` et `TON_REPO` par ton nom d’utilisateur GitHub et le nom du dépôt. Si le dépôt existait déjà avec des commits, adapte (par ex. `git pull origin main --rebase` puis `git push -u origin main`).

3. Vérifie sur GitHub que tous les fichiers sont bien présents. **Important :** le fichier `.env.local` ne doit **pas** être poussé (il est dans `.gitignore`). Les secrets restent uniquement sur ta machine et dans Vercel.

### 3.2 Créer un projet sur Vercel

1. Va sur **https://vercel.com** et connecte-toi (avec GitHub si possible).
2. Clique sur **Add New…** → **Project**.
3. Tu vois la liste des dépôts GitHub. Choisis le dépôt du projet (ex. `map-intelligente`) et clique sur **Import**.
4. Sur la page de configuration du projet :
   - **Framework Preset** : Vercel doit détecter **Next.js** automatiquement. Ne change rien sauf si tu sais ce que tu fais.
   - **Root Directory** : laisse vide (racine du repo).
   - **Build and Output Settings** : par défaut ça suffit.

### 3.3 Ajouter les variables d’environnement

1. Sur la même page (avant de déployer), trouve la section **Environment Variables**.
2. Pour **chaque** variable, remplis :
   - **Name** : exactement le nom (copier-coller pour éviter les fautes).
   - **Value** : la valeur (URL ou clé anon).
   - **Environments** : coche **Production**, **Preview**, **Development** (ou au minimum **Production**).

Ajoute **deux** variables :

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ton-projet.supabase.co` (ton URL Supabase) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` (ta clé anon Supabase) |

3. Clique sur **Add** après chaque ligne. Les deux doivent apparaître dans la liste.

### 3.4 Déployer

1. Clique sur le bouton **Deploy**.
2. Vercel build le projet (1 à 2 min). Tu vois les logs en direct.
3. À la fin, tu as un message **Congratulations** et une **URL** du type :
   - `https://map-intelligente-xxx.vercel.app`  
   ou  
   - `https://ton-repo.vercel.app`

4. Clique sur **Visit** (ou ouvre l’URL dans un nouvel onglet). Tu dois voir la même app qu’en local, et la carte doit se charger (vide ou avec ce que tu as déjà mis en local via Supabase).

**Si le build échoue :**

- Regarde l’onglet **Build Logs** : l’erreur indique souvent un fichier ou une dépendance manquante.
- Vérifie que les variables sont bien nommées (sans faute) et qu’elles sont bien enregistrées.

**Résumé étape 3 :** L’app est en ligne sur une URL Vercel et utilise la même base Supabase que en local.

---

## Étape 4 — (Optionnel) Protéger l’accès par mot de passe

Si tu veux que seules les personnes qui connaissent un mot de passe puissent ouvrir la carte :

### 4.1 Choisir un mot de passe

Choisis un mot de passe que tu pourras communiquer à ton équipe de façon sécurisée (pas dans un email public, idéalement par un outil type 1Password / Bitwarden ou en direct).

### 4.2 Ajouter la variable en local

1. Ouvre **`.env.local`**.
2. Ajoute une **troisième ligne** :

```env
MAP_PASSWORD=le_mot_de_passe_que_tu_as_choisi
```

3. Enregistre et redémarre `npm run dev` si besoin. En local, après avoir entré ce mot de passe une fois, l’accès est mémorisé (session).

### 4.3 Ajouter la variable sur Vercel

1. Va sur **vercel.com** → ton projet → **Settings** → **Environment Variables**.
2. **Add New** :
   - **Name** : `MAP_PASSWORD`
   - **Value** : le même mot de passe que en local.
   - **Environments** : Production (et Preview si tu veux la même chose pour les préviews).
3. **Save**.
4. Pour que la variable soit prise en compte sur le site déjà déployé : **Deployments** → sur le dernier déploiement, menu **⋯** → **Redeploy**. Attends la fin du déploiement.

### 4.4 Vérifier

Ouvre l’URL du site en navigation privée (ou déconnecte le stockage du site). Tu dois voir une page qui demande le mot de passe. Après l’avoir entré, tu accèdes à la carte.

**Résumé étape 4 :** Seuls les utilisateurs qui ont le mot de passe peuvent ouvrir la carte.

---

## Étape 5 — Partager avec ton équipe

### 5.1 Ce qu’il faut leur envoyer

- **L’URL du site** : celle affichée après le déploiement Vercel (ex. `https://map-intelligente-xxx.vercel.app`).
- **Le mot de passe** (si tu as activé l’étape 4) : à transmettre de façon sécurisée.

### 5.2 Comment ils utilisent la carte

1. Ils ouvrent l’URL dans leur navigateur.
2. Si un mot de passe est demandé, ils l’entrent une fois (mémorisé pour la session).
3. Ils voient la **même carte** que toi. Les modifications (groupes, liens, déplacements) se **synchronisent en temps réel** pour tous ceux qui ont la page ouverte (grâce à Supabase Realtime).

### 5.3 Bonnes pratiques

- Ne partage **pas** l’URL publique sur un endroit très visible (type réseau social) si la carte contient des infos sensibles ; le mot de passe limite l’accès mais l’URL reste connue.
- Si quelqu’un perd l’accès : vérifie qu’il utilise la bonne URL et le bon mot de passe (si activé).
- Pour changer le mot de passe : modifie `MAP_PASSWORD` sur Vercel, redéploie, et communique le nouveau mot de passe à l’équipe.

**Résumé étape 5 :** L’équipe a l’URL (et le mot de passe si besoin) et travaille ensemble sur la même carte en temps réel.

---

## Récapitulatif des étapes

| Étape | Où | Action détaillée |
|-------|-----|-------------------|
| 1 | Supabase | Compte → Nouveau projet → Noter URL + clé anon → SQL Editor : créer la table `maps` |
| 2 | Projet local | Créer `.env.local` avec URL + clé → Redémarrer `npm run dev` → Tester en créant un groupe et en ouvrant un 2e onglet |
| 3 | Vercel | Importer le repo GitHub → Ajouter les 2 variables d’env → Deploy → Vérifier l’URL |
| 4 | Optionnel | Ajouter `MAP_PASSWORD` en local et sur Vercel → Redéployer si besoin |
| 5 | Équipe | Partager l’URL Vercel (+ mot de passe si configuré) |

---

## Dépannage rapide

- **La carte reste vide en production**  
  Vérifie que `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` sont bien définies sur Vercel (Settings → Environment Variables) et que tu as redéployé après les avoir ajoutées.

- **Erreur "Failed to fetch" ou CORS**  
  Vérifie que l’URL Supabase dans les variables est exactement celle du projet (Settings → API dans Supabase).

- **La table n’existe pas**  
  Rejoue le SQL de l’étape 1.4 dans Supabase (SQL Editor). Vérifie dans Table Editor que la table `maps` est bien là.

- **Le mot de passe ne marche pas**  
  Vérifie qu’il n’y a pas d’espace avant/après dans la valeur de `MAP_PASSWORD` sur Vercel, et que tu as bien redéployé après l’ajout.

Si tu suis chaque étape dans l’ordre, tu obtiens une carte en ligne partagée en temps réel pour toute ton équipe.
