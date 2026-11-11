# PIXEL PLAY — boutique + back-office (React · Vite · Supabase · Vercel)

## Architecture
```
Navigateur (React/Vite) ──anon key + RLS──▶ Supabase (PostgreSQL · Auth · Storage)
        │                                          ▲
        └──── /api/* (Vercel Functions) ── service_role (serveur uniquement)
```
- **Site public** : catalogue lu en direct dans Supabase (RLS : produits non archivés uniquement). Sans configuration Supabase, le site affiche des données de démonstration marquées « Démo ».
- **Panier** : état central (Context + `localStorage`). Aucun bouton WhatsApp sur les produits ; commande uniquement depuis `/panier`, après **revérification serveur** des prix et stocks (`/api/cart/check`). Le stock n'est **jamais** décrémenté par le site : réservation = validation manuelle par l'admin après confirmation WhatsApp (page Stocks, motif « Vente confirmée »).
- **Rachat d'appareils** : `/api/purchase-requests/prepare` (URLs de téléversement signées vers le bucket **privé**) → envoi des photos → `/api/purchase-requests/submit` (le serveur relit chaque fichier, vérifie les octets de signature JPEG/PNG/WebP et la taille, puis enregistre demande + photos). Le message WhatsApp contient la **référence** de la demande (pas de lien public).
- **Administration** `/admin` (chargée à part) : connexion Supabase Auth, rôles `admin`/`manager` lus dans `profiles` (RLS), jamais dans `user_metadata`. Tableau de bord (chiffres réels), produits (CRUD, images, prix/stock en ligne, activer/désactiver, archivage), stocks + historique, catégories, demandes de rachat (photos en liens signés de 5 min), paramètres + journal d'audit.
- **Droits** : `manager` = produits, stocks, demandes. `admin` = en plus suppression de produits/demandes, catégories, paramètres, téléchargement des photos, lecture du journal. Les rôles ne se changent **que** côté serveur (SQL Editor).

## Fichiers principaux
| Zone | Fichiers |
|---|---|
| SQL (à exécuter dans l'ordre) | `supabase/migrations/…0001_schema.sql` (tables, contraintes, `adjust_stock`, `remove_product`, audit) · `…0002_rls.sql` · `…0003_storage.sql` (2 buckets) · `…0004_seed.sql` · `supabase/bootstrap-first-admin.sql` |
| Fonctions serveur | `api/cart/check.js` · `api/purchase-requests/prepare.js` · `…/submit.js` · logique pure testée : `api/_lib/core.js` |
| Partagé | `shared/product.js` (statuts de stock, normalisation) · `shared/constants.js` (buckets, limites 5 photos / 5 Mo) |
| Site | `src/pages/*`, `src/components/*` (dont `CatalogContext`, `CartContext`, `SiteContext`) · `src/lib/*` |
| Admin | `src/admin/*` |

## Installation et configuration (une seule fois)
> **Le site fonctionne déjà sans Supabase** (catalogue de démonstration, panier, commande WhatsApp, formulaire de rachat sans enregistrement). Supabase est **isolé** : il n'est ni chargé ni initialisé tant que `VITE_ENABLE_SUPABASE` ne vaut pas exactement `true` (et que l'URL et la clé publique sont renseignées). Faites d'abord tourner le site seul, puis suivez les étapes ci-dessous.

1. **Supabase** : créer un projet. *Authentication → Providers → Email* : désactiver « Allow new users to sign up ».
2. *SQL Editor* : exécuter dans l'ordre les 4 fichiers `supabase/migrations/*.sql` (ou `supabase db push`).
3. **Premier administrateur** : *Authentication → Users → Add user* (e-mail + mot de passe, « Auto confirm »), puis exécuter `supabase/bootstrap-first-admin.sql` en remplaçant l'e-mail. Ne communiquez jamais ce mot de passe à personne.
4. *Settings → API* : noter l'URL, la clé **anon** et la clé **service_role**.
5. **Local** : `cp .env.example .env`, renseigner les variables (dont `VITE_ENABLE_SUPABASE=true` pour **activer** Supabase), `npm install`, puis `npm run dev` (site) ; pour tester aussi `/api` : `npx vercel dev`.
6. **Vercel** : *Project → Settings → Environment Variables* :
   - `VITE_ENABLE_SUPABASE=true`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (publiques, intégrées au site) ;
   - `SUPABASE_SERVICE_ROLE_KEY` (**secrète, serveur uniquement, jamais préfixée `VITE_`**).
   Puis redéployer (Vite fige les variables `VITE_` à la compilation).
7. `npm test` (Node 18.18+) : 31 tests de la logique, sans réseau. Le site s'ouvre sur http://localhost:5173 après `npm run dev`.

## Si la page est blanche
1. Ouvrir la console du navigateur (F12 → Console) : le site affiche lui-même l'erreur à l'écran au lieu d'une page vide.
2. Le site doit être **servi** (`npm run dev`, ou `npm run build` puis `npm run preview`, ou Vercel) : l'ouvrir par double-clic (`file://`) ne fonctionne pas.
3. Relancer `npm install` après chaque mise à jour du ZIP (les dépendances changent).
4. Sans `.env` (ou avec `VITE_ENABLE_SUPABASE=false`), le site fonctionne en **mode sans Supabase** : aucune configuration requise.
5. **`destroy is not a function`** : ce n'est pas un problème de Supabase ni de configuration. Cause la plus fréquente : le serveur de développement tournait pendant le remplacement des fichiers (état de « Fast Refresh » corrompu). Remède : arrêter `npm run dev` (Ctrl+C), supprimer le dossier `node_modules/.vite`, relancer `npm run dev`, puis recharger la page avec Ctrl+Maj+R. Si cela persiste : `npm ls react react-dom` doit montrer **une seule version identique** pour les deux ; sinon supprimer `node_modules` et `package-lock.json`, puis `npm install`. Ouvrir aussi la page en fenêtre privée (une extension peut interférer). L'écran d'erreur affiche maintenant les « Détails techniques » à copier.

## Utilisation quotidienne
Connexion sur `/admin/login`. **Ajouter un produit** → il apparaît immédiatement sur le site (catégorie → page correspondante). **Prix** et **stock** modifiables directement dans la liste ; le stock change via une fonction SQL qui écrit l'historique (qui, quand, avant/après, motif). **Désactiver** un produit = « Temporairement indisponible » (prioritaire sur le stock). **Supprimer** : si le produit a déjà eu une sortie de stock, il est **archivé** (historique conservé) ; sinon supprimé avec ses images.

## Sécurité : ce qui est en place
RLS sur toutes les tables ; l'anonyme ne peut lire que catalogue, catégories et coordonnées publiques ; aucune écriture directe sur profils/historique/journal ; stock modifiable uniquement par `adjust_stock()` (déclencheur de garde) ; `service_role` uniquement dans `api/` ; bucket photos privé sans politique anonyme ; claims HMAC à durée limitée pour les envois ; contrôle des octets des fichiers ; champ anti-robot ; journal d'audit des modifications. Le masquage de boutons dans React n'est qu'un confort : l'autorisation réelle est en base.

## Limites connues (à traiter selon votre niveau de risque)
- **Pas de limitation de débit** sur les fonctions publiques (spam de demandes/téléversements possible) : activer le *Vercel Firewall / Rate Limiting* sur `/api/*` et envisager un captcha (Cloudflare Turnstile).
- Les fichiers envoyés mais jamais rattachés à une demande restent dans `pending/` du bucket privé : purge périodique conseillée (Dashboard Storage). Même chose pour les photos des demandes terminées : à intégrer à votre politique de confidentialité (durée de conservation).
- Pas de paiement ni de commandes en base : la commande se conclut sur WhatsApp ; le stock se met à jour manuellement. Pas d'e-mail d'alerte de stock faible (visible dans le tableau de bord et les listes).
- Mot de passe oublié / double authentification : à activer via Supabase Auth si besoin (non intégré à l'interface).
- Une catégorie de base ne se supprime pas depuis l'interface ; les droits de catégorie sont en revanche réservés à l'admin.

## Plan de test manuel obligatoire avant ouverture au public
**Public** : 1) catalogue = produits créés dans l'admin ; 2) ajouter jeu + console au panier, quantité > stock refusée ; 3) actualiser : panier conservé ; 4) dans l'admin, changer un prix/mettre en rupture, revenir sur `/panier` : alerte et bouton WhatsApp bloqué ; 5) message WhatsApp : produits, quantités, totaux exacts ; 6) panier non vidé après clic WhatsApp.
**Rachat (PC + smartphone)** : 7) 3 photos, aperçu, suppression d'une ; GIF/fichier > 5 Mo refusés ; 8) envoi : progression, puis « Demande enregistrée » + référence ; 9) coupure réseau pendant l'envoi : message précis, « Réessayer » sans ressaisie, WhatsApp non proposé ; 10) dans l'admin : demande visible, photos en grand, statut, note, bouton WhatsApp vendeur ; liens expirés → « Régénérer ».
**Sécurité** : 11) `/admin` sans connexion → redirigé vers `/admin/login` ; 12) compte sans ligne `profiles` → « Accès non autorisé » ; 13) connecté en `manager` : pas de Paramètres/suppression ; 14) avec la console du navigateur, tenter `supabase.from('products').update(...)` **sans être connecté** et `rpc('adjust_stock')` : doit échouer ; 15) lire `device_purchase_requests` en anonyme : 0 ligne/erreur ; 16) ouvrir une URL d'objet du bucket privé sans lien signé : refusée.
#   P i x e l P l a y W a r z o n e  
 