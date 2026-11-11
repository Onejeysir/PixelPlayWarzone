// Supabase est ISOLÉ du reste du site : rien n'est chargé ni initialisé tant que VITE_ENABLE_SUPABASE n'est pas « true »
// ET que l'URL et la clé publique ne sont pas renseignées. Sinon le site fonctionne seul (catalogue de démonstration, panier,
// commande WhatsApp), sans aucune dépendance à Supabase. Clés PUBLIQUES uniquement : la clé service_role reste côté serveur (api/).
const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
export const supabaseEnabled = String(import.meta.env.VITE_ENABLE_SUPABASE || '').trim().toLowerCase() === 'true' && !!url && !!key;

// Liaison dynamique (live binding) : null jusqu'à la fin de initSupabase(), appelée avant le premier rendu (main.jsx).
export let supabase = null;

export async function initSupabase() {
  if (!supabaseEnabled || supabase) return supabase;
  try {
    const { createClient } = await import('@supabase/supabase-js'); // chargé seulement si activé
    supabase = createClient(url, key);
  } catch (e) {
    console.error('Supabase désactivé (échec d’initialisation) :', e?.message || e);
    supabase = null; // le site démarre quand même, en mode sans Supabase
  }
  return supabase;
}
