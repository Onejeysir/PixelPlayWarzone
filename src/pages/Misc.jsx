import { Link, useNavigate, useParams } from 'react-router-dom';
import { CONFIG } from '../lib/config.js';
import { formatPrice, waUrl, GENERIC, TYPE_LABEL } from '../lib/whatsapp.js';
import { AddToCart, Stock, Thumb, WaIcon, subtitle, usePage } from '../components/ui.jsx';
import { mapUrl } from '../components/Layout.jsx';
import { useCatalog } from '../components/CatalogContext.jsx';

export function Contact() {
  usePage('Contact', 'Adresse, téléphone et WhatsApp de PIXEL PLAY à Bonamoussadi, Douala.');
  return (
    <section className="wrap pad narrow">
      <h1>Contact</h1>
      <p><strong>PIXEL PLAY</strong><br />{CONFIG.address}<br />{CONFIG.city}</p>
      <p>Téléphone et WhatsApp : {CONFIG.phoneDisplay}</p>
      <p className="row">
        <a className="btn" href={`tel:${CONFIG.phoneTel}`}>Appeler</a>
        <a className="btn wa" href={waUrl(GENERIC)} target="_blank" rel="noopener noreferrer"><WaIcon />Écrire sur WhatsApp</a>
        <a className="btn" href={mapUrl()} target="_blank" rel="noopener noreferrer">Voir sur la carte</a>
      </p>
      <p className="hint">Lien de recherche cartographique basé sur l'adresse : la position exacte pourra être précisée ultérieurement. Horaires non communiqués.</p>
    </section>
  );
}

export function Product() {
  const { id } = useParams();
  const go = useNavigate();
  const { products, loading } = useCatalog();
  const p = products.find((x) => x.id === id);
  usePage(p ? p.name : 'Produit introuvable');
  const back = () => (window.history.state?.idx > 0 ? go(-1) : go('/'));
  return (
    <section className="wrap pad">
      <button type="button" className="back" onClick={back}>← Retour</button>
      {loading ? <p role="status">Chargement…</p> : !p ? <><h1>Produit introuvable</h1><p><Link className="btn" to="/jeux">Voir le catalogue</Link></p></> : (
        <div className="pd">
          <div className="ph big"><Thumb p={p} big /></div>
          <div>
            <p className="tag">{TYPE_LABEL[p.type]} · {subtitle(p)}</p>
            <h1>{p.name}</h1><p className="price">{formatPrice(p.price)}{p.oldPrice && <s className="old">{formatPrice(p.oldPrice)}</s>}</p><Stock p={p} />
            <p>{p.description}</p>{p.demo && <p className="note">Produit de démonstration.</p>}
            <AddToCart p={p} withQty />
          </div>
        </div>
      )}
    </section>
  );
}

export function NotFound() {
  usePage('Page introuvable');
  return <section className="wrap pad"><h1>Page introuvable</h1><p><Link className="btn" to="/">Retour à l'accueil</Link></p></section>;
}
