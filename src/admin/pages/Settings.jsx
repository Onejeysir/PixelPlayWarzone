import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { fmtDate, friendly } from '../../lib/admin.js';
import { useAdmin } from '../AdminContext.jsx';
import { Msg, unwrap, useQuery, Wait } from '../parts.jsx';

const FIELDS = [['business_name', 'Nom commercial'], ['whatsapp', 'Numéro WhatsApp (chiffres, avec indicatif, ex. 237697692598)'], ['phone', 'Téléphone affiché'], ['address', 'Adresse'], ['city', 'Ville, pays'], ['map_query', 'Recherche cartographique'], ['latitude', 'Latitude (facultatif)'], ['longitude', 'Longitude (facultatif)'], ['stock_alert_default', "Seuil d'alerte de stock par défaut"], ['contact_info', 'Informations de contact complémentaires']];

export default function Settings() {
  const { isAdmin } = useAdmin();
  const q = useQuery(async () => unwrap(await supabase.from('site_settings').select('*').eq('id', 1).single()));
  const staff = useQuery(async () => unwrap(await supabase.from('profiles').select('id,full_name,role,created_at').order('created_at')));
  const audit = useQuery(async () => unwrap(await supabase.from('audit_log').select('id,action,table_name,row_id,created_at,profiles(full_name)').order('created_at', { ascending: false }).limit(30)));
  const [f, setF] = useState(null), [m, setM] = useState(null);
  useEffect(() => { if (q.data) setF(Object.fromEntries(FIELDS.map(([k]) => [k, q.data[k] == null ? '' : String(q.data[k])]))); }, [q.data]);
  if (!isAdmin) return <><h1>Paramètres</h1><p className="notice error">Réservé aux administrateurs.</p></>;
  const save = async (e) => {
    e.preventDefault();
    try {
      if (!/^\d{8,15}$/.test(f.whatsapp)) throw new Error('Numéro WhatsApp : 8 à 15 chiffres, sans espace ni « + ».');
      if (!/^\d+$/.test(f.stock_alert_default)) throw new Error("Seuil d'alerte : nombre entier.");
      const num = (v) => (v === '' ? null : Number(v));
      unwrap(await supabase.from('site_settings').update({ ...f, latitude: num(f.latitude), longitude: num(f.longitude), contact_info: f.contact_info || null, stock_alert_default: Number(f.stock_alert_default) }).eq('id', 1).select('id').single());
      setM({ type: 'ok', text: 'Paramètres enregistrés : le site public les utilise dès le prochain chargement.' });
    } catch (x) { setM({ type: 'error', text: friendly(x) }); }
  };
  return (
    <>
      <h1>Paramètres</h1><Msg m={m} />
      {Wait({ q }) || !f ? null : (
        <form className="adm-form" onSubmit={save}>
          {FIELDS.map(([k, label]) => <div className="fld" key={k}><label htmlFor={k}>{label}</label><input id={k} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>)}
          <button className="btn">Enregistrer</button>
        </form>
      )}
      <h2>Comptes autorisés</h2>
      <p className="hint">Les rôles se gèrent uniquement côté serveur (SQL Editor Supabase) : voir supabase/bootstrap-first-admin.sql. Aucune inscription n'est possible depuis le site.</p>
      {Wait({ q: staff }) || <ul className="plain">{staff.data.map((s) => <li key={s.id}>{s.full_name || s.id} — <strong>{s.role}</strong></li>)}</ul>}
      <h2>Journal des opérations (30 dernières)</h2>
      {Wait({ q: audit }) || (audit.data.length === 0 ? <p className="hint">Aucune opération.</p> : <ul className="plain">{audit.data.map((a) => <li key={a.id}><small>{fmtDate(a.created_at)}</small> · {a.profiles?.full_name || 'système'} · {a.action} {a.table_name} <small>{a.row_id}</small></li>)}</ul>)}
    </>
  );
}
