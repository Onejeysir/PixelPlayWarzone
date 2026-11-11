import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTS } from '../src/lib/data.js';
import { CONFIG } from '../src/lib/config.js';
import { addItem, setQty, removeItem, resolve, orderMessage, ackPrices, loadCart, saveCart, maxQty, isCartable } from '../src/lib/cart.js';

const P = (id) => PRODUCTS.find((p) => p.id === id);
const decode = (m) => m;
let store = {};
globalThis.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
const fill = () => { // 1 jeu (2 ex.) + 1 console
  let c = addItem([], P('g-gow'), 2).items; c = addItem(c, P('c-ps5-std'), 1).items; return c;
};

test('1-2 ajout d\'un jeu et d\'une console ; un appareil n\'est pas ajoutable', () => {
  assert.equal(addItem([], P('g-gow')).items.length, 1);
  assert.equal(addItem(addItem([], P('g-gow')).items, P('c-ps5-std')).items.length, 2);
  assert.ok(!isCartable(P('a-lap'))); assert.equal(addItem([], P('a-lap')).added, 0);
});
test('3 plusieurs exemplaires, plafonnés au stock', () => {
  assert.equal(maxQty(P('g-gow')), 2);
  const r = addItem([], P('g-gow'), 5); assert.equal(r.items[0].qty, 2); assert.equal(r.added, 2);
  assert.equal(addItem(r.items, P('g-gow')).added, 0);
  assert.equal(addItem([], P('g-gt7'), 99).items[0].qty, CONFIG.maxPerItem);
  assert.equal(addItem([], P('g-sm2')).added, 0); // indisponible
});
test('4-5 modifier une quantité, supprimer', () => {
  let c = fill();
  c = setQty(c, 'g-gow', 1, PRODUCTS); assert.equal(c.find((i) => i.id === 'g-gow').qty, 1);
  c = setQty(c, 'g-gow', 9, PRODUCTS); assert.equal(c.find((i) => i.id === 'g-gow').qty, 2); // plafonné
  assert.equal(setQty(c, 'g-gow', 0, PRODUCTS).some((i) => i.id === 'g-gow'), false);
  assert.equal(removeItem(c, 'c-ps5-std').length, 1);
});
test('6 persistance : sauvegarde, rechargement, données corrompues', () => {
  const c = fill(); saveCart(c); assert.deepEqual(loadCart(), c);
  store['pixelplay-cart-v1'] = '{pas du json'; assert.deepEqual(loadCart(), []);
  store['pixelplay-cart-v1'] = JSON.stringify([{ id: 'x', qty: -1, price: 5 }, { id: 'g-gow', qty: 1, price: 25000 }]);
  assert.equal(loadCart().length, 1);
});
test('8-9 sous-totaux et total en FCFA entiers', () => {
  const s = resolve(fill(), PRODUCTS);
  assert.deepEqual(s.lines.map((l) => l.subtotal), [50000, 450000]);
  assert.equal(s.count, 3); assert.equal(s.subtotal, 500000); assert.equal(s.total, 500000);
  assert.ok(Number.isInteger(s.total)); assert.ok(s.canOrder);
});
test('10-11 message de commande multi-catégories, exact et encodable', () => {
  const s = resolve(fill(), PRODUCTS), m = orderMessage(s);
  for (const x of ['1. Produit : God of War Ragnarök', 'Catégorie : Jeu physique', 'Plateforme : PS5', 'Quantité : 2', 'Prix unitaire : 25 000 FCFA', 'Sous-total : 50 000 FCFA',
    '2. Produit : PlayStation 5 Standard', 'Catégorie : Console', 'Quantité : 1', 'Prix unitaire : 450 000 FCFA',
    "Nombre total d'articles : 3", 'Sous-total : 500 000 FCFA', 'Livraison : À confirmer', 'TOTAL : 500 000 FCFA', 'Les moyens de paiement disponibles.']) assert.ok(m.includes(x), x);
  assert.equal(decodeURIComponent(encodeURIComponent(m)), m);
});
test('livraison définie : ajoutée au total', () => {
  CONFIG.deliveryFee = 2000; const s = resolve(fill(), PRODUCTS); CONFIG.deliveryFee = null;
  assert.equal(s.total, 502000); assert.match(orderMessage({ ...s }), /Livraison : 2 000 FCFA/);
});
test('prix modifié ou produit indisponible : commande bloquée et client prévenu', () => {
  const c = fill(); const cat = PRODUCTS.map((p) => (p.id === 'c-ps5-std' ? { ...p, price: 480000 } : p));
  let s = resolve(c, cat); assert.ok(s.priceChanged && !s.canOrder && !s.blocked);
  assert.ok(s.lines[1].issues.includes('price')); assert.equal(s.lines[1].oldPrice, 450000); assert.equal(s.total, 50000 + 480000);
  assert.ok(resolve(ackPrices(c, cat), cat).canOrder);
  s = resolve(c, PRODUCTS.map((p) => (p.id === 'g-gow' ? { ...p, stock: false } : p))); assert.ok(s.blocked && s.lines[0].issues.includes('unavailable'));
  s = resolve(c, PRODUCTS.map((p) => (p.id === 'g-gow' ? { ...p, stock: 1 } : p))); assert.ok(s.lines[0].issues.includes('qty'));
  s = resolve(c, PRODUCTS.filter((p) => p.id !== 'g-gow')); assert.ok(s.lines[0].issues.includes('missing') && s.lines[0].name === 'God of War Ragnarök');
});
test('12 générer le message ne modifie ni ne vide le panier', () => {
  const c = fill(), before = JSON.stringify(c); orderMessage(resolve(c, PRODUCTS)); assert.equal(JSON.stringify(c), before);
});
