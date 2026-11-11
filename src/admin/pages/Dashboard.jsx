import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { stockStatus, categoryType } from '../../../shared/product.js';
import { fmtDate } from '../../lib/admin.js';
import { unwrap, useQuery, Wait } from '../parts.jsx';

export default function Dashboard() {
  const q = useQuery(async () => {
    const [p, c, r] = await Promise.all([
      supabase.from('products').select('id,name,reference,category_id,stock_quantity,stock_alert_threshold,availability_enabled,created_at,updated_at').is('archived_at', null),
      supabase.from('categories').select('id,slug,parent_id'),
      supabase.from('device_purchase_requests').select('id,status'),
    ]);
    return { p: unwrap(p), c: unwrap(c), r: unwrap(r) };
  });
  const w = Wait({ q }); if (w) return <><h1>Tableau de bord</h1>{w}</>;
  const { p, c, r } = q.data, byId = new Map(c.map((x) => [x.id, x]));
  const rows = p.map((x) => ({ ...x, status: stockStatus(x.stock_quantity, x.stock_alert_threshold, x.availability_enabled), type: categoryType(byId.get(x.category_id), byId) }));
  const n = (f) => rows.filter(f).length;
  const kpi = [
    ['Produits', rows.length], ['Disponibles', n((x) => x.status === 'available' || x.status === 'low')], ['Indisponibles (désactivés)', n((x) => x.status === 'disabled')],
    ['Ruptures de stock', n((x) => x.status === 'out')], ['Stock faible', n((x) => x.status === 'low')], ['Jeux vidéo', n((x) => x.type.startsWith('jeu'))], ['Consoles', n((x) => x.type === 'console')],
    ['Demandes de rachat', r.length], ['Demandes en attente (nouvelles)', r.filter((x) => x.status === 'new').length],
  ];
  const by = (k) => [...rows].sort((a, b) => new Date(b[k]) - new Date(a[k])).slice(0, 5);
  return (
    <>
      <h1>Tableau de bord</h1>
      <ul className="kpis">{kpi.map(([l, v]) => <li key={l}><strong>{v}</strong><span>{l}</span></li>)}</ul>
      <div className="two">
        <section><h2>Derniers produits ajoutés</h2>{by('created_at').length ? <ul className="plain">{by('created_at').map((x) => <li key={x.id}><Link to={`/admin/products/${x.id}`}>{x.name}</Link> <small>{fmtDate(x.created_at)}</small></li>)}</ul> : <p className="hint">Aucun produit pour le moment.</p>}</section>
        <section><h2>Dernières modifications</h2>{by('updated_at').length ? <ul className="plain">{by('updated_at').map((x) => <li key={x.id}><Link to={`/admin/products/${x.id}`}>{x.name}</Link> <small>{fmtDate(x.updated_at)}</small></li>)}</ul> : <p className="hint">Aucune modification.</p>}</section>
      </div>
    </>
  );
}
