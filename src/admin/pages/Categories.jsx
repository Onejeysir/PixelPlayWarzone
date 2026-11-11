import { useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { slugify, friendly } from '../../lib/admin.js';
import { TYPE_BY_SLUG } from '../../../shared/product.js';
import { useAdmin } from '../AdminContext.jsx';
import { Msg, unwrap, useQuery, Wait } from '../parts.jsx';

export default function Categories() {
  const { isAdmin } = useAdmin();
  const q = useQuery(async () => unwrap(await supabase.from('categories').select('*').order('name')));
  const [f, setF] = useState({ name: '', parent_id: '', description: '' }), [m, setM] = useState(null);
  const run = async (fn, ok) => { try { await fn(); setM({ type: 'ok', text: ok }); q.reload(); } catch (e) { setM({ type: 'error', text: friendly(e) }); } };
  const add = (e) => { e.preventDefault(); const slug = slugify(f.name); if (!slug) return setM({ type: 'error', text: 'Nom invalide.' }); run(async () => { unwrap(await supabase.from('categories').insert({ name: f.name.trim(), slug, parent_id: f.parent_id || null, description: f.description.trim() || null }).select('id').single()); setF({ name: '', parent_id: '', description: '' }); }, 'Catégorie ajoutée.'); };
  const rename = (c) => { const name = window.prompt('Nouveau nom', c.name); if (name?.trim()) run(async () => unwrap(await supabase.from('categories').update({ name: name.trim() }).eq('id', c.id).select('id').single()), 'Catégorie renommée.'); };
  const del = (c) => window.confirm(`Supprimer la catégorie « ${c.name} » ?`) && run(async () => unwrap(await supabase.from('categories').delete().eq('id', c.id).select('id').single()), 'Catégorie supprimée.');
  return (
    <>
      <h1>Catégories</h1><Msg m={m} />
      <p className="hint">Les 4 catégories de base (consoles, jeux physiques, jeux numériques, appareils) pilotent l'affichage du site : une sous-catégorie hérite du type de son parent. Seul un administrateur peut modifier les catégories.</p>
      {Wait({ q }) || (
        <ul className="plain">{q.data.map((c) => { const core = !!TYPE_BY_SLUG[c.slug]; return (
          <li key={c.id}><strong>{c.name}</strong> <small>({c.slug}{c.parent_id ? ` · sous-catégorie de ${q.data.find((x) => x.id === c.parent_id)?.name}` : ''})</small>
            {isAdmin && <> <button type="button" className="linkbtn" onClick={() => rename(c)}>Renommer</button>{!core && <button type="button" className="linkbtn danger" onClick={() => del(c)}>Supprimer</button>}</>}</li>); })}</ul>
      )}
      {isAdmin && <form className="adm-form" onSubmit={add}><h2>Ajouter une catégorie</h2>
        <div className="fld"><label htmlFor="cn">Nom *</label><input id="cn" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div className="fld"><label htmlFor="cp">Catégorie parente</label><select id="cp" value={f.parent_id} onChange={(e) => setF({ ...f, parent_id: e.target.value })}><option value="">Aucune (niveau principal)</option>{(q.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div className="fld"><label htmlFor="cd">Description</label><input id="cd" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <button className="btn">Ajouter</button></form>}
    </>
  );
}
