import { buildCatalog } from '../../shared/product.js';
import { IMG_BUCKET } from '../../shared/constants.js';

export async function loadCatalog(client) {
  const [c, p] = await Promise.all([
    client.from('categories').select('id,name,slug,parent_id'),
    client.from('products').select('*, product_images(storage_path,is_primary,display_order)').is('archived_at', null).order('created_at', { ascending: false }),
  ]);
  if (c.error || p.error) throw new Error('Impossible de charger le catalogue.');
  return buildCatalog(p.data, c.data, (path) => client.storage.from(IMG_BUCKET).getPublicUrl(path).data.publicUrl);
}
