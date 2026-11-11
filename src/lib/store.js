// Stockage local de la boutique (simulation, sans serveur).
// Produits, catégories, demandes, stocks et paramètres : LocalStorage.
// Photos ajoutées dans l'administration : IndexedDB.
import { PRODUCTS } from './data.js';
import { loadCart, saveCart } from './cart.js';
import { CONFIG } from './config.js';

export const KEYS = {
  db: 'pixelplay-db-v1',
  cart: 'pixelplay-cart-v1',
  session: 'pixelplay-admin-session',
};

const DEMO_EMAIL = 'admin@pixelplay.cm';
const DEMO_PASSWORD = 'PixelPlay2026!';
export const DEMO_LOGIN = { email: DEMO_EMAIL, password: DEMO_PASSWORD };

const listeners = new Set();
const memUrls = new Map();
const now = () => new Date().toISOString();
const uid = () => (globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
const clone = (v) => JSON.parse(JSON.stringify(v));

function cover(name, sub) {
  const esc = (s) => String(s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="#F5F4F8"/><rect width="14" height="600" fill="#6C3BEA"/><text x="48" y="290" fill="#171521" font-family="Arial,sans-serif" font-size="36" font-weight="700">${esc(name)}</text><text x="48" y="340" fill="#45218F" font-family="Georgia,serif" font-size="22" font-style="italic">${esc(sub)}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const CAT = { console: 'cat-consoles', 'jeu-physique': 'cat-phys', 'jeu-numerique': 'cat-num', appareil: 'cat-dev' };

function seed() {
  const categories = [
    { id: 'cat-consoles', name: 'Consoles', slug: 'consoles', parent_id: null, description: 'PS4, PS4 Slim, PS4 Pro, PS5, PS5 Slim et PS5 Digital Edition.' },
    { id: 'cat-phys', name: 'Jeux physiques', slug: 'jeux-physiques', parent_id: null, description: 'Jeux sur disque PS4 et PS5.' },
    { id: 'cat-num', name: 'Jeux numériques', slug: 'jeux-numeriques', parent_id: null, description: 'Jeux et accès numériques.' },
    { id: 'cat-dev', name: 'Appareils', slug: 'appareils', parent_id: null, description: 'Ordinateurs, téléphones et consoles d’occasion.' },
  ];
  const products = PRODUCTS.map((p, index) => {
    const qty = p.stock === true ? 8 : p.stock ? Number(p.stock) : 0;
    const specs = {};
    if (p.type === 'console') {
      specs.generation = p.platform;
      if (p.variant) specs.model = p.variant;
      specs.drive = /digital/i.test(`${p.name} ${p.variant || ''}`) ? 'Digital (sans lecteur)' : 'Avec lecteur';
    } else if (p.type === 'jeu-numerique') {
      specs.platform = p.platform;
      specs.offer_type = 'Jeu numérique';
    } else if (p.type === 'jeu-physique') {
      specs.platform = p.platform;
      specs.disc_type = 'Blu-ray';
    } else {
      specs.platform = p.platform;
    }
    const created = new Date(Date.UTC(2026, 9, 1 + index, 9, 0, 0)).toISOString();
    return {
      id: p.id, reference: p.reference || p.id, slug: p.id, name: p.name, description: p.description || '',
      category_id: CAT[p.type] || 'cat-dev', price: p.listPrice || p.price,
      promotional_price: p.listPrice ? p.price : null, stock_quantity: qty, stock_alert_threshold: 2,
      condition: p.condition === 'Occasion' ? 'used' : 'new', availability_enabled: !p.disabled,
      featured: !!p.featured, popularity: p.popularity ?? Math.max(10, 80 - index * 3), specifications: specs,
      created_at: created, updated_at: created, archived_at: null,
    };
  });
  const product_images = products.map((p, i) => ({
    id: `img-${p.id}`, product_id: p.id, storage_path: cover(p.name, p.specifications.platform || p.specifications.generation || 'PIXEL PLAY'),
    is_primary: true, display_order: i, mime_type: 'image/svg+xml', file_size: 800,
  }));
  const created = now();
  return {
    categories, products, product_images,
    device_purchase_requests: [{
      id: 'req-demo', reference: 'PPDEMO1', customer_name: 'Awa N.', phone: '697000000', location: 'Bonamoussadi',
      device_type: 'telephone', brand: 'Samsung', model: 'A15', condition: 'Bon état', expected_price: 45000,
      description: 'Demande de démonstration enregistrée dans ce navigateur.', specifications: { 'Capacité de stockage': '128 Go' },
      status: 'new', internal_notes: '', photo_count: 0, created_at: created, updated_at: created,
    }],
    device_purchase_photos: [],
    stock_movements: [],
    site_settings: {
      id: 1, business_name: CONFIG.brand, whatsapp: CONFIG.whatsapp, phone: CONFIG.phoneDisplay,
      address: CONFIG.address, city: CONFIG.city, map_query: CONFIG.mapQuery, latitude: null, longitude: null,
      stock_alert_default: 2, contact_info: 'Commandes et estimations uniquement sur WhatsApp. Aucun paiement en ligne.',
    },
    profiles: [{ id: 'admin-demo', full_name: 'Administrateur (démo)', role: 'admin', created_at: created }],
    audit_log: [],
  };
}

function storage() {
  try { return globalThis.localStorage; } catch { return null; }
}

function read() {
  const ls = storage();
  if (!ls) return seed();
  const raw = ls.getItem(KEYS.db);
  if (!raw) {
    const data = seed();
    try { ls.setItem(KEYS.db, JSON.stringify(data)); } catch { /* quota */ }
    return data;
  }
  try { return JSON.parse(raw); } catch { return seed(); }
}

function write(db) {
  const ls = storage();
  if (ls) {
    try { ls.setItem(KEYS.db, JSON.stringify(db)); } catch { /* quota : les images sont dans IndexedDB */ }
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('pixelplay-change'));
}

function audit(db, action, table, rowId) {
  db.audit_log.unshift({ id: uid(), action, table_name: table, row_id: String(rowId || ''), created_at: now(), profile_id: 'admin-demo' });
  db.audit_log = db.audit_log.slice(0, 40);
}

function attach(table, row, db) {
  const out = clone(row);
  if (table === 'products') out.product_images = db.product_images.filter((i) => i.product_id === row.id);
  if (table === 'device_purchase_requests') out.device_purchase_photos = db.device_purchase_photos.filter((i) => i.request_id === row.id);
  if (table === 'stock_movements') {
    const p = db.products.find((x) => x.id === row.product_id);
    const u = db.profiles.find((x) => x.id === row.profile_id);
    out.products = p ? { name: p.name, reference: p.reference } : null;
    out.profiles = u ? { full_name: u.full_name } : null;
  }
  if (table === 'audit_log') {
    const u = db.profiles.find((x) => x.id === row.profile_id);
    out.profiles = u ? { full_name: u.full_name } : null;
  }
  return out;
}

class Query {
  constructor(table, mode, payload) {
    this.table = table;
    this.mode = mode;
    this.payload = payload;
    this.filters = [];
    this._order = null;
    this._limit = null;
    this._single = null;
  }

  select() { return this; }
  is(col, val) { this.filters.push(['is', col, val]); return this; }
  eq(col, val) { this.filters.push(['eq', col, val]); return this; }
  order(col, opts = {}) { this._order = { col, asc: opts.ascending !== false }; return this; }
  limit(n) { this._limit = n; return this; }
  maybeSingle() { this._single = 'maybe'; return this.exec(); }
  single() { this._single = 'single'; return this.exec(); }
  then(ok, ko) { return this.exec().then(ok, ko); }

  match(row) {
    return this.filters.every(([op, col, val]) => (op === 'is' ? row[col] == val : row[col] === val));
  }

  async exec() {
    const db = read();
    const list = db[this.table];
    if (!Array.isArray(list) && this.table !== 'site_settings') return { data: null, error: { message: 'table inconnue' } };
    if (this.table === 'site_settings') return this.execSettings(db);

    if (this.mode === 'insert') return this.execInsert(db);
    if (this.mode === 'update') return this.execUpdate(db);
    if (this.mode === 'delete') return this.execDelete(db);

    let rows = list.filter((r) => this.match(r)).map((r) => attach(this.table, r, db));
    if (this._order) {
      const { col, asc } = this._order;
      rows.sort((a, b) => {
        const x = a[col], y = b[col];
        if (typeof x === 'number' && typeof y === 'number') return asc ? x - y : y - x;
        return asc ? String(x ?? '').localeCompare(String(y ?? ''), 'fr') : String(y ?? '').localeCompare(String(x ?? ''), 'fr');
      });
    }
    if (this._limit) rows = rows.slice(0, this._limit);
    return pack(rows, this._single);
  }

  execSettings(db) {
    const row = db.site_settings;
    if (this.mode === 'update') {
      if (!this.filters.every(([op, col, val]) => (op === 'eq' ? row[col] === val : true))) return pack([], this._single);
      Object.assign(row, this.payload);
      audit(db, 'update', 'site_settings', row.id);
      write(db);
      return pack([clone(row)], this._single);
    }
    return pack(this.match(row) ? [clone(row)] : [], this._single);
  }

  execInsert(db) {
    const items = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((row) => ({
      id: row.id || uid(), created_at: row.created_at || now(), updated_at: now(), ...row,
    }));
    if (this.table === 'products' && items.some((row) => db.products.some((p) => p.reference === row.reference))) {
      return { data: null, error: { message: 'duplicate key products_reference_key' } };
    }
    if (this.table === 'categories' && items.some((row) => db.categories.some((c) => c.slug === row.slug))) {
      return { data: null, error: { message: 'duplicate key categories_slug' } };
    }
    db[this.table].push(...items);
    items.forEach((row) => audit(db, 'insert', this.table, row.id));
    write(db);
    return pack(items.map(clone), this._single);
  }

  execUpdate(db) {
    const hits = db[this.table].filter((r) => this.match(r));
    if (this.table === 'products' && this.payload.reference && hits.some((row) => db.products.some((p) => p.reference === this.payload.reference && p.id !== row.id))) {
      return { data: null, error: { message: 'duplicate key products_reference_key' } };
    }
    hits.forEach((row) => { Object.assign(row, this.payload, { updated_at: now() }); audit(db, 'update', this.table, row.id); });
    write(db);
    return pack(hits.map((r) => attach(this.table, r, db)), this._single);
  }

  execDelete(db) {
    const hits = db[this.table].filter((r) => this.match(r));
    if (this.table === 'categories') {
      for (const c of hits) {
        const n = db.products.filter((p) => p.category_id === c.id && !p.archived_at).length;
        if (n) return { data: null, error: { message: `violates foreign key : ${n} produit(s) utilisent encore « ${c.name} ». Réaffectez-les avant suppression.` } };
        if (db.categories.some((x) => x.parent_id === c.id)) return { data: null, error: { message: 'violates foreign key : des sous-catégories existent encore.' } };
      }
    }
    const ids = new Set(hits.map((r) => r.id));
    db[this.table] = db[this.table].filter((r) => !ids.has(r.id));
    if (this.table === 'products') db.product_images = db.product_images.filter((i) => !ids.has(i.product_id));
    if (this.table === 'device_purchase_requests') db.device_purchase_photos = db.device_purchase_photos.filter((i) => !ids.has(i.request_id));
    hits.forEach((row) => audit(db, 'delete', this.table, row.id));
    write(db);
    return pack(hits.map(clone), this._single);
  }
}

function pack(rows, mode) {
  if (mode === 'single') {
    if (rows.length !== 1) return { data: null, error: { message: 'PGRST116' } };
    return { data: rows[0], error: null };
  }
  if (mode === 'maybe') return { data: rows[0] || null, error: null };
  return { data: rows, error: null };
}

export function getProducts() {
  return read().products.filter((p) => !p.archived_at).map(clone);
}
export function saveProducts(products) {
  const db = read(); db.products = products; write(db);
}
export function addProduct(row) {
  const db = read();
  const item = { id: uid(), created_at: now(), updated_at: now(), archived_at: null, availability_enabled: true, featured: false, popularity: 10, specifications: {}, stock_alert_threshold: 2, promotional_price: null, ...row };
  if (db.products.some((p) => p.reference === item.reference)) throw new Error('duplicate key products_reference_key');
  db.products.unshift(item); audit(db, 'insert', 'products', item.id); write(db); return item;
}
export function updateProduct(id, patch) {
  const db = read();
  const row = db.products.find((p) => p.id === id);
  if (!row) throw new Error('Produit introuvable');
  Object.assign(row, patch, { updated_at: now() });
  audit(db, 'update', 'products', id); write(db); return clone(row);
}
export function deleteProduct(id) {
  const db = read();
  const row = db.products.find((p) => p.id === id);
  if (!row) throw new Error('Produit introuvable');
  const paths = db.product_images.filter((i) => i.product_id === id).map((i) => i.storage_path);
  const hasHistory = db.stock_movements.some((m) => m.product_id === id);
  if (hasHistory) row.archived_at = now();
  else db.products = db.products.filter((p) => p.id !== id);
  db.product_images = db.product_images.filter((i) => i.product_id !== id);
  audit(db, 'delete', 'products', id); write(db);
  return { result: hasHistory ? 'archived' : 'deleted', paths };
}
export function updateStock(id, nextQty, reason = 'Ajustement') {
  const db = read();
  const row = db.products.find((p) => p.id === id);
  if (!row) throw new Error('Produit introuvable');
  const prev = row.stock_quantity;
  const next = Math.max(0, Math.trunc(Number(nextQty)) || 0);
  if (next !== prev) {
    row.stock_quantity = next;
    row.updated_at = now();
    db.stock_movements.unshift({
      id: uid(), product_id: id, previous_quantity: prev, new_quantity: next, changed_quantity: next - prev,
      reason, created_at: now(), profile_id: 'admin-demo',
    });
  }
  write(db);
  return clone(row);
}
export function getRequests() { return read().device_purchase_requests.map(clone); }
export function saveRequests(rows) {
  const db = read(); db.device_purchase_requests = rows; write(db);
}
export function addRequest(row) {
  const db = read();
  const item = { id: uid(), reference: `PP${Date.now().toString(36).toUpperCase().slice(-6)}`, status: 'new', internal_notes: '', photo_count: 0, created_at: now(), updated_at: now(), specifications: {}, ...row };
  db.device_purchase_requests.unshift(item); write(db); return item;
}
export function getCart() { return loadCart(); }
export { saveCart };

export function resetDemo() {
  const ls = storage();
  if (ls) ls.removeItem(KEYS.db);
  memUrls.clear();
  clearIdb().catch(() => {});
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('pixelplay-change'));
}

const IDB = 'pixelplay-images';
const IDB_STORE = 'files';
function openIdb() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) return reject(new Error('IndexedDB indisponible'));
    const req = indexedDB.open(IDB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
const idbReq = (req) => new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
async function idbPut(key, blob) {
  const db = await openIdb();
  await idbReq(db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).put(blob, key));
}
async function idbDel(key) {
  try {
    const db = await openIdb();
    await idbReq(db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).delete(key));
  } catch { /* ignore */ }
}
async function clearIdb() {
  if (!globalThis.indexedDB) return;
  const db = await openIdb();
  await idbReq(db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).clear());
}
export async function hydrate() {
  if (!globalThis.indexedDB) return;
  try {
    const db = await openIdb();
    const store = db.transaction(IDB_STORE).objectStore(IDB_STORE);
    const keys = await idbReq(store.getAllKeys());
    const vals = await idbReq(db.transaction(IDB_STORE).objectStore(IDB_STORE).getAll());
    keys.forEach((k, i) => { if (vals[i]) memUrls.set(k, URL.createObjectURL(vals[i])); });
  } catch { /* le catalogue reste utilisable sans photos ajoutées */ }
}

function publicUrl(path) {
  const s = String(path || '');
  if (s.startsWith('data:') || s.startsWith('blob:') || s.startsWith('http')) return s;
  return memUrls.get(s) || '';
}

export const db = {
  from(table) {
    const single = read().site_settings;
    if (table === 'site_settings') {
      return {
        select() {
          return new Query('site_settings', 'select', null);
        },
        update(patch) { return new Query('site_settings', 'update', patch); },
        insert() { return new Query('site_settings', 'insert', single); },
      };
    }
    return {
      select() { return new Query(table, 'select', null); },
      insert(row) { return new Query(table, 'insert', row); },
      update(patch) { return new Query(table, 'update', patch); },
      delete() { return new Query(table, 'delete', null); },
    };
  },
  async rpc(name, args = {}) {
    try {
      if (name === 'adjust_stock') { updateStock(args.p_product, args.p_new, args.p_reason || 'Ajustement'); return { data: true, error: null }; }
      if (name === 'remove_product') return { data: deleteProduct(args.p_id), error: null };
      return { data: null, error: { message: 'fonction inconnue' } };
    } catch (e) { return { data: null, error: { message: e.message } }; }
  },
  storage: {
    from() {
      return {
        getPublicUrl(path) { return { data: { publicUrl: publicUrl(path) } }; },
        async upload(path, blob) {
          try { await idbPut(path, blob); memUrls.set(path, URL.createObjectURL(blob)); return { data: { path }, error: null }; }
          catch (e) { return { data: null, error: { message: e.message || 'Enregistrement de l’image impossible.' } }; }
        },
        async remove(paths = []) {
          for (const p of paths) { memUrls.delete(p); await idbDel(p); }
          return { data: null, error: null };
        },
        async createSignedUrl(path) {
          const url = publicUrl(path);
          return url ? { data: { signedUrl: url }, error: null } : { data: null, error: { message: 'image absente' } };
        },
      };
    },
  },
  auth: {
    async signInWithPassword({ email, password }) {
      if (String(email || '').trim().toLowerCase() !== DEMO_EMAIL || password !== DEMO_PASSWORD) return { data: null, error: { message: 'invalid' } };
      const session = { user: { id: 'admin-demo', email: DEMO_EMAIL } };
      storage()?.setItem(KEYS.session, JSON.stringify(session));
      listeners.forEach((fn) => fn('SIGNED_IN', session));
      return { data: { session }, error: null };
    },
    async getSession() {
      let session = null;
      try { session = JSON.parse(storage()?.getItem(KEYS.session) || 'null'); } catch { session = null; }
      return { data: { session } };
    },
    onAuthStateChange(cb) {
      listeners.add(cb);
      return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
    },
    async signOut() {
      storage()?.removeItem(KEYS.session);
      listeners.forEach((fn) => fn('SIGNED_OUT', null));
      return { error: null };
    },
  },
};

void listeners;
