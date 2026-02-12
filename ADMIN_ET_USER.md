# Accès à la carte (un seul mot de passe)

- Une seule protection : le **mot de passe** défini par la variable **`MAP_PASSWORD`** (Vercel ou `.env.local`).
- Sur **/login**, l’utilisateur saisit le mot de passe → accès à la carte. Lien « Déconnexion » dans la barre d’outils pour se déconnecter.

## Variables

| Variable | Rôle |
|----------|------|
| **`MAP_PASSWORD`** | Mot de passe pour accéder à la carte. Si non défini, la carte est accessible sans connexion. |
| **`MAP_AUTH_SECRET`** | (Optionnel) Secret pour signer le cookie. Si non défini, `MAP_PASSWORD` est utilisé pour la signature. |

En production (Vercel), définir **`MAP_PASSWORD`** pour activer la page de connexion.
