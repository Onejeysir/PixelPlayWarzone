import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useCatalog } from './CatalogContext.jsx';
import { addItem, removeItem, setQty, ackPrices, loadCart, saveCart, CART_KEY } from '../lib/cart.js';

const Ctx = createContext(null);
export const useCart = () => useContext(Ctx);

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);
  const [notice, setNotice] = useState(null);
  const { products } = useCatalog();
  const ref = useRef(items), timer = useRef(), pref = useRef(products);
  pref.current = products;
  const commit = (next) => { ref.current = next; setItems(next); saveCart(next); };
  const notify = (text) => { setNotice({ text }); clearTimeout(timer.current); timer.current = setTimeout(() => setNotice(null), 2500); };
  useEffect(() => {
    const sync = (e) => { if (e.key === CART_KEY) { ref.current = loadCart(); setItems(ref.current); } }; // autre onglet
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('storage', sync); clearTimeout(timer.current); };
  }, []);
  const value = useMemo(() => ({
    items, notice,
    count: items.reduce((n, i) => n + i.qty, 0),
    qtyOf: (id) => items.find((i) => i.id === id)?.qty || 0,
    add: (p, qty = 1) => {
      const r = addItem(ref.current, p, qty); commit(r.items);
      notify(r.added ? `${p.name} ajouté au panier` : 'Quantité maximale déjà dans le panier');
      return r.added;
    },
    setQty: (id, q) => commit(setQty(ref.current, id, q, pref.current)),
    remove: (id) => commit(removeItem(ref.current, id)),
    ackPrices: (cat) => commit(ackPrices(ref.current, cat || pref.current)),
    clear: () => commit([]), // uniquement sur action explicite du client
  }), [items, notice]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
