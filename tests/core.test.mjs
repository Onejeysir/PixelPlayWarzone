import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTS } from '../src/lib/data.js';
import { waUrl, sellMessage, formatPrice } from '../src/lib/whatsapp.js';
import { validatePhone, validatePhotos, validateSell } from '../src/lib/validation.js';
import { filterProducts } from '../src/lib/filters.js';

const msgOf = (u) => decodeURIComponent(new URL(u).searchParams.get('text'));

test('URL WhatsApp : bon numéro et encodage', () => {
  const u = waUrl('a&b é\nc');
  assert.ok(u.startsWith('https://wa.me/237697692598?text='));
  assert.equal(msgOf(u), 'a&b é\nc');
});
test('message de vente : référence de la demande, nombre de photos, pas de lien public', () => {
  const base = { name: 'Paul', phone: '697692598', location: 'Douala', category: 'telephone', categoryLabel: 'Téléphone', brand: 'X', model: 'Y', condition: 'Bon état', price: '', serial: '', description: '', specsList: [['Capacité de stockage', '128 Go']], reference: 'ABCDE12345' };
  const m = sellMessage({ ...base, photoCount: 3 });
  for (const x of ['Référence de ma demande : ABCDE12345', 'INFORMATIONS DU VENDEUR', 'Nom : Paul', "PHOTOS DE L'APPAREIL", 'Nombre de photos : 3', 'Type : Téléphone', '128 Go', 'IMEI : à communiquer', 'Prix souhaité : non renseigné', 'consulter les photos']) assert.ok(m.includes(x), x);
  assert.ok(!/https?:\/\//.test(m));
  assert.ok(sellMessage({ ...base, photoCount: 0 }).includes('Aucune photo jointe.'));
  const man = sellMessage({ ...base, reference: null, manualPhotos: true, photoCount: 2 });
  assert.ok(man.includes('Photos : 2 photo(s) à joindre dans cette conversation WhatsApp.') && !man.includes('Référence de ma demande'));
});
test('téléphone', () => {
  for (const ok of ['697692598', '+237 697 69 25 98', '237697692598']) assert.ok(validatePhone(ok), ok);
  for (const ko of ['', '12', 'abc', '5976925']) assert.ok(!validatePhone(ko), ko);
});
test('formulaire vide refusé, formulaire valide accepté', () => {
  const e = validateSell({});
  for (const k of ['name', 'phone', 'location', 'category', 'brand', 'model', 'condition']) assert.ok(e[k], k);
  assert.deepEqual(validateSell({ name: 'Paul', phone: '697692598', location: 'Douala', category: 'console', brand: 'Sony', model: 'PS5', condition: 'Bon état', specs: {} }), {});
  assert.ok(validateSell({ name: 'Paul', phone: '697692598', location: 'D', category: 'ordinateur', brand: 'a', model: 'b', condition: 'c', specs: {} }).s_type);
});
test('photos : format, taille, nombre', () => {
  const f = (type, size = 1000) => ({ name: 'x', type, size });
  assert.equal(validatePhotos([f('image/gif')]).errors.length, 1);
  assert.equal(validatePhotos([f('image/png', 6 * 1048576)]).errors.length, 1);
  assert.equal(validatePhotos([f('image/webp')], 6).ok.length, 0);
  assert.equal(validatePhotos([f('image/jpeg'), f('image/png')]).ok.length, 2);
});
test('filtres et tri', () => {
  const cs = PRODUCTS.filter((p) => p.type === 'console');
  assert.ok(filterProducts(cs, { platform: 'PS4' }).every((p) => p.platform === 'PS4'));
  assert.ok(filterProducts(cs, { condition: 'Neuf' }).every((p) => p.condition === 'Neuf'));
  assert.ok(filterProducts(cs, { inStock: true }).every((p) => p.stock));
  assert.ok(filterProducts(cs, { maxPrice: '130000' }).every((p) => p.price <= 130000));
  const a = filterProducts(cs, { sort: 'asc' }).map((p) => p.price); assert.deepEqual(a, [...a].sort((x, y) => x - y));
  assert.equal(filterProducts(cs, { q: 'slimm' }).length, 0);
  assert.ok(filterProducts(cs, { q: 'playstation 5' }).length >= 2);
});
