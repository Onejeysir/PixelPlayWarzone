import { createClient } from '@supabase/supabase-js';

// Adapte une fonction pure de core.js à une Vercel Function. La clé service_role reste côté serveur.
export function route(handle) {
  return async function handler(req, res) {
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: { code: 'method', message: 'Méthode non autorisée.' } }); }
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return res.status(500).json({ error: { code: 'config', message: 'Serveur non configuré.' } });
    try {
      const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const r = await handle({ body, db, serviceKey: key });
      return res.status(r.status).json(r.json);
    } catch (e) {
      console.error('api error:', e?.message); // jamais de données personnelles ni de clés dans les journaux
      return res.status(500).json({ error: { code: 'server', message: 'Erreur du serveur.' } });
    }
  };
}
