import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { loadCatalog } from '../lib/catalog.js';
import { PRODUCTS } from '../lib/data.js';

const Ctx = createContext(null);
export const useCatalog = () => useContext(Ctx);

// Catalogue réel (Supabase) ; sans configuration Supabase : données de démonstration clairement marquées.
export function CatalogProvider({ children }) {
  const [s, setS] = useState({ products: supabase ? [] : PRODUCTS, loading: !!supabase, error: null });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!supabase) return undefined;
    let dead = false;
    setS((o) => ({ ...o, loading: true, error: null }));
    loadCatalog(supabase).then((products) => !dead && setS({ products, loading: false, error: null }))
      .catch((e) => !dead && setS({ products: [], loading: false, error: e.message }));
    return () => { dead = true; };
  }, [n]);
  const value = useMemo(() => ({ ...s, demo: !supabase, reload: () => setN((x) => x + 1) }), [s]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
