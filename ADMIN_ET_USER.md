# Comptes et accès (admin + users)

- **Admin** : mot de passe défini par `MAP_PASSWORD_ADMIN` → accès à tout, dont la page **Admin** pour gérer les comptes.
- **Comptes** : une personne **crée un compte** (identifiant + mot de passe qu’elle choisit), puis **toi en admin** tu décides quelles pages ce compte peut voir.

---

## Côté utilisateur

1. **Créer un compte** : aller sur **/signup**, choisir un **identifiant** (ex. `jean.dupont`) et un **mot de passe** (6 caractères min.).
2. **Se connecter** : aller sur **/login**, saisir **identifiant + mot de passe** du compte → accès aux seules pages que l’admin a autorisées pour ce compte.

---

## Côté admin (toi)

1. **Se connecter en admin** : sur **/login**, laisser l’identifiant vide et saisir le **mot de passe admin** (`MAP_PASSWORD_ADMIN`).
2. **Gérer les comptes** : cliquer sur **Admin** dans la barre d’outils (ou ouvrir **/admin**). Tu vois la **liste des comptes** (identifiant, date de création). Pour chaque compte :
   - **Ajouter** des chemins (ex. `/`, `/carte`) dans « Pages autorisées »,
   - **Retirer** des chemins si besoin,
   - Cliquer sur **Enregistrer pour ce compte**.

Chaque compte a sa propre liste de pages autorisées. Tu peux donner à un compte uniquement `/`, à un autre `/` et `/carte`, etc.

---

## Variables (Vercel ou `.env.local`)

| Variable | Rôle |
|----------|------|
| **`MAP_PASSWORD_ADMIN`** | Mot de passe admin → accès à tout + page Admin. **Recommandé** pour gérer les comptes. |
| **`MAP_PASSWORD_USER`** | (Optionnel) Mot de passe « user » global → accès aux pages listées dans `MAP_USER_PAGES` (ancien mode). |
| **`MAP_USER_PAGES`** | (Optionnel) Liste des chemins pour le mot de passe user global (ex. `/,/carte`). |

**Optionnel :** `MAP_AUTH_SECRET` — secret pour signer le cookie.

**Important (connexion par compte en production) :** Pour que la connexion avec identifiant + mot de passe fonctionne sur Vercel, **au moins une** des variables `MAP_PASSWORD_ADMIN` ou `MAP_AUTH_SECRET` doit être définie. Elles servent à signer et vérifier le cookie d’authentification (y compris dans le middleware Edge). Sans cela, après un login réussi le cookie n’est pas reconnu et l’utilisateur est renvoyé sur la page de connexion.

---

## Supabase

- La table **`accounts`** stocke les comptes (identifiant, mot de passe hashé, pages autorisées). Créer la table avec le SQL dans **`supabase-migration.sql`** (section `accounts`).
- Sans Supabase, seuls les mots de passe admin/user (variables d’env) fonctionnent ; la création de comptes et la gestion par compte ne sont pas disponibles.

---

## Récap

- **Inscription** : /signup → identifiant + mot de passe (choisis par l’utilisateur).
- **Connexion** : /login → identifiant (optionnel) + mot de passe. Si identifiant renseigné = connexion par compte ; sinon = admin ou user global.
- **Admin** : mot de passe admin → accès à tout + page **/admin** pour définir, **par compte**, les pages autorisées.
