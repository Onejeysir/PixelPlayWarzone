import { Fragment, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { PHOTO_BUCKET } from '../../../shared/constants.js';
import { REQUEST_STATUS, fmtDate, friendly, toWaNumber } from '../../lib/admin.js';
import { formatPrice } from '../../lib/whatsapp.js';
import { useAdmin } from '../AdminContext.jsx';
import { Msg, Pager, unwrap, useQuery, Wait } from '../parts.jsx';

const PAGE = 15;
export function RequestList() {
  const [f, setF] = useState({ q: '', status: '' }), [page, setPage] = useState(1);
  const q = useQuery(async () => unwrap(await supabase.from('device_purchase_requests').select('id,reference,customer_name,phone,device_type,brand,model,status,created_at').order('created_at', { ascending: false })));
  const t = f.q.trim().toLowerCase();
  const rows = (q.data || []).filter((x) => (!f.status || x.status === f.status) && (!t || [x.reference, x.customer_name, x.phone, x.brand, x.model].some((v) => String(v).toLowerCase().includes(t))));
  const pages = Math.max(1, Math.ceil(rows.length / PAGE)), cur = Math.min(page, pages);
  return (
    <>
      <h1>Demandes de rachat</h1>
      <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <label>Recherche (réf., nom, téléphone, modèle)<input type="search" value={f.q} onChange={(e) => { setF({ ...f, q: e.target.value }); setPage(1); }} /></label>
        <label>Statut<select value={f.status} onChange={(e) => { setF({ ...f, status: e.target.value }); setPage(1); }}><option value="">Tous</option>{Object.entries(REQUEST_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      </form>
      {Wait({ q }) || (rows.length === 0 ? <p className="hint">Aucune demande.</p> : (
        <>
          <table className="adm-table"><thead><tr><th>Réf.</th><th>Date</th><th>Vendeur</th><th>Appareil</th><th>Statut</th><th /></tr></thead>
            <tbody>{rows.slice((cur - 1) * PAGE, cur * PAGE).map((x) => <tr key={x.id}><td data-label="Réf.">{x.reference}</td><td data-label="Date">{fmtDate(x.created_at)}</td><td data-label="Vendeur">{x.customer_name}<br /><small>{x.phone}</small></td><td data-label="Appareil">{x.brand} {x.model}</td><td data-label="Statut">{REQUEST_STATUS[x.status]}</td><td><Link to={`/admin/purchase-requests/${x.id}`}>Consulter</Link></td></tr>)}</tbody></table>
          <Pager page={cur} pages={pages} onPage={setPage} />
        </>
      ))}
    </>
  );
}

export function RequestDetail() {
  const { id } = useParams(), { isAdmin } = useAdmin(), nav = useNavigate();
  const [m, setM] = useState(null), [big, setBig] = useState(null), [notes, setNotes] = useState(null);
  const q = useQuery(async () => {
    const r = unwrap(await supabase.from('device_purchase_requests').select('*, device_purchase_photos(*)').eq('id', id).single());
    // Liens signés TEMPORAIRES (5 min) pour le bucket privé ; « Régénérer » en crée de nouveaux.
    const photos = await Promise.all((r.device_purchase_photos || []).map(async (p) => ({ ...p, url: (await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(p.storage_path, 300)).data?.signedUrl || null })));
    return { ...r, photos };
  }, [id]);
  const w = Wait({ q }); if (w) return <><p><Link to="/admin/purchase-requests">← Demandes</Link></p>{w}</>;
  const r = q.data, wa = toWaNumber(r.phone);
  const run = async (fn, ok) => { try { await fn(); setM({ type: 'ok', text: ok }); q.reload(); } catch (e) { setM({ type: 'error', text: friendly(e) }); } };
  const download = async (p) => { const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(p.storage_path, 60, { download: p.original_filename || true }); if (error) setM({ type: 'error', text: friendly(error) }); else window.open(data.signedUrl, '_blank', 'noopener'); };
  const del = () => window.confirm('Supprimer définitivement cette demande et ses photos ? Cette opération ne pourra pas être annulée.') && run(async () => {
    const paths = r.photos.map((p) => p.storage_path); if (paths.length) await supabase.storage.from(PHOTO_BUCKET).remove(paths);
    unwrap(await supabase.from('device_purchase_requests').delete().eq('id', id).select('id').single()); nav('/admin/purchase-requests');
  }, 'Demande supprimée.');
  const rows = [['Référence', r.reference], ['Identifiant', r.id], ['Date', fmtDate(r.created_at)], ['Vendeur', r.customer_name], ['Téléphone', r.phone], ['Localisation', r.location], ['Type', r.device_type], ['Marque / modèle', `${r.brand} ${r.model}`], ['État', r.condition], ['Prix souhaité', r.expected_price != null ? formatPrice(r.expected_price) : 'non renseigné'], ['Description', r.description || '—'], ...Object.entries(r.specifications || {})];
  return (
    <>
      <p><Link to="/admin/purchase-requests">← Demandes</Link></p>
      <h1>Demande {r.reference}</h1><Msg m={m} />
      <dl>{rows.map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}</dl>
      <p className="row">
        <label>Statut<select value={r.status} onChange={(e) => run(async () => unwrap(await supabase.from('device_purchase_requests').update({ status: e.target.value }).eq('id', id).select('id').single()), 'Statut mis à jour.')}>{Object.entries(REQUEST_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        {wa ? <a className="btn wa" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${wa}?text=${encodeURIComponent(`Bonjour ${r.customer_name}, ici PIXEL PLAY, au sujet de votre demande ${r.reference} (${r.brand} ${r.model}).`)}`}>Contacter sur WhatsApp</a> : <span className="hint">Numéro non exploitable pour WhatsApp.</span>}
      </p>
      <h2>Photos ({r.photos.length})</h2>
      {r.photos.length === 0 ? <p className="hint">Aucune photo.</p> : (
        <>
          <ul className="imgs">{r.photos.map((p) => <li key={p.id}>{p.url ? <button type="button" className="imgbtn" onClick={() => setBig(p.url)} aria-label="Agrandir la photo"><img src={p.url} alt="Photo de l'appareil" /></button> : <span className="hint">Lien indisponible</span>}
            <small>{p.mime_type} · {Math.round(p.file_size / 1024)} Ko</small>{isAdmin && <button type="button" className="linkbtn" onClick={() => download(p)}>Télécharger</button>}</li>)}</ul>
          <button type="button" className="btn ghostv sm" onClick={q.reload}>Régénérer les liens (expirent après 5 min)</button>
        </>
      )}
      <h2>Note interne</h2><p className="hint">Jamais visible publiquement.</p>
      <textarea aria-label="Note interne" rows="4" value={notes ?? r.internal_notes ?? ''} onChange={(e) => setNotes(e.target.value)} />
      <p><button type="button" className="btn" onClick={() => run(async () => unwrap(await supabase.from('device_purchase_requests').update({ internal_notes: notes ?? r.internal_notes ?? '' }).eq('id', id).select('id').single()), 'Note enregistrée.')}>Enregistrer la note</button>{isAdmin && <> <button type="button" className="linkbtn danger" onClick={del}>Supprimer la demande</button></>}</p>
      {big && <div className="lightbox" role="dialog" aria-modal="true" aria-label="Photo en grand" onClick={() => setBig(null)}><img src={big} alt="Photo de l'appareil en grand format" /><button type="button" className="btn" onClick={() => setBig(null)}>Fermer</button></div>}
    </>
  );
}
