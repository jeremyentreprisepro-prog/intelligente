# Accès Admin et User (deux mots de passe)

Tu peux définir **deux mots de passe** : un pour l’**admin** (accès à tout) et un pour les **users** (accès limité à certaines pages). L’admin « donne » l’accès aux users en configurant les pages autorisées via une variable d’environnement.

---

## Variables (Vercel ou `.env.local`)

| Variable | Rôle |
|----------|------|
| **`MAP_PASSWORD_ADMIN`** | Mot de passe admin → accès à **toutes** les pages protégées. |
| **`MAP_PASSWORD_USER`** | Mot de passe user → accès **uniquement** aux pages listées dans `MAP_USER_PAGES`. |
| **`MAP_USER_PAGES`** | Liste des chemins que le rôle **user** peut ouvrir (séparés par des virgules). Ex. : `/,/carte,/view` |

**Optionnel :** `MAP_AUTH_SECRET` — secret utilisé pour signer le cookie (par défaut on utilise `MAP_PASSWORD_ADMIN` ou `MAP_PASSWORD_USER`).

---

## Comportement

- **Connexion avec le mot de passe admin** → rôle **admin** → accès à toutes les pages.
- **Connexion avec le mot de passe user** → rôle **user** → accès seulement aux chemins dans `MAP_USER_PAGES`.
- Si un **user** tente d’ouvrir une page non autorisée → redirection vers `/login` avec un message « Vous n’avez pas accès à cette page ».

---

## Exemple de configuration (Vercel)

1. **Settings** → **Environment Variables** :
   - `MAP_PASSWORD_ADMIN` = `MonMotDePasseAdmin123`
   - `MAP_PASSWORD_USER` = `MotDePasseUser456`
   - `MAP_USER_PAGES` = `/,/carte`
2. **Redeploy** le projet.

Résultat : l’admin peut tout voir ; les users qui se connectent avec le second mot de passe ne peuvent aller que sur `/` et `/carte` (et leurs sous-chemins). Pour autoriser une nouvelle page (ex. `/rapports`), ajoute `MAP_USER_PAGES=/,/carte,/rapports` et redéploie.

**Important :** les chemins dans `MAP_USER_PAGES` doivent aussi être déclarés comme protégés dans le code. Dans **`lib/supabase/middleware.ts`**, le tableau **`PROTECTED_PATHS`** liste toutes les routes qui exigent une connexion. Par défaut il contient `["/"]`. Si tu ajoutes une page `/carte`, ajoute aussi `"/carte"` dans `PROTECTED_PATHS` pour que la connexion soit demandée, puis mets `MAP_USER_PAGES=/,/carte` pour que les users y aient accès.

---

## Récap

- **Admin** = un seul mot de passe, toutes les pages.
- **User** = un autre mot de passe, seulement les pages listées dans `MAP_USER_PAGES`.
- La page de login affiche un **seul champ mot de passe** : selon le mot de passe saisi, le backend attribue le rôle (admin ou user).
