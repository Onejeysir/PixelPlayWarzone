import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCatalog } from './CatalogContext.jsx';
import { filterProducts } from '../lib/filters.js';
import { ProductCard } from './ui.jsx';

const EMPTY = { platform: '', variant: '', condition: '', minPrice: '', maxPrice: '', sort: '', inStock: false };
const Sel = ({ label, name, value, onChange, options }) => (
  <label>{label}<select name={name} value={value} onChange={onChange}><option value="">Tous</option>{options.map((o) => <option key={o}>{o}</option>)}</select></label>
);

export default function Catalog({ types }) {
  const [sp] = useSearchParams();
  const { products, loading, error, reload } = useCatalog();
  const key = types.join();
  const list = useMemo(() => products.filter((p) => types.includes(p.type)), [key, products]);
  const [f, setF] = useState({ ...EMPTY, q: sp.get('q') || '' });
  useEffect(() => setF((o) => ({ ...o, q: sp.get('q') || '' })), [sp]);
  const uniq = (k) => [...new Set(list.map((p) => p[k]).filter(Boolean))];
  const res = useMemo(() => filterProducts(list, f), [list, f]);
  const on = (e) => { const { name, value, type, checked } = e.target; setF((o) => ({ ...o, [name]: type === 'checkbox' ? checked : value })); };
  const isConsole = types.includes('console');
  if (loading) return <p role="status">Chargement du catalogue…</p>;
  if (error) return <div className="notice error" role="alert">{error} <button type="button" className="linkbtn" onClick={reload}>Réessayer</button></div>;
  return (
    <div id="catalog">
      {list.some((p) => p.demo) && <p className="note">Données de démonstration : produits, prix et stocks sont des exemples à remplacer (Supabase non configuré).</p>}
      <form className="filters" role="search" aria-label="Filtrer les produits" onSubmit={(e) => e.preventDefault()}>
        <label>Recherche<input type="search" name="q" value={f.q} onChange={on} placeholder="Nom du produit" /></label>
        <Sel label={isConsole ? 'Génération' : 'Plateforme'} name="platform" value={f.platform} onChange={on} options={uniq('platform')} />
        {isConsole && <Sel label="Variante" name="variant" value={f.variant} onChange={on} options={uniq('variant')} />}
        {uniq('condition').length > 0 && <Sel label="État" name="condition" value={f.condition} onChange={on} options={uniq('condition')} />}
        <label>Prix min (FCFA)<input name="minPrice" type="number" min="0" inputMode="numeric" value={f.minPrice} onChange={on} /></label>
        <label>Prix max (FCFA)<input name="maxPrice" type="number" min="0" inputMode="numeric" value={f.maxPrice} onChange={on} /></label>
        <label>Tri<select name="sort" value={f.sort} onChange={on}><option value="">Pertinence</option><option value="asc">Prix croissant</option><option value="desc">Prix décroissant</option></select></label>
        <label className="chk"><input type="checkbox" name="inStock" checked={f.inStock} onChange={on} /> Disponibles seulement</label>
        <button type="button" className="btn ghostv" onClick={() => setF({ ...EMPTY, q: '' })}>Réinitialiser</button>
      </form>
      <p role="status">{res.length} produit{res.length > 1 ? 's' : ''}</p>
      <div className="grid">
        {res.length ? res.map((p) => <ProductCard key={p.id} p={p} />) : <p className="empty">Aucun produit ne correspond. Modifiez ou réinitialisez les filtres.</p>}
      </div>
    </div>
  );
}
