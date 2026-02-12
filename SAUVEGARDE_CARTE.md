# Pour ne jamais perdre ta carte

Checklist pour que tout soit carré et que ta carte ne se perde plus.

---

## 1. Supabase (à faire une fois)

Dans **Supabase** → **SQL Editor**, exécute ces scripts **dans l’ordre** :

### Table et colonnes
- Si la table `maps` n’existe pas : exécute tout **`supabase-migration.sql`**.
- Si elle existe déjà : exécute **`supabase-migration-document-compressed.sql`** (ajoute la colonne pour les gros documents).

### Timeout (obligatoire pour les grosses cartes)
Exécute **`supabase-migration-timeout.sql`** :
```sql
ALTER ROLE anon SET statement_timeout = '60s';
ALTER ROLE authenticated SET statement_timeout = '60s';
NOTIFY pgrst, 'reload config';
```
Sans ça, la sauvegarde peut échouer avec « statement timeout » sur une grosse carte.

---

## 2. Sur l’app au quotidien

- **Sauvegarder maintenant** (bouton dans la barre) : enregistre tout de suite sur Supabase **et** télécharge un fichier backup sur ton PC. À cliquer après une grosse session de travail.
- **Télécharger une copie** : télécharge un fichier `.json` de la carte (backup local). Fais-le régulièrement et garde les fichiers (PC, Drive, etc.).
- **Restaurer depuis un fichier** : si un jour la carte est vide ou perdue, tu choisis un fichier backup `.json` et tout revient.

---

## 3. Ce que l’app fait toute seule

- **Sauvegarde auto** : environ 400 ms après ta dernière modification, la carte est envoyée à Supabase.
- **Sauvegarde au départ** : quand tu quittes l’onglet, rafraîchis ou fermes la page, une dernière sauvegarde est lancée.
- **Pas de carte vide enregistrée** : l’app ne peut pas écraser ta carte avec du vide (protection côté code).
- **Retry** : si Supabase répond « timeout », l’app réessaie 2 fois toute seule.
- **Chargement limité à 12 s** : si le chargement dépasse 12 s, la carte s’affiche quand même (vide) et tu peux restaurer depuis un fichier.

---

## 4. En résumé

1. Exécute les migrations Supabase (table, `document_compressed`, timeout).
2. Après une grosse session : clique sur **Sauvegarder maintenant** (tu auras Supabase + un fichier).
3. De temps en temps : **Télécharger une copie** et range le fichier.
4. En cas de pépin : **Restaurer depuis un fichier** avec ton dernier backup.

Comme ça, ta carte est en sécurité sur Supabase et tu as toujours une copie en fichier.
