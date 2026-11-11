import test from 'node:test';
import assert from 'node:assert/strict';
import { stockStatus, normalizeProduct, categoryType, buildCatalog, applySettings, TYPE_BY_SLUG } from '../shared/product.js';
import { sniffMime, signClaim, verifyClaim, validatePrepare, validateRequest, prepare, submit, cartCheck } from '../api/_lib/core.js';
import { validateProduct, slugify, toWaNumber, checkImages, friendly } from '../src/lib/admin.js';
import { loadCatalog } from '../src/lib/catalog.js';
import { checkCart, prepareUploads, submitRequest, uploadErrorMessage } from '../src/lib/api.js';

const KEY = 'service-key-test';
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const WEBP = Uint8Array.from([...'RIFF'].map((c) => c.charCodeAt(0)).concat([0, 0, 0, 0], [...'WEBP'].map((c) => c.charCodeAt(0)), [0]));
const form = { customer_name: 'Paul Ngono', phone: '+237 697 692 598', location: 'Douala', device_type: 'telephone', brand: 'Samsung', model: 'S21', condition: 'Bon état', specifications: { Stockage: '128 Go' }, expected_price: 150000, description: 'RAS' };

// ─── Règles de stock (identiques au SQL public.stock_status) ───
test('statuts de stock : seuil, rupture, désactivation prioritaire', () => {
  assert.equal(stockStatus(10, 3, true), 'available'); assert.equal(stockStatus(4, 3), 'available');
  assert.equal(stockStatus(3, 3), 'low'); assert.equal(stockStatus(1, 3), 'low');
  assert.equal(stockStatus(0, 3), 'out'); assert.equal(stockStatus(0, 0), 'out');
  assert.equal(stockStatus(50, 3, false), 'disabled'); assert.equal(stockStatus(0, 3, false), 'disabled');
});
test('produit normalisé : prix promo, stock nul si indisponible, états, plateforme/variante', () => {
  const row = { id: 'u1', reference: 'PS5-01', slug: 's', name: 'PS5 Slim', description: 'd', price: 450000, promotional_price: 420000, stock_quantity: 5, stock_alert_threshold: 3, condition: 'new', availability_enabled: true, specifications: { generation: 'PS5', model: 'Slim', version: 'Digital' }, featured: true };
  const p = normalizeProduct(row, 'console', ['https://x/a.webp']);
  assert.equal(p.price, 420000); assert.equal(p.oldPrice, 450000); assert.equal(p.stock, 5); assert.equal(p.platform, 'PS5'); assert.equal(p.variant, 'Slim Digital'); assert.equal(p.condition, 'Neuf'); assert.equal(p.image, 'https://x/a.webp'); assert.equal(p.demo, false);
  assert.equal(normalizeProduct({ ...row, availability_enabled: false }, 'console').stock, 0);
  assert.equal(normalizeProduct({ ...row, stock_quantity: 0 }, 'console').status, 'out');
  assert.equal(normalizeProduct({ ...row, promotional_price: null }, 'console').oldPrice, null);
  assert.equal(normalizeProduct(row, 'jeu-numerique').condition, null);
  assert.equal(normalizeProduct({ ...row, condition: 'used' }, 'jeu-physique').condition, 'Occasion');
});
test('type de catégorie hérité du parent ; catalogue : image principale en premier', () => {
  const cats = [{ id: 'c1', slug: 'consoles', parent_id: null }, { id: 'c2', slug: 'ps5', parent_id: 'c1' }, { id: 'c3', slug: 'divers', parent_id: null }];
  const by = new Map(cats.map((c) => [c.id, c]));
  assert.equal(categoryType(by.get('c2'), by), 'console'); assert.equal(categoryType(by.get('c3'), by), 'appareil'); assert.equal(TYPE_BY_SLUG.consoles, 'console');
  const rows = [{ id: 'p', category_id: 'c2', reference: 'r', slug: 's', name: 'n', price: 1, stock_quantity: 1, stock_alert_threshold: 0, condition: 'new', availability_enabled: true, specifications: {}, product_images: [{ storage_path: 'b', is_primary: false, display_order: 0 }, { storage_path: 'a', is_primary: true, display_order: 5 }] }];
  const [p] = buildCatalog(rows, cats, (x) => `u/${x}`);
  assert.equal(p.type, 'console'); assert.deepEqual(p.images, ['u/a', 'u/b']);
});
test('paramètres du site : appliqués seulement si valides', () => {
  const cfg = { whatsapp: '237697692598' };
  assert.ok(!applySettings(cfg, { whatsapp: 'abc' })); assert.equal(cfg.whatsapp, '237697692598'); assert.ok(!applySettings(cfg, null));
  assert.ok(applySettings(cfg, { business_name: 'PP', whatsapp: '237600000000', phone: '+237 600 00 00 00', address: 'A', city: 'C', map_query: 'M' }));
  assert.equal(cfg.whatsapp, '237600000000'); assert.equal(cfg.phoneTel, '+237600000000');
});

// ─── Fichiers et autorisations ───
test('contrôle du contenu réel des fichiers (pas l\'extension)', () => {
  assert.equal(sniffMime(JPEG), 'image/jpeg'); assert.equal(sniffMime(PNG), 'image/png'); assert.equal(sniffMime(WEBP), 'image/webp');
  assert.equal(sniffMime(Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])), null); // GIF
  assert.equal(sniffMime(new TextEncoder().encode('%PDF-1.4')), null); assert.equal(sniffMime(new Uint8Array()), null);
  assert.equal(sniffMime(new TextEncoder().encode('<?php echo 1; ?>')), null);
});
test('claim signé : valide, falsifié, expiré, mauvaise clé', () => {
  const c = signClaim({ rid: 'r1', paths: ['pending/r1/1.jpg'], exp: 2000 }, KEY);
  assert.equal(verifyClaim(c, KEY, 1000).rid, 'r1');
  assert.equal(verifyClaim(c, KEY, 3000), null); assert.equal(verifyClaim(c, 'autre-cle', 1000), null);
  const [b, s] = c.split('.'); const forged = Buffer.from(JSON.stringify({ rid: 'r1', paths: ['pending/r1/../../x.jpg'], exp: 2000 })).toString('base64url');
  assert.equal(verifyClaim(`${forged}.${s}`, KEY, 1000), null); assert.equal(verifyClaim(`${b}.AAAA`, KEY, 1000), null);
  assert.equal(verifyClaim('', KEY), null); assert.equal(verifyClaim('x', KEY), null); assert.equal(verifyClaim(undefined, KEY), null);
});
test('validation des photos annoncées et de la demande', () => {
  const ph = (o = {}) => ({ name: 'a.jpg', type: 'image/jpeg', size: 1000, ...o });
  assert.equal(validatePrepare({ photos: [ph(), ph({ type: 'image/webp' })] }), null);
  assert.ok(validatePrepare({ photos: [] })); assert.ok(validatePrepare({}));
  assert.ok(validatePrepare({ photos: Array(6).fill(ph()) })); assert.equal(validatePrepare({ photos: Array(5).fill(ph()) }), null);
  assert.match(validatePrepare({ photos: [ph({ type: 'image/gif' })] }), /Format/); assert.match(validatePrepare({ photos: [ph({ size: 6 * 1048576 })] }), /volumineuse/);
  assert.ok(validateRequest(form).ok); assert.equal(validateRequest(form).value.expected_price, 150000);
  for (const bad of [{ customer_name: 'a' }, { phone: '12' }, { device_type: 'tv' }, { expected_price: -5 }, { expected_price: 1.5 }, { specifications: [] }, { specifications: { a: 1 } }, { description: 'x'.repeat(2001) }]) assert.ok(!validateRequest({ ...form, ...bad }).ok, JSON.stringify(bad));
});

// ─── Faux Supabase (vérifie notre logique, pas le vrai service) ───
function fakeDb({ files = {}, failPhotos = false, failRequest = false } = {}) {
  const log = { removed: [], requests: [], photos: [], deleted: [] };
  return { log, storage: { from: () => ({
    createSignedUploadUrl: async (p) => ({ data: { token: `tok:${p}`, path: p }, error: null }),
    download: async (p) => (files[p] ? { data: new Blob([files[p]]), error: null } : { data: null, error: { message: 'not found' } }),
    remove: async (ps) => { log.removed.push(...ps); return { error: null }; },
    getPublicUrl: (p) => ({ data: { publicUrl: `https://x/${p}` } }) }) },
  from: (t) => ({
    insert: (row) => {
      if (t === 'device_purchase_requests') { if (failRequest) return { select: () => ({ single: async () => ({ data: null, error: { message: 'boom' } }) }) }; log.requests.push(row); return { select: () => ({ single: async () => ({ data: { id: 'req-1', reference: 'ABCDE12345' }, error: null }) }) }; }
      log.photos.push(...row); return Promise.resolve({ error: failPhotos ? { message: 'dup' } : null });
    },
    delete: () => ({ eq: async () => { log.deleted.push(t); return { error: null }; } }) }) };
}
const prepareFor = async (db, photos) => (await prepare({ body: { photos }, db, serviceKey: KEY, newId: () => 'rid-1' })).json;

test('prepare : URLs signées vers le bucket privé, chemins sous pending/<id>/', async () => {
  const r = await prepare({ body: { photos: [{ name: 'a', type: 'image/jpeg', size: 10 }, { name: 'b', type: 'image/png', size: 10 }] }, db: fakeDb(), serviceKey: KEY, newId: () => 'rid-1' });
  assert.equal(r.status, 200); assert.equal(r.json.bucket, 'pixelplay-device-photos'); assert.deepEqual(r.json.uploads.map((u) => u.path), ['pending/rid-1/1.jpg', 'pending/rid-1/2.png']);
  assert.ok(r.json.uploads.every((u) => u.token.startsWith('tok:'))); assert.equal(verifyClaim(r.json.claim, KEY).rid, 'rid-1');
  assert.equal((await prepare({ body: { photos: [{ name: 'x', type: 'application/pdf', size: 1 }] }, db: fakeDb(), serviceKey: KEY })).status, 400);
});
test('submit : succès — demande + photos enregistrées avec le vrai type détecté', async () => {
  const files = { 'pending/rid-1/1.jpg': JPEG, 'pending/rid-1/2.png': PNG }, db = fakeDb({ files });
  const p = await prepareFor(db, [{ name: 'a.jpg', type: 'image/jpeg', size: 7 }, { name: 'b.png', type: 'image/png', size: 9 }]);
  const r = await submit({ body: { ...form, requestId: p.requestId, claim: p.claim, photos: p.uploads.map((u, i) => ({ path: u.path, name: `f${i}` })) }, db, serviceKey: KEY });
  assert.equal(r.status, 201); assert.equal(r.json.reference, 'ABCDE12345'); assert.equal(r.json.photos, 2);
  assert.deepEqual(db.log.photos.map((x) => x.mime_type), ['image/jpeg', 'image/png']); assert.ok(db.log.photos.every((x) => x.request_id === 'req-1' && x.file_size > 0));
  assert.equal(db.log.requests[0].customer_name, 'Paul Ngono'); assert.equal('status' in db.log.requests[0], false); // statut = valeur par défaut serveur
});
test('submit : sans photo, enregistre la demande', async () => {
  const db = fakeDb(), r = await submit({ body: { ...form, photos: [] }, db, serviceKey: KEY });
  assert.equal(r.status, 201); assert.equal(db.log.photos.length, 0);
});
test('submit : refus — claim falsifié/expiré/autre demande, chemin hors claim, fichier non image, fichier absent, robot', async () => {
  const db = fakeDb({ files: { 'pending/rid-1/1.jpg': JPEG, 'pending/rid-1/2.jpg': new TextEncoder().encode('<script>alert(1)</script>') } });
  const p = await prepareFor(db, [{ name: 'a', type: 'image/jpeg', size: 7 }, { name: 'b', type: 'image/jpeg', size: 7 }]);
  const base = { ...form, requestId: p.requestId, claim: p.claim };
  const call = (o, now) => submit({ body: { ...base, ...o }, db, serviceKey: KEY, now });
  assert.equal((await call({ photos: [{ path: 'pending/rid-1/1.jpg' }], claim: 'x.y' })).status, 403);
  assert.equal((await call({ photos: [{ path: 'pending/rid-1/1.jpg' }], requestId: 'autre' })).status, 403);
  assert.equal((await call({ photos: [{ path: 'pending/rid-1/1.jpg' }] }, Date.now() + 3 * 3600 * 1000)).status, 403);
  assert.equal((await call({ photos: [{ path: 'pending/autre/1.jpg' }] })).status, 400);
  assert.equal((await call({ photos: [{ path: 'pending/rid-1/1.jpg' }, { path: 'pending/rid-1/1.jpg' }] })).status, 400);
  const bad = await call({ photos: [{ path: 'pending/rid-1/2.jpg' }] });
  assert.equal(bad.status, 422); assert.equal(bad.json.error.code, 'invalid_file'); assert.deepEqual(db.log.removed, ['pending/rid-1/2.jpg']); assert.equal(db.log.requests.length, 0);
  const miss = await submit({ body: { ...base, photos: [{ path: 'pending/rid-1/1.jpg' }] }, db: fakeDb(), serviceKey: KEY });
  assert.equal(miss.status, 422); assert.equal(miss.json.error.code, 'missing');
  assert.equal((await call({ website: 'http://spam', photos: [] })).status, 400); assert.equal((await call({ phone: 'abc', photos: [] })).status, 400);
});
test('submit : erreurs base de données — retour arrière, aucun message technique', async () => {
  const files = { 'pending/rid-1/1.jpg': JPEG }, p0 = await prepareFor(fakeDb(), [{ name: 'a', type: 'image/jpeg', size: 7 }]);
  const body = { ...form, requestId: p0.requestId, claim: p0.claim, photos: [{ path: 'pending/rid-1/1.jpg' }] };
  const db1 = fakeDb({ files, failPhotos: true }), r1 = await submit({ body, db: db1, serviceKey: KEY });
  assert.equal(r1.status, 409); assert.deepEqual(db1.log.deleted, ['device_purchase_requests']);
  const r2 = await submit({ body, db: fakeDb({ files, failRequest: true }), serviceKey: KEY });
  assert.equal(r2.status, 500); assert.ok(!/boom/.test(JSON.stringify(r2.json)));
});
test('cartCheck : prix et stocks serveur, archivés exclus, entrée validée', async () => {
  const rows = { products: [{ id: 'p1', category_id: 'c1', reference: 'R1', slug: 's', name: 'PS5', price: 500000, promotional_price: 450000, stock_quantity: 2, stock_alert_threshold: 3, condition: 'new', availability_enabled: true, specifications: { generation: 'PS5' }, product_images: [] }], categories: [{ id: 'c1', slug: 'consoles', parent_id: null }] };
  const chain = (res) => { const o = { select: () => o, in: () => o, is: () => o, then: (a, b) => Promise.resolve(res).then(a, b) }; return o; };
  const db = { from: (t) => chain({ data: rows[t], error: null }), storage: fakeDb().storage };
  const r = await cartCheck({ body: { ids: ['p1'] }, db });
  assert.equal(r.status, 200); assert.equal(r.json.products[0].price, 450000); assert.equal(r.json.products[0].stock, 2); assert.equal(r.json.products[0].status, 'low'); assert.equal(r.json.products[0].type, 'console');
  for (const ids of [undefined, [], 'x', [1], Array(51).fill('a'), ['a'.repeat(65)]]) assert.equal((await cartCheck({ body: { ids }, db })).status, 400);
  assert.equal((await cartCheck({ body: { ids: ['p1'] }, db: { from: () => chain({ data: null, error: { message: 'x' } }), storage: db.storage } })).status, 500);
});

// ─── Administration (fonctions pures) et client ───
test('validation produit, slug, WhatsApp, images, erreurs lisibles', () => {
  const ok = { name: 'PS5', reference: 'PS5-01', category_id: 'c', price: '450000', promotional_price: '', stock_quantity: '3', stock_alert_threshold: '2', condition: 'new' };
  assert.deepEqual(validateProduct(ok), {});
  assert.ok(validateProduct({ ...ok, promotional_price: '450000' }).promotional_price); assert.ok(validateProduct({ ...ok, promotional_price: '100' }).promotional_price === undefined);
  for (const [k, v] of [['name', ' '], ['reference', 'a b'], ['category_id', ''], ['price', '-5'], ['price', '12.5'], ['stock_quantity', '-1'], ['stock_alert_threshold', 'x'], ['condition', 'cassé']]) assert.ok(validateProduct({ ...ok, [k]: v })[k], k);
  assert.equal(slugify('Spider-Man 2 : édition Ça va !'), 'spider-man-2-edition-ca-va');
  assert.equal(toWaNumber('697 69 25 98'), '237697692598'); assert.equal(toWaNumber('+237 697 692 598'), '237697692598'); assert.equal(toWaNumber('00237697692598'), '237697692598'); assert.equal(toWaNumber('12'), null);
  assert.equal(checkImages([{ name: 'a', type: 'image/gif', size: 1 }]).ok, false); assert.equal(checkImages([{ name: 'a', type: 'image/png', size: 9e6 }]).ok, false); assert.ok(checkImages([{ name: 'a', type: 'image/webp', size: 1e5 }]).ok);
  assert.match(friendly(new Error('new row violates row-level security policy')), /non autorisée/); assert.match(friendly(new Error('duplicate key products_reference_key')), /référence/i);
});
test('catalogue public chargé depuis le client Supabase (faux client)', async () => {
  const chain = (res) => { const o = { select: () => o, is: () => o, order: () => o, then: (a, b) => Promise.resolve(res).then(a, b) }; return o; };
  const data = { categories: [{ id: 'c1', slug: 'jeux-physiques', parent_id: null }], products: [{ id: 'p', category_id: 'c1', reference: 'R', slug: 's', name: 'GoW', price: 25000, stock_quantity: 0, stock_alert_threshold: 1, condition: 'used', availability_enabled: true, specifications: { platform: 'PS5' }, product_images: [{ storage_path: 'p/1.webp', is_primary: true, display_order: 0 }] }] };
  const client = { from: (t) => chain({ data: data[t], error: null }), storage: { from: (b) => ({ getPublicUrl: (p) => ({ data: { publicUrl: `https://s/${b}/${p}` } }) }) } };
  const [p] = await loadCatalog(client);
  assert.equal(p.type, 'jeu-physique'); assert.equal(p.status, 'out'); assert.equal(p.stock, 0); assert.equal(p.image, 'https://s/pixelplay-product-images/p/1.webp');
  await assert.rejects(loadCatalog({ from: () => chain({ data: null, error: { message: 'x' } }), storage: client.storage }), /catalogue/);
});
test('client API : succès et erreurs normalisées (réseau, serveur, JSON invalide)', async () => {
  const ok = async () => ({ ok: true, json: async () => ({ products: [{ id: 'p' }] }) });
  assert.deepEqual(await checkCart(['p'], ok), [{ id: 'p' }]);
  await assert.rejects(checkCart(['p'], async () => { throw new TypeError('Failed to fetch'); }), { code: 'network' });
  await assert.rejects(prepareUploads([], async () => ({ ok: false, json: async () => ({ error: { code: 'invalid', message: 'Photo trop volumineuse' } }) })), { code: 'invalid', message: 'Photo trop volumineuse' });
  await assert.rejects(submitRequest({}, async () => ({ ok: false, json: async () => { throw new Error('html'); } })), { code: 'server', message: 'Impossible de préparer la demande.' });
  assert.match(uploadErrorMessage({ message: 'Failed to fetch' }), /Connexion interrompue/); assert.match(uploadErrorMessage({ message: 'The object exceeded the maximum allowed size' }), /Taille maximale/);
  assert.match(uploadErrorMessage({ message: 'mime type not supported' }), /Format/);
});
