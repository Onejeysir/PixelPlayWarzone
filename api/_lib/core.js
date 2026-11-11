// Logique serveur pure (testable sans réseau). Les fonctions `prepare`, `submit`, `cartCheck` reçoivent leurs dépendances.
import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { LIMITS, ALLOWED_MIME, EXT } from '../../shared/constants.js';
import { buildCatalog } from '../../shared/product.js';
import { PHOTO_BUCKET, IMG_BUCKET } from '../../shared/constants.js';

const err = (status, code, message) => ({ status, json: { error: { code, message } } });
const MAX_BYTES = LIMITS.maxMB * 1024 * 1024;

// Vérifie le contenu réel (octets de signature), pas l'extension ni le type déclaré.
export function sniffMime(b) {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)) return 'image/png';
  const a = (s, e) => String.fromCharCode(...b.slice(s, e));
  if (b.length >= 12 && a(0, 4) === 'RIFF' && a(8, 12) === 'WEBP') return 'image/webp';
  return null;
}

const hmac = (secret, data) => createHmac('sha256', createHmac('sha256', 'pixelplay-claim').update(secret).digest()).update(data).digest();
export function signClaim(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${hmac(secret, body).toString('base64url')}`;
}
export function verifyClaim(token, secret, now = Date.now()) {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig) return null;
  const want = hmac(secret, body), got = Buffer.from(sig, 'base64url');
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  try { const p = JSON.parse(Buffer.from(body, 'base64url').toString()); return p && p.exp > now ? p : null; } catch { return null; }
}

export function validatePrepare(b) {
  const ph = b?.photos;
  if (!Array.isArray(ph) || ph.length < 1) return 'Aucune photo à téléverser.';
  if (ph.length > LIMITS.maxPhotos) return `Maximum ${LIMITS.maxPhotos} photos par demande.`;
  for (const p of ph) {
    if (!p || !ALLOWED_MIME.includes(p.type)) return "Format d'image non accepté (JPEG, PNG ou WebP).";
    if (!Number.isInteger(p.size) || p.size < 1 || p.size > MAX_BYTES) return `Photo trop volumineuse (maximum ${LIMITS.maxMB} Mo).`;
  }
  return null;
}

const str = (v, min, max) => (typeof v === 'string' && v.trim().length >= min && v.trim().length <= max ? v.trim() : null);
export function validateRequest(b) {
  const e = [], v = {};
  const need = (k, val, msg) => { if (val == null) e.push(msg); else v[k] = val; };
  need('customer_name', str(b.customer_name, 2, 100), 'Nom invalide.');
  need('phone', typeof b.phone === 'string' && /^[+0-9 ().-]{8,20}$/.test(b.phone.trim()) ? b.phone.trim() : null, 'Téléphone invalide.');
  need('location', str(b.location, 2, 120), 'Localisation invalide.');
  need('device_type', ['ordinateur', 'telephone', 'console'].includes(b.device_type) ? b.device_type : null, "Type d'appareil invalide.");
  need('brand', str(b.brand, 1, 80), 'Marque invalide.');
  need('model', str(b.model, 1, 80), 'Modèle invalide.');
  need('condition', str(b.condition, 1, 40), 'État invalide.');
  const sp = b.specifications ?? {};
  if (typeof sp !== 'object' || Array.isArray(sp) || Object.keys(sp).length > 20 || Object.values(sp).some((x) => typeof x !== 'string' || x.length > 200)) e.push('Caractéristiques invalides.');
  else v.specifications = sp;
  if (b.expected_price == null || b.expected_price === '') v.expected_price = null;
  else if (Number.isInteger(b.expected_price) && b.expected_price >= 0 && b.expected_price <= 1e9) v.expected_price = b.expected_price;
  else e.push('Prix souhaité invalide.');
  if (b.description != null && (typeof b.description !== 'string' || b.description.length > 2000)) e.push('Description trop longue.');
  else v.description = (b.description || '').trim() || null;
  return e.length ? { ok: false, errors: e } : { ok: true, value: v };
}

// 1) Autorise les envois : URLs signées vers le bucket PRIVÉ + « claim » signé (HMAC) lié à la demande.
export async function prepare({ body, db, serviceKey, now = Date.now(), newId = randomUUID }) {
  const bad = validatePrepare(body);
  if (bad) return err(400, 'invalid', bad);
  const requestId = newId(), uploads = [];
  for (const [i, p] of body.photos.entries()) {
    const path = `pending/${requestId}/${i + 1}.${EXT[p.type]}`;
    const { data, error } = await db.storage.from(PHOTO_BUCKET).createSignedUploadUrl(path);
    if (error || !data?.token) return err(502, 'storage', 'Impossible de préparer le téléversement.');
    uploads.push({ path, token: data.token });
  }
  const claim = signClaim({ rid: requestId, paths: uploads.map((u) => u.path), exp: now + 2 * 3600 * 1000 }, serviceKey);
  return { status: 200, json: { requestId, claim, bucket: PHOTO_BUCKET, uploads } };
}

// 2) Finalise : contrôle les fichiers réellement reçus, puis enregistre la demande et les métadonnées.
export async function submit({ body, db, serviceKey, now = Date.now() }) {
  if (body.website) return err(400, 'invalid', 'Requête refusée.'); // champ piège anti-robot
  const v = validateRequest(body);
  if (!v.ok) return err(400, 'invalid', v.errors[0]);
  const photos = Array.isArray(body.photos) ? body.photos : [];
  if (photos.length > LIMITS.maxPhotos) return err(400, 'invalid', `Maximum ${LIMITS.maxPhotos} photos par demande.`);
  let checked = [];
  if (photos.length) {
    const claim = verifyClaim(body.claim, serviceKey, now);
    if (!claim || claim.rid !== body.requestId) return err(403, 'claim', 'Autorisation de téléversement invalide ou expirée : réessayez.');
    const seen = new Set(), bad = [];
    for (const [i, p] of photos.entries()) {
      if (!p || !claim.paths.includes(p.path) || seen.has(p.path)) return err(400, 'invalid', 'Liste de photos invalide.');
      seen.add(p.path);
      const { data, error } = await db.storage.from(PHOTO_BUCKET).download(p.path);
      if (error || !data) return err(422, 'missing', `Photo ${i + 1} introuvable : relancez le téléversement.`);
      const bytes = new Uint8Array(await data.arrayBuffer()), mime = sniffMime(bytes);
      if (!mime || bytes.length > MAX_BYTES) bad.push({ i, path: p.path });
      else checked.push({ path: p.path, original_filename: String(p.name || '').slice(0, 120) || null, mime_type: mime, file_size: bytes.length });
    }
    if (bad.length) {
      await db.storage.from(PHOTO_BUCKET).remove(bad.map((x) => x.path));
      return err(422, 'invalid_file', `Photo ${bad[0].i + 1} refusée : ce n'est pas une image JPEG, PNG ou WebP valide (ou elle dépasse ${LIMITS.maxMB} Mo).`);
    }
  }
  const ins = await db.from('device_purchase_requests').insert(v.value).select('id,reference').single();
  if (ins.error || !ins.data) return err(500, 'db', 'Impossible de préparer la demande.');
  if (checked.length) {
    const { error } = await db.from('device_purchase_photos').insert(checked.map((c) => ({ ...c, request_id: ins.data.id })));
    if (error) { await db.from('device_purchase_requests').delete().eq('id', ins.data.id); return err(409, 'duplicate', 'Cette demande a déjà été envoyée ou une photo est invalide.'); }
  }
  return { status: 201, json: { requestId: ins.data.id, reference: ins.data.reference, photos: checked.length } };
}

// Revérifie prix et stocks auprès de la base (source de vérité) pour les produits du panier.
export async function cartCheck({ body, db }) {
  const ids = body?.ids;
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 50 || ids.some((x) => typeof x !== 'string' || x.length > 64)) return err(400, 'invalid', 'Panier invalide.');
  const [p, c] = await Promise.all([
    db.from('products').select('*, product_images(storage_path,is_primary,display_order)').in('id', ids).is('archived_at', null),
    db.from('categories').select('id,name,slug,parent_id'),
  ]);
  if (p.error || c.error) return err(500, 'db', 'Vérification impossible pour le moment.');
  const urlOf = (path) => db.storage.from(IMG_BUCKET).getPublicUrl(path).data.publicUrl;
  return { status: 200, json: { products: buildCatalog(p.data, c.data, urlOf) } };
}
