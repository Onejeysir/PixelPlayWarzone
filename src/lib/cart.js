// Logique du panier : fonctions pures (aucune dépendance à React). Montants en FCFA entiers.
import { CONFIG } from './config.js';
import { formatPrice } from './whatsapp.js';

export const CART_KEY = 'pixelplay-cart-v1';
export const CART_TYPES = ['console', 'jeu-physique', 'jeu-numerique'];
const CAT = { console: 'Console', 'jeu-physique': 'Jeu physique', 'jeu-numerique': 'Jeu numérique' };
const int = (n) => Math.max(0, Math.trunc(Number(n)) || 0);

export const isCartable = (p) => !!p && CART_TYPES.includes(p.type);
export const categoryLabel = (p) => CAT[p.type] || 'Produit';
// Quantité maximale commandable : nombre en stock, ou plafond de config si le stock est seulement « disponible ».
export const maxQty = (p) => (!p ? 0 : typeof p.stock === 'number' ? int(p.stock) : p.stock ? CONFIG.maxPerItem : 0);

export function addItem(items, p, qty = 1) {
  const cur = items.find((i) => i.id === p.id), have = cur ? cur.qty : 0;
  const n = Math.min(int(qty), maxQty(p) - have);
  if (!isCartable(p) || n <= 0) return { items, added: 0 };
  const next = cur ? items.map((i) => (i.id === p.id ? { ...i, qty: have + n } : i)) : [...items, { id: p.id, qty: n, price: int(p.price), name: p.name }];
  return { items: next, added: n };
}
export const removeItem = (items, id) => items.filter((i) => i.id !== id);
export function setQty(items, id, qty, catalog) {
  const cur = items.find((i) => i.id === id); if (!cur) return items;
  const q = int(qty); if (q < 1) return removeItem(items, id);
  const max = maxQty(catalog.find((x) => x.id === id));
  const allowed = q <= cur.qty ? q : Math.min(q, Math.max(cur.qty, max)); // on peut toujours diminuer
  return items.map((i) => (i.id === id ? { ...i, qty: allowed } : i));
}
export const ackPrices = (items, catalog) => items.map((i) => { const p = catalog.find((x) => x.id === i.id); return p ? { ...i, price: int(p.price) } : i; });

// Calcule lignes, anomalies et totaux à partir du panier et du catalogue COURANT.
export function resolve(items, catalog) {
  const lines = items.map((i) => {
    const p = catalog.find((x) => x.id === i.id), max = maxQty(p), unit = p ? int(p.price) : i.price, issues = [];
    if (!p) issues.push('missing'); else if (!max) issues.push('unavailable'); else if (i.qty > max) issues.push('qty');
    if (p && unit !== i.price) issues.push('price');
    return { id: i.id, product: p, name: p ? p.name : i.name, qty: i.qty, unit, oldPrice: i.price, max, subtotal: unit * i.qty, issues };
  });
  const count = lines.reduce((n, l) => n + l.qty, 0), subtotal = lines.reduce((n, l) => n + l.subtotal, 0);
  const delivery = CONFIG.deliveryFee == null ? null : int(CONFIG.deliveryFee);
  const blocked = lines.some((l) => l.issues.some((x) => x !== 'price')), priceChanged = lines.some((l) => l.issues.includes('price'));
  return { lines, count, subtotal, delivery, total: subtotal + (delivery ?? 0), blocked, priceChanged, canOrder: lines.length > 0 && !blocked && !priceChanged };
}

export function orderMessage(s) {
  const out = ['Bonjour PIXEL PLAY,', '', 'Je souhaite passer une commande.', '', 'RÉCAPITULATIF DE MA COMMANDE', ''];
  s.lines.forEach((l, i) => {
    const p = l.product;
    out.push(`${i + 1}. Produit : ${l.name}`, `   Catégorie : ${categoryLabel(p)}`);
    if (p.type !== 'console') out.push(`   Plateforme : ${p.platform}`); else if (p.variant) out.push(`   Variante : ${p.variant}`);
    out.push(`   Quantité : ${l.qty}`, `   Prix unitaire : ${formatPrice(l.unit)}`, `   Sous-total : ${formatPrice(l.subtotal)}`, `   Référence : ${p.reference || p.id}`, '');
  });
  out.push('RÉCAPITULATIF FINANCIER', '', `Nombre total d'articles : ${s.count}`, `Sous-total : ${formatPrice(s.subtotal)}`,
    `Livraison : ${s.delivery == null ? 'À confirmer' : formatPrice(s.delivery)}`, `TOTAL : ${formatPrice(s.total)}`, '',
    'Merci de confirmer :', '', '- La disponibilité des produits.', '- Le montant définitif.', '- Les modalités de livraison ou de retrait.', '- Les moyens de paiement disponibles.');
  return out.join('\n');
}

export function loadCart() {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY));
    if (!Array.isArray(raw)) return [];
    return raw.filter((i) => i && typeof i.id === 'string' && Number.isInteger(i.qty) && i.qty > 0 && Number.isInteger(i.price) && i.price >= 0)
      .map((i) => ({ id: i.id, qty: i.qty, price: i.price, name: typeof i.name === 'string' ? i.name : i.id }));
  } catch { return []; }
}
export function saveCart(items) { try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch { /* stockage indisponible : le panier reste en mémoire */ } }
