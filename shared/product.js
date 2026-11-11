// Règles produit partagées (site, administration, fonctions serveur). Mêmes règles que public.stock_status() en SQL.
export const STATUS_LABEL = { available: 'Disponible', low: 'Stock faible', out: 'Rupture de stock', disabled: 'Indisponible' };
export const TYPE_BY_SLUG = { consoles: 'console', 'jeux-physiques': 'jeu-physique', 'jeux-numeriques': 'jeu-numerique', appareils: 'appareil' };

export function stockStatus(qty, threshold, enabled = true) {
  if (!enabled) return 'disabled'; // la désactivation manuelle est prioritaire
  if (qty <= 0) return 'out';
  if (qty <= threshold) return 'low';
  return 'available';
}

export function categoryType(cat, byId) {
  for (let c = cat, i = 0; c && i < 5; c = c.parent_id ? byId.get(c.parent_id) : null, i++) if (TYPE_BY_SLUG[c.slug]) return TYPE_BY_SLUG[c.slug];
  return 'appareil';
}

// Ligne SQL -> objet utilisé par le site. `stock` vaut 0 dès que le produit n'est pas commandable.
export function normalizeProduct(r, type, imageUrls = []) {
  const s = r.specifications || {}, status = stockStatus(r.stock_quantity, r.stock_alert_threshold, r.availability_enabled);
  return {
    id: r.id, reference: r.reference, slug: r.slug, type, name: r.name, description: r.description || '',
    platform: s.platform || s.generation || '', variant: [s.model, s.version].filter(Boolean).join(' ') || null,
    condition: type === 'jeu-numerique' ? null : r.condition === 'new' ? 'Neuf' : 'Occasion',
    price: r.promotional_price ?? r.price, oldPrice: r.promotional_price != null ? r.price : null,
    stock: status === 'out' || status === 'disabled' ? 0 : r.stock_quantity, status,
    image: imageUrls[0] || null, images: imageUrls, featured: !!r.featured, popularity: r.popularity || 0,
    createdAt: r.created_at || null, specs: s, demo: false,
  };
}

export function buildCatalog(rows, cats, urlOf) {
  const byId = new Map(cats.map((c) => [c.id, c]));
  return rows.map((r) => {
    const imgs = [...(r.product_images || [])].sort((a, b) => (b.is_primary - a.is_primary) || (a.display_order - b.display_order));
    return normalizeProduct(r, categoryType(byId.get(r.category_id), byId), imgs.map((i) => urlOf(i.storage_path)));
  });
}

// Applique les paramètres de la table site_settings à l'objet CONFIG (valide le numéro WhatsApp).
export function applySettings(config, s) {
  if (!s || !/^\d{8,15}$/.test(String(s.whatsapp || ''))) return false;
  Object.assign(config, { brand: s.business_name, whatsapp: s.whatsapp, phoneDisplay: s.phone, phoneTel: String(s.phone).replace(/[^\d+]/g, ''), address: s.address, city: s.city, mapQuery: s.map_query });
  return true;
}
