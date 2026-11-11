import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPrice } from '../lib/whatsapp.js';
import { STATUS_LABEL } from '../../shared/product.js';
import { isCartable, maxQty } from '../lib/cart.js';
import { useCart } from './CartContext.jsx';

export const WaIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2z" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M8.5 7.5c-.5 1 0 3 2 5s4 2.5 5 2l1-1.5-2-1-1 .7c-1-.4-2-1.4-2.4-2.4l.7-1-1-2z" fill="currentColor" />
  </svg>
);
export const CartIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2 3h3l2.4 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20 7H6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><circle cx="9" cy="19.5" r="1.6" fill="currentColor" /><circle cx="17" cy="19.5" r="1.6" fill="currentColor" /></svg>
);

export function usePage(title, desc) {
  useEffect(() => {
    document.title = `${title} | PIXEL PLAY`;
    if (desc) document.querySelector('meta[name=description]')?.setAttribute('content', desc);
  }, [title, desc]);
}

export const subtitle = (p) => ({
  console: [p.variant, p.condition], appareil: [p.platform, p.condition],
  'jeu-physique': [p.platform, p.condition], 'jeu-numerique': [p.platform, 'Numérique'],
}[p.type].filter(Boolean).join(' · '));

export function AddToCart({ p, withQty }) {
  const { add, qtyOf } = useCart();
  const [n, setN] = useState(1), [done, setDone] = useState(false), timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  if (!isCartable(p)) {
    return withQty ? <p>Pour acheter cet appareil, <Link to="/contact">contactez PIXEL PLAY</Link>.</p> : <Link className="btn ghostv" to={`/produit/${p.id}`}>Voir la fiche</Link>;
  }
  const inCart = qtyOf(p.id), left = maxQty(p) - inCart, shown = Math.min(n, Math.max(left, 1));
  const click = () => {
    if (add(p, withQty ? shown : 1)) { setDone(true); clearTimeout(timer.current); timer.current = setTimeout(() => setDone(false), 1500); setN(1); }
  };
  if (!maxQty(p)) return <button type="button" className="btn" disabled><CartIcon /><span>{STATUS_LABEL[p.status] || 'Indisponible'}</span></button>;
  return (
    <>
      {withQty && left > 0 && (
        <div className="qty" role="group" aria-label="Quantité à ajouter">
          <button type="button" aria-label="Diminuer la quantité" onClick={() => setN(Math.max(1, shown - 1))}>−</button>
          <output aria-live="polite">{shown}</output>
          <button type="button" aria-label="Augmenter la quantité" onClick={() => setN(Math.min(left, shown + 1))}>+</button>
        </div>
      )}
      <button type="button" className={`btn${done ? ' done' : ''}`} disabled={left <= 0} onClick={click}>
        <CartIcon /><span>{left <= 0 ? 'Maximum dans le panier' : done ? 'Ajouté ✓' : 'Ajouter au panier'}</span>
      </button>
      {inCart > 0 && <p className="hint">{inCart} dans votre panier · <Link to="/panier">Voir le panier</Link></p>}
    </>
  );
}

export const Stock = ({ p }) => {
  const st = p.status || (p.stock ? 'available' : 'out');
  return <p className={`stock ${st === 'available' ? 'ok' : st === 'low' ? 'low' : 'ko'}`}>{STATUS_LABEL[st]}</p>;
};

export function Thumb({ p, big }) {
  const [broken, setBroken] = useState(false);
  return p.image && !broken
    ? <img loading="lazy" src={p.image} alt={big ? p.name : ''} onError={() => setBroken(true)} />
    : <span className="ph-t">{p.platform}</span>;
}

export const ProductCard = ({ p }) => (
  <article className="card">
    <Link className="ph" to={`/produit/${p.id}`} tabIndex={-1} aria-hidden="true"><Thumb p={p} /></Link>
    <div className="cb">
      <p className="tag">{subtitle(p)}</p>
      <h3><Link to={`/produit/${p.id}`}>{p.name}</Link></h3>
      <p className="price">{formatPrice(p.price)}{p.oldPrice && <s className="old">{formatPrice(p.oldPrice)}</s>}</p>
      <Stock p={p} />
      <AddToCart p={p} />
    </div>
    {p.demo && <span className="demo">Démo</span>}
  </article>
);
