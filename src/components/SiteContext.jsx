import { Fragment, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { CONFIG } from '../lib/config.js';
import { applySettings } from '../../shared/product.js';

// Charge les coordonnées de l'entreprise depuis la base (page Paramètres) et les applique à CONFIG.
// Un changement de numéro/adresse se fait dans l'administration, sans toucher au code.
export function SiteProvider({ children }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!supabase) return;
    supabase.from('site_settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => { if (applySettings(CONFIG, data)) setV((n) => n + 1); });
  }, []);
  return <Fragment key={v}>{children}</Fragment>;
}
