import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CONFIG } from '../lib/config.js';
import { waUrl, GENERIC } from '../lib/whatsapp.js';
import { filterProducts } from '../lib/filters.js';
import { CartIcon, WaIcon } from './ui.jsx';
import { useCart } from './CartContext.jsx';
import { useCatalog } from './CatalogContext.jsx';

const NAV = [['/', 'Accueil'], ['/jeux', 'Jeux vidéo'], ['/consoles', 'Consoles'], ['/appareils', 'Achat / Vente'], ['/contact', 'Contact']];
export const mapUrl = () => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(CONFIG.mapQuery);

export function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const go = useNavigate();
  const { count } = useCart();
  const { products } = useCatalog();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, []);
  const cur = (h) => (h === '/' ? pathname === '/' : h === '/appareils' ? /^\/(appareils|vendre)/.test(pathname) : pathname.startsWith(h));
  const search = (e) => {
    e.preventDefault();
    const q = new FormData(e.target).get('q').trim();
    if (!q) return;
    const h = filterProducts(products, { q })[0];
    const base = !h ? '/jeux' : { console: '/consoles', appareil: '/appareils', 'jeu-numerique': '/jeux/numeriques' }[h.type] || '/jeux/physiques';
    go(`${base}?q=${encodeURIComponent(q)}`);
  };
  return (
    <header className={`hd${open ? ' open' : ''}`}>
      <div className="wrap hd-in">
        <Link className="brand" to="/"><img src="/img/logo.png" alt="" width="40" height="40" /><span>PIXEL PLAY<span className="sr"> – accueil</span></span></Link>
        <nav id="nav" aria-label="Navigation principale">
          {NAV.map(([h, l]) => <Link key={h} to={h} aria-current={cur(h) ? 'page' : undefined}>{l}</Link>)}
          <form id="srch" role="search" onSubmit={search}>
            <input type="search" name="q" aria-label="Rechercher un produit" placeholder="Rechercher…" />
            <button aria-label="Lancer la recherche"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M15 15l6 6" stroke="currentColor" strokeWidth="2" /></svg></button>
          </form>
        </nav>
        <a className="btn wa sm" href={waUrl(GENERIC)} target="_blank" rel="noopener noreferrer" aria-label="Contacter PIXEL PLAY sur WhatsApp"><WaIcon /><span className="hide-s">WhatsApp</span></a>
        <Link className="cartlink" to="/panier" aria-label={`Panier, ${count} article${count > 1 ? 's' : ''}`}><CartIcon />{count > 0 && <span className="badge" aria-hidden="true">{count}</span>}</Link>
        <button className="burger" aria-expanded={open} aria-controls="nav" aria-label="Menu" onClick={() => setOpen(!open)}><span /></button>
      </div>
    </header>
  );
}

export const Footer = () => (
  <footer className="ft"><div className="wrap ft-in">
    <div><img src="/img/logo-white.png" alt="PIXEL PLAY" width="64" height="64" /><p>{CONFIG.address}<br />{CONFIG.city}</p></div>
    <p><a href={`tel:${CONFIG.phoneTel}`}>{CONFIG.phoneDisplay}</a><br /><a href={mapUrl()} target="_blank" rel="noopener noreferrer">Itinéraire</a><br /><Link to="/contact">Contact</Link></p>
    <p className="small">Pour une demande de rachat, les informations saisies et les photos sont enregistrées de façon sécurisée et ne sont accessibles qu'à PIXEL PLAY. Aucun paiement n'est géré en ligne.</p>
  </div></footer>
);

export const Fab = () => (
  <a className="fab" href={waUrl(GENERIC)} target="_blank" rel="noopener noreferrer" aria-label="Discuter avec PIXEL PLAY sur WhatsApp"><WaIcon /></a>
);

export function Toast() {
  const { notice } = useCart();
  return <div className="toast" role="status" aria-live="polite">{notice?.text}</div>;
}
