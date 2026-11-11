import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { IMG_BUCKET } from '../../../shared/constants.js';
import { stockStatus, categoryType } from '../../../shared/product.js';
import { formatPrice } from '../../lib/whatsapp.js';
import { fmtDate, friendly } from '../../lib/admin.js';
import { useAdmin } from '../AdminContext.jsx';
import { Badge, InlineNumber, Msg, Pager, unwrap, useQuery, Wait } from '../parts.jsx';

const PAGE = 15;
export default function Products() {
  const { isAdmin } = useAdmin();
  const flash = useLocation().state?.flash;
  const [m, setM] = useState(flash ? { type: 'ok', text: flash } : null);
  const [f, setF] = useState({ q: '', cat: '', platform: '', status: '', condition: '', archived: false });
  const [page, setPage] = useState(1);
  const q = useQuery(async () => {
    const [p, c] = await Promise.all([
      supabase.from('products').select('*, product_images(storage_path,is_primary,display_order)').order('created_at', { ascending: false }),
      supabase.from('categories').select('id,name,slug,parent_id').order('name'),
    ]);
    return { p: unwrap(p), c: unwrap(c) };
  });
  const rows = useMemo(() => {
    if (!q.data) return [];
    const byId = new Map(q.data.c.map((x) => [x.id, x])), t = f.q.trim().toLowerCase();
    return q.data.p.map((x) => ({ ...x, status: stockStatus(x.stock_quantity, x.stock_alert_threshold, x.availability_enabled), type: categoryType(byId.get(x.category_id), byId), catName: byId.get(x.category_id)?.name, plat: x.specifications?.platform || x.specifications?.generation || '' }))
      .filter((x) => (f.archived ? !!x.archived_at : !x.archived_at) && (!t || x.name.toLowerCase().includes(t) || x.reference.toLowerCase().includes(t))
        && (!f.cat || x.category_id === f.cat) && (!f.platform || x.plat === f.platform) && (!f.status || x.status === f.status) && (!f.condition || x.condition === f.condition));
  }, [q.data, f]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE)), cur = Math.min(page, pages), shown = rows.slice((cur - 1) * PAGE, cur * PAGE);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }); setPage(1); };
  const run = async (fn, ok) => { try { const r = await fn(); setM({ type: 'ok', text: typeof ok === 'function' ? ok(r) : ok }); q.reload(); } catch (e) { setM({ type: 'error', text: friendly(e) }); } };
  const img = (x) => { const i = [...(x.product_images || [])].sort((a, b) => (b.is_primary - a.is_primary) || a.display_order - b.display_order)[0]; return i ? supabase.storage.from(IMG_BUCKET).getPublicUrl(i.storage_path).data.publicUrl : null; };
  const remove = (x) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce produit ? Cette opération ne pourra pas être annulée.')) return;
    run(async () => { const r = unwrap(await supabase.rpc('remove_product', { p_id: x.id })); if (r.result === 'deleted' && r.paths.length) await supabase.storage.from(IMG_BUCKET).remove(r.paths); return r.result; },
      (r) => (r === 'archived' ? 'Produit archivé : son historique commercial est conservé.' : 'Produit supprimé.'));
  };
  const plats = [...new Set((q.data?.p || []).map((x) => x.specifications?.platform || x.specifications?.generation).filter(Boolean))];
  return (
    <>
      <h1>Gestion des produits</h1><Msg m={m} />
      <p><Link className="btn" to="/admin/products/new">Ajouter un produit</Link></p>
      <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <label>Recherche (nom ou référence)<input type="search" value={f.q} onChange={set('q')} /></label>
        <label>Catégorie<select value={f.cat} onChange={set('cat')}><option value="">Toutes</option>{(q.data?.c || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Plateforme<select value={f.platform} onChange={set('platform')}><option value="">Toutes</option>{plats.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Disponibilité / stock<select value={f.status} onChange={set('status')}><option value="">Tous</option><option value="available">Disponible</option><option value="low">Stock faible</option><option value="out">Rupture</option><option value="disabled">Désactivé</option></select></label>
        <label>État<select value={f.condition} onChange={set('condition')}><option value="">Tous</option><option value="new">Neuf</option><option value="used">Occasion</option></select></label>
        <label className="chk"><input type="checkbox" checked={f.archived} onChange={set('archived')} /> Archivés</label>
      </form>
      {Wait({ q }) || (
        <>
          <p role="status">{rows.length} produit(s)</p>
          <table className="adm-table"><thead><tr><th>Image</th><th>Nom</th><th>Réf.</th><th>Catégorie</th><th>Plateforme</th><th>Prix (FCFA)</th><th>Stock</th><th>Disponibilité</th><th>Ajouté le</th><th>Actions</th></tr></thead>
            <tbody>{shown.map((x) => (
              <tr key={x.id}>
                <td data-label="Image">{img(x) ? <img className="thumb" src={img(x)} alt="" /> : <span className="thumb ph-t">—</span>}</td>
                <td data-label="Nom"><strong>{x.name}</strong></td><td data-label="Réf.">{x.reference}</td><td data-label="Catégorie">{x.catName}</td><td data-label="Plateforme">{x.plat || '—'}</td>
                <td data-label="Prix"><InlineNumber label={`Prix de ${x.name}`} value={x.price} onSave={(v) => run(async () => unwrap(await supabase.from('products').update({ price: Number(v) }).eq('id', x.id).select('id').single()), 'Prix modifié.')} />{x.promotional_price != null && <small>promo : {formatPrice(x.promotional_price)}</small>}</td>
                <td data-label="Stock"><InlineNumber label={`Stock de ${x.name}`} value={x.stock_quantity} onSave={(v) => run(async () => unwrap(await supabase.rpc('adjust_stock', { p_product: x.id, p_new: Number(v), p_reason: 'Ajustement rapide (liste produits)' })), 'Stock modifié.')} /></td>
                <td data-label="Disponibilité"><Badge status={x.status} /></td><td data-label="Ajouté le">{fmtDate(x.created_at)}</td>
                <td data-label="Actions" className="acts">
                  <a href={`/produit/${x.id}`} target="_blank" rel="noopener noreferrer">Consulter</a>
                  <Link to={`/admin/products/${x.id}`}>Modifier</Link>
                  {!x.archived_at && <button type="button" className="linkbtn" onClick={() => run(async () => unwrap(await supabase.from('products').update({ availability_enabled: !x.availability_enabled }).eq('id', x.id).select('id').single()), x.availability_enabled ? 'Produit désactivé.' : 'Produit réactivé.')}>{x.availability_enabled ? 'Désactiver' : 'Activer'}</button>}
                  {x.archived_at && <button type="button" className="linkbtn" onClick={() => run(async () => unwrap(await supabase.from('products').update({ archived_at: null }).eq('id', x.id).select('id').single()), 'Produit restauré (réactivez-le si besoin).')}>Restaurer</button>}
                  {isAdmin && !x.archived_at && <button type="button" className="linkbtn danger" onClick={() => remove(x)}>Supprimer</button>}
                </td>
              </tr>))}</tbody></table>
          <Pager page={cur} pages={pages} onPage={setPage} />
        </>
      )}
    </>
  );
}
