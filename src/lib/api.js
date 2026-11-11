// Appels aux fonctions serveur Vercel (/api). Erreurs normalisées avec un message affichable.
const NET = 'Connexion interrompue : vérifiez votre connexion puis réessayez.';
const fail = (message, code) => Object.assign(new Error(message), { code });

async function call(path, body, f = globalThis.fetch) {
  let res;
  try { res = await f(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
  catch { throw fail(NET, 'network'); }
  let json = null; try { json = await res.json(); } catch { /* corps vide ou non JSON */ }
  if (!res.ok) throw fail(json?.error?.message || 'Impossible de préparer la demande.', json?.error?.code || 'server');
  return json;
}
export const checkCart = (ids, f) => call('/api/cart/check', { ids }, f).then((j) => j.products);
export const prepareUploads = (photos, f) => call('/api/purchase-requests/prepare', { photos }, f);
export const submitRequest = (payload, f) => call('/api/purchase-requests/submit', payload, f);

export function uploadErrorMessage(e) {
  const m = String(e?.message || '');
  if (/fetch|network|failed to|load failed/i.test(m)) return NET;
  if (/exceed|too large|size|payload/i.test(m)) return 'Taille maximale dépassée pour cette photo.';
  if (/mime|type|format/i.test(m)) return "Format d'image non accepté.";
  if (/expired|jwt|token|unauthor/i.test(m)) return 'Autorisation de téléversement expirée : réessayez.';
  return 'Échec du téléversement de cette photo.';
}
