// Fonctions pures de l'administration (testables sans navigateur).
import { ALLOWED_MIME, LIMITS } from '../../shared/constants.js';

export const REQUEST_STATUS = { new: 'Nouvelle demande', reviewing: "En cours d'examen", awaiting_info: "En attente d'informations", offer_made: 'Offre proposée', accepted: 'Acceptée', rejected: 'Refusée', done: 'Terminée' };
export const MOVEMENT_REASONS = ['Réception de stock', 'Vente confirmée (WhatsApp)', "Correction d'inventaire", 'Retour client', 'Casse / perte', 'Autre'];
// Champs conditionnels selon le type de catégorie : [clé, libellé, options | 'textarea'].
export const SPEC_FIELDS = {
  console: [['generation', 'Génération', ['PS4', 'PS5']], ['model', 'Modèle (ex. Slim, Pro)'], ['version', 'Version'], ['capacity', 'Capacité'], ['drive', 'Type de lecteur', ['Avec lecteur', 'Digital (sans lecteur)']], ['accessories', 'Accessoires inclus']],
  'jeu-physique': [['platform', 'Plateforme', ['PS4', 'PS5']], ['disc_type', 'Type de disque', ['Blu-ray', 'CD']], ['edition', 'Édition']],
  'jeu-numerique': [['platform', 'Plateforme', ['PS4', 'PS5', 'Autre']], ['offer_type', "Type d'offre", ['Jeu numérique', 'Compte de jeu', 'Autre']], ['access_conditions', "Conditions d'accès", 'textarea']],
  appareil: [['platform', "Type d'appareil", ['Ordinateur', 'Téléphone', 'Console']], ['model', 'Modèle']],
};

export const slugify = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export const newSlug = (name) => `${slugify(name) || 'produit'}-${Math.random().toString(36).slice(2, 6)}`;

export function toWaNumber(phone) {
  const d = String(phone || '').replace(/\D/g, '').replace(/^00/, '');
  if (/^6\d{8}$/.test(d)) return `237${d}`;
  return d.length >= 8 && d.length <= 15 ? d : null;
}

const int = (v) => /^\d+$/.test(String(v ?? '').trim());
export function validateProduct(f) {
  const e = {};
  if (!f.name?.trim()) e.name = 'Nom obligatoire.';
  if (!/^[A-Za-z0-9._-]{2,40}$/.test(f.reference || '')) e.reference = 'Référence : 2 à 40 caractères (lettres, chiffres, . _ -).';
  if (!f.category_id) e.category_id = 'Choisissez une catégorie.';
  if (!int(f.price)) e.price = 'Prix en FCFA (nombre entier).';
  if (f.promotional_price !== '' && f.promotional_price != null) {
    if (!int(f.promotional_price)) e.promotional_price = 'Prix promotionnel invalide.';
    else if (int(f.price) && +f.promotional_price >= +f.price) e.promotional_price = 'Le prix promotionnel doit être inférieur au prix.';
  }
  if (!int(f.stock_quantity)) e.stock_quantity = 'Quantité entière (0 ou plus).';
  if (!int(f.stock_alert_threshold)) e.stock_alert_threshold = "Seuil d'alerte entier (0 ou plus).";
  if (!['new', 'used'].includes(f.condition)) e.condition = 'État invalide.';
  return e;
}

export function checkImages(files) {
  const errors = [];
  for (const f of files) {
    if (!ALLOWED_MIME.includes(f.type)) errors.push(`« ${f.name} » : format non autorisé (JPEG, PNG ou WebP).`);
    else if (f.size > LIMITS.maxMB * 1048576) errors.push(`« ${f.name} » dépasse ${LIMITS.maxMB} Mo.`);
  }
  return { ok: errors.length === 0, errors };
}

export function friendly(e) {
  const m = String(e?.message || e || '');
  if (/promotional_price/.test(m)) return 'Le prix promotionnel doit être inférieur au prix.';
  if (/reference.*(key|unique)|products_reference/i.test(m)) return 'Cette référence existe déjà.';
  if (/row-level security|permission denied|42501|Accès refusé|PGRST116/i.test(m)) return 'Action non autorisée pour votre rôle (ou élément introuvable).';
  if (/violates foreign key/i.test(m)) return "Suppression impossible : cet élément est encore utilisé.";
  if (/Failed to fetch|network/i.test(m)) return 'Connexion interrompue : réessayez.';
  return m || 'Une erreur est survenue.';
}
export const fmtDate = (d) => (d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
