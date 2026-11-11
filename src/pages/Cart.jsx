import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPrice, waUrl } from '../lib/whatsapp.js';
import { resolve, orderMessage, categoryLabel } from '../lib/cart.js';
import { checkCart } from '../lib/api.js';
import { useCart } from '../components/CartContext.jsx';
import { useCatalog } from '../components/CatalogContext.jsx';
import { CartIcon, Thumb, WaIcon, usePage } from '../components/ui.jsx';

const ISSUE = {
  missing: () => "Ce produit n'est plus au catalogue : supprimez-le pour commander.",
  unavailable: () => 'Ce produit est actuellement indisponible : supprimez-le pour commander.',
  qty: (l) => `Seulement ${l.max} en stock : réduisez la quantité.`,
  price: (l) => `Le prix a changé : ${formatPrice(l.oldPrice)} → ${formatPrice(l.unit)}.`,
};

export default function Cart() {
  usePage('Mon panier');
  const { items, setQty, remove, ackPrices, clear } = useCart();
  const { products: local, demo, loading } = useCatalog();
  const [chk, setChk] = useState({ state: 'idle', products: [] });
  const [tick, setTick] = useState(0);
  const ids = items.map((i) => i.id).join(',');
  // Revérification AUTORITAIRE (serveur) des prix et stocks : au chargement, à chaque changement de panier et au retour sur l'onglet.
  useEffect(() => {
    if (demo || !items.length) return undefined;
    let dead = false;
    setChk((c) => ({ ...c, state: 'checking' }));
    checkCart(items.map((i) => i.id)).then((products) => !dead && setChk({ state: 'ok', products })).catch(() => !dead && setChk({ state: 'error', products: [] }));
    return () => { dead = true; };
  }, [ids, tick, demo]);
  useEffect(() => { const f = () => setTick((t) => t + 1); window.addEventListener('focus', f); return () => window.removeEventListener('focus', f); }, []);

  const verified = demo || chk.state === 'ok';
  const catalog = demo ? local : verified ? chk.products : local;
  const s = useMemo(() => resolve(items, catalog), [items, catalog]);

  if (loading) return <section className="wrap pad"><p role="status">Chargement…</p></section>;
  if (!s.lines.length) {
    return (
      <section className="wrap pad empty-cart">
        <CartIcon /><h1>Mon panier</h1>
        <p className="lead">Votre panier est actuellement vide.</p>
        <Link className="btn" to="/jeux">Découvrir nos produits</Link>
      </section>
    );
  }
  const canOrder = s.canOrder && verified;
  return (
    <section className="wrap pad">
      <h1>Mon panier</h1>
      {!demo && chk.state === 'checking' && <p className="notice" role="status">Vérification du stock et des prix…</p>}
      {!demo && chk.state === 'error' && <div className="alert" role="alert">Impossible de vérifier le stock et les prix pour le moment. <button type="button" className="btn ghostv sm" onClick={() => setTick((t) => t + 1)}>Réessayer</button></div>}
      {verified && s.priceChanged && (
        <div className="alert" role="alert">Des prix ont changé depuis l'ajout au panier. Vérifiez-les avant de commander.{' '}
          <button type="button" className="btn ghostv sm" onClick={() => ackPrices(catalog)}>Accepter les nouveaux prix</button></div>
      )}
      <div className="cart">
        <ul className="lines">
          {s.lines.map((l) => (
            <li className="line" key={l.id}>
              <div className="ph">{l.product ? <Thumb p={l.product} /> : <span className="ph-t">?</span>}</div>
              <div>
                <p className="tag">{l.product ? `${categoryLabel(l.product)}${l.product.type !== 'console' ? ` · ${l.product.platform}` : l.product.variant ? ` · ${l.product.variant}` : ''}` : 'Produit'}</p>
                <h3>{l.name}</h3>
                <p>{formatPrice(l.unit)} l'unité</p>
                {verified && l.issues.map((k) => <p key={k} className="alert" role="alert">{ISSUE[k](l)}</p>)}
                <div className="lq">
                  <div className="qty" role="group" aria-label={`Quantité de ${l.name}`}>
                    <button type="button" aria-label="Diminuer la quantité" onClick={() => setQty(l.id, l.qty - 1)}>−</button>
                    <output>{l.qty}</output>
                    <button type="button" aria-label="Augmenter la quantité" disabled={l.qty >= l.max} onClick={() => setQty(l.id, l.qty + 1)}>+</button>
                  </div>
                  <button type="button" className="linkbtn" onClick={() => remove(l.id)}>Supprimer</button>
                  <p className="price">{formatPrice(l.subtotal)}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <aside className="sum" aria-label="Récapitulatif">
          <h2>Récapitulatif</h2>
          <dl>
            <dt>Articles</dt><dd>{s.count}</dd>
            <dt>Sous-total</dt><dd>{formatPrice(s.subtotal)}</dd>
            <dt>Livraison</dt><dd>{s.delivery == null ? 'À confirmer' : formatPrice(s.delivery)}</dd>
            <dt><strong>Total</strong></dt><dd><strong>{formatPrice(s.total)}</strong></dd>
          </dl>
          {canOrder
            ? <a className="btn wa" href={waUrl(orderMessage(s))} target="_blank" rel="noopener noreferrer"><WaIcon /><span>Passer ma commande sur WhatsApp</span></a>
            : <><button type="button" className="btn wa" disabled><WaIcon /><span>Passer ma commande sur WhatsApp</span></button><p className="hint">{verified ? 'Corrigez les points signalés pour pouvoir commander.' : 'Vérification en cours : la commande sera possible une fois le stock confirmé.'}</p></>}
          <p className="hint">Ouvrir WhatsApp ne valide pas la commande : envoyez le message, PIXEL PLAY confirme disponibilité, montant et modalités. <strong>Le stock n'est pas réservé</strong> avant cette confirmation. Votre panier est conservé jusqu'à ce que vous le vidiez.</p>
          <p className="row"><Link className="btn ghostv" to="/jeux">Continuer mes achats</Link><button type="button" className="linkbtn" onClick={() => window.confirm('Vider le panier ?') && clear()}>Vider le panier</button></p>
        </aside>
      </div>
    </section>
  );
}
