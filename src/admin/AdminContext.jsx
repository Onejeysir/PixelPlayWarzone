import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

const Ctx = createContext(null);
export const useAdmin = () => useContext(Ctx);

// Session Supabase Auth + rôle lu dans la table `profiles` (protégée par RLS) : jamais dans user_metadata.
// Ce contexte ne fait que de l'affichage : l'autorisation réelle est appliquée par les politiques RLS et les fonctions SQL.
export function AdminProvider({ children }) {
  const [st, setSt] = useState({ loading: !!supabase, session: null, profile: null });
  useEffect(() => {
    if (!supabase) return undefined;
    let seq = 0; // seule la réponse la plus récente compte : une ancienne requête ne doit jamais écraser un état « déconnecté »
    const load = async (session) => {
      const mine = ++seq;
      if (!session) return setSt({ loading: false, session: null, profile: null });
      const { data } = await supabase.from('profiles').select('id,full_name,role').eq('id', session.user.id).maybeSingle();
      if (mine === seq) setSt({ loading: false, session, profile: data || null });
    };
    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setTimeout(() => load(s), 0)); // évite un blocage interne de supabase-js
    return () => { seq += 1; sub.subscription.unsubscribe(); };
  }, []);
  const signOut = useCallback(() => supabase.auth.signOut(), []);
  const value = { ...st, signOut, isAdmin: st.profile?.role === 'admin', configured: !!supabase };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
