# Connexion avec Google

L’accès à la carte est protégé par **connexion Google** (Supabase Auth). Seuls les utilisateurs connectés avec un compte Google peuvent accéder aux pages protégées.

---

## 1. Configurer Google Cloud (OAuth)

1. Va sur [Google Cloud Console](https://console.cloud.google.com/).
2. Crée un **projet** ou sélectionne-en un.
3. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
4. Si demandé, configure l’**écran de consentement OAuth** (type “Externe”, nom de l’app, etc.).
5. Type d’application : **Web application**.
6. **Authorized JavaScript origins** :
   - En local : `http://localhost:3000`
   - En prod : `https://ton-domaine.vercel.app` (ou ton URL)
7. **Authorized redirect URIs** : ajoute l’URL de callback **Supabase** :
   - Va dans ton projet Supabase → **Authentication** → **Providers** → **Google**.
   - Copie l’URL affichée (du type `https://xxxxx.supabase.co/auth/v1/callback`) et colle-la dans les redirect URIs Google.
8. Crée le client et note le **Client ID** et le **Client Secret**.

---

## 2. Configurer Supabase (provider Google)

1. Supabase → ton projet → **Authentication** → **Providers**.
2. Ouvre **Google** et active-le.
3. Colle le **Client ID** et le **Client Secret** Google, puis enregistre.
4. **Authentication** → **URL Configuration** :
   - **Site URL** : l’URL de ton app (ex. `https://ton-domaine.vercel.app` ou `http://localhost:3000` en dev).
   - **Redirect URLs** : ajoute explicitement :
     - `http://localhost:3000/auth/callback` (dev)
     - `https://ton-domaine.vercel.app/auth/callback` (prod)

Sans ces URLs, Google redirigera vers Supabase qui refusera la redirection.

---

## 3. Côté application

Aucune variable d’environnement supplémentaire n’est nécessaire pour Google : le projet utilise déjà `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Dès que le provider Google est activé dans Supabase et les URLs configurées, la connexion Google fonctionne.

---

## 4. Comportement

- **Pages protégées** (par défaut : `/`) : redirection vers `/login` si l’utilisateur n’est pas connecté.
- **Connexion** : clic sur « Continuer avec Google » → choix du compte Google → redirection vers la carte.
- **Déconnexion** : lien « Déconnexion » dans la barre d’outils de la carte (ou `/api/auth/logout`).

Les routes protégées sont définies dans `lib/supabase/middleware.ts` (tableau `PROTECTED_PATHS`).
