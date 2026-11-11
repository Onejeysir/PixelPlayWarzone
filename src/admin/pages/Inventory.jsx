import { useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { stockStatus } from '../../../shared/product.js';
import { MOVEMENT_REASONS, fmtDate, friendly } from '../../lib/admin.js';
import { Badge, Msg, unwrap, useQuery, Wait } from '../parts.jsx';

function Row({ p, done, say }) {
  const [qty, setQty] = useState(String(p.stock_quantity)), [thr, setThr] = useState(String(p.stock_alert_threshold)), [why, setWhy] = useState(MOVEMENT_REASONS[0]);
  const st = stockStatus(p.stock_quantity, p.stock_alert_threshold, p.availability_enabled);
  const save = async () => {
    try {
      if (!/^\d+$/.test(qty) || !/^\d+$/.test(thr)) throw new Error('Quantité et seuil : nombres entiers (0 ou plus).');
      if (Number(qty) !== p.stock_quantity) unwrap(await supabase.rpc('adjust_stock', { p_product: p.id, p_new: Number(qty), p_reason: why }));
      if (Number(thr) !== p.stock_alert_threshold) unwrap(await supabase.from('products').update({ stock_alert_threshold: Number(thr) }).eq('id', p.id).select('id').single());
      say({ type: 'ok', text: `Stock de « ${p.name} » mis à jour.` }); done();
    } catch (e) { say({ type: 'error', text: friendly(e) }); }
  };
  const toggle = async () => { try { unwrap(await supabase.from('products').update({ availability_enabled: !p.availability_enabled }).eq('id', p.id).select('id').single()); say({ type: 'ok', text: p.availability_enabled ? 'Produit désactivé (temporairement indisponible).' : 'Produit réactivé.' }); done(); } catch (e) { say({ type: 'error', text: friendly(e) }); } };
  return (
    <tr>
      <td data-label="Produit"><strong>{p.name}</strong><br /><small>{p.reference}</small></td><td data-label="Statut"><Badge status={st} /></td><td data-label="Stock actuel">{p.stock_quantity}</td>
      <td data-label="Nouveau stock"><input aria-label={`Nouveau stock de ${p.name}`} type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)} /></td>
      <td data-label="Motif"><select aria-label="Motif" value={why} onChange={(e) => setWhy(e.target.value)}>{MOVEMENT_REASONS.map((r) => <option key={r}>{r}</option>)}</select></td>
      <td data-label="Seuil"><input aria-label={`Seuil d'alerte de ${p.name}`} type="number" min="0" value={thr} onChange={(e) => setThr(e.target.value)} /></td>
      <td data-label="Actions" className="acts"><button type="button" className="btn sm" onClick={save}>Enregistrer</button><button type="button" className="linkbtn" onClick={toggle}>{p.availability_enabled ? 'Désactiver' : 'Réactiver'}</button></td>
    </tr>
  );
}

export default function Inventory() {
  const [m, setM] = useState(null), [sel, setSel] = useState('');
  const q = useQuery(async () => unwrap(await supabase.from('products').select('id,name,reference,stock_quantity,stock_alert_threshold,availability_enabled').is('archived_at', null).order('name')));
  const mv = useQuery(async () => {
    let r = supabase.from('stock_movements').select('id,previous_quantity,changed_quantity,new_quantity,reason,created_at,products(name,reference),profiles(full_name)').order('created_at', { ascending: false }).limit(100);
    if (sel) r = r.eq('product_id', sel);
    return unwrap(await r);
  }, [sel]);
  const refresh = () => { q.reload(); mv.reload(); };
  return (
    <>
      <h1>Gestion des stocks</h1>
      <p className="hint">Le stock n'est jamais décrémenté automatiquement : après confirmation d'une commande sur WhatsApp, enregistrez la sortie ici (motif « Vente confirmée »).</p>
      <Msg m={m} />
      {Wait({ q }) || (
        <table className="adm-table"><thead><tr><th>Produit</th><th>Statut</th><th>Stock</th><th>Nouveau stock</th><th>Motif</th><th>Seuil</th><th>Actions</th></tr></thead>
          <tbody>{q.data.map((p) => <Row key={p.id} p={p} done={refresh} say={setM} />)}</tbody></table>
      )}
      <h2>Historique des mouvements</h2>
      <label>Produit<select value={sel} onChange={(e) => setSel(e.target.value)}><option value="">Tous (100 derniers)</option>{(q.data || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      {Wait({ q: mv }) || (mv.data.length === 0 ? <p className="hint">Aucun mouvement enregistré.</p> : (
        <table className="adm-table"><thead><tr><th>Date</th><th>Produit</th><th>Avant</th><th>Variation</th><th>Après</th><th>Motif</th><th>Par</th></tr></thead>
          <tbody>{mv.data.map((x) => <tr key={x.id}><td data-label="Date">{fmtDate(x.created_at)}</td><td data-label="Produit">{x.products?.name}</td><td data-label="Avant">{x.previous_quantity}</td><td data-label="Variation">{x.changed_quantity > 0 ? `+${x.changed_quantity}` : x.changed_quantity}</td><td data-label="Après">{x.new_quantity}</td><td data-label="Motif">{x.reason}</td><td data-label="Par">{x.profiles?.full_name || '—'}</td></tr>)}</tbody></table>
      ))}
    </>
  );
}
