const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function filterProducts(list, f = {}) {
  let r = list.filter((p) =>
    (!f.q || norm(`${p.name} ${p.variant || ''}`).includes(norm(f.q))) &&
    (!f.platform || p.platform === f.platform) && (!f.condition || p.condition === f.condition) &&
    (!f.type || p.type === f.type) &&
    (!f.variant || p.variant === f.variant) && (!f.minPrice || p.price >= +f.minPrice) &&
    (!f.maxPrice || p.price <= +f.maxPrice) && (!f.inStock || p.stock));
  if (f.sort === 'asc') r = [...r].sort((a, b) => a.price - b.price);
  if (f.sort === 'desc') r = [...r].sort((a, b) => b.price - a.price);
  if (f.sort === 'popular') r = [...r].sort((a, b) => (b.popularity || 0) - (a.popularity || 0) || a.name.localeCompare(b.name, 'fr'));
  return r;
}
