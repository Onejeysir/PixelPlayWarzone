import { Fragment, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CONFIG } from '../lib/config.js';
import { DEVICE_FIELDS, CAT_LABEL } from '../lib/data.js';
import { sellMessage, waUrl, formatPrice } from '../lib/whatsapp.js';
import { validateSell, validatePhotos } from '../lib/validation.js';
import { compressImage } from '../lib/images.js';
import { prepareUploads, submitRequest, uploadErrorMessage } from '../lib/api.js';
import { supabase } from '../lib/supabase.js';
import { WaIcon, usePage } from '../components/ui.jsx';

const CONDITIONS = ['Comme neuf', 'Bon état', 'État moyen', 'À réparer / pour pièces'];
const STATE = { new: '', uploading: '…', done: '✓', error: 'Échec' };

export default function Sell() {
  usePage('Vendre mon appareil', 'Proposez votre ordinateur, téléphone ou console à PIXEL PLAY pour une estimation et un éventuel rachat.');
  const [v, setV] = useState({});
  const [err, setErr] = useState({});
  const [files, setFiles] = useState([]); // { key, file, preview, blob, status, progress }
  const [photoErr, setPhotoErr] = useState('');
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | uploading | error | done
  const [notice, setNotice] = useState(null);
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);
  const ref = useRef([]), prep = useRef(null), keys = useRef(0), recap = useRef(null);
  const setF = (n) => { ref.current = n; setFiles(n); };
  const upd = (key, p) => setF(ref.current.map((x) => (x.key === key ? { ...x, ...p } : x)));
  useEffect(() => () => ref.current.forEach((f) => URL.revokeObjectURL(f.preview)), []);
  useEffect(() => { if (phase === 'done') recap.current?.focus(); }, [phase]);
  const busy = phase === 'uploading';

  const set = (e) => setV((o) => ({ ...o, [e.target.name]: e.target.value }));
  const fp = (n) => ({ id: n, name: n, value: v[n] || '', onChange: set, 'aria-invalid': err[n] ? true : undefined, 'aria-describedby': `e_${n}` });
  const Err = ({ n }) => <p className="err" id={`e_${n}`} role="alert">{err[n]}</p>;
  const fld = (n, label, req, extra = {}) => (
    <div className="fld" key={n}><label htmlFor={n}>{label}{req ? ' *' : ''}</label><input type="text" {...fp(n)} {...extra} /><Err n={n} /></div>
  );
  const choice = (n, label, req, options) => (
    <div className="fld" key={n}><label htmlFor={n}>{label}{req ? ' *' : ''}</label>
      <select {...fp(n)}><option value="">Choisir…</option>{options.map((o) => <option key={o}>{o}</option>)}</select><Err n={n} /></div>
  );

  const fields = DEVICE_FIELDS[v.category] || [];
  const collect = () => {
    const g = (k) => (v[k] || '').trim(), specs = {};
    fields.forEach((f) => (specs[f.name] = g('s_' + f.name)));
    return { name: g('name'), phone: g('phone'), location: g('location'), category: g('category'), categoryLabel: CAT_LABEL[g('category')] || '', brand: g('brand'), model: g('model'), condition: g('condition'), price: g('price').replace(/[\s.]/g, ''), serial: v.category === 'telephone' ? '' : g('serial'), description: g('description'), specs, specsList: fields.map((f) => [f.label, specs[f.name]]) };
  };

  const addPhotos = (e) => {
    const { ok, errors } = validatePhotos([...e.target.files], files.length);
    setF([...ref.current, ...ok.map((file) => ({ key: ++keys.current, file, preview: URL.createObjectURL(file), status: 'new', progress: 0 }))]);
    setPhotoErr(errors.join(' ')); setData(null); setPhase('idle'); setNotice(null); e.target.value = '';
  };
  const removePhoto = (key) => {
    const it = ref.current.find((f) => f.key === key); if (it) URL.revokeObjectURL(it.preview);
    setF(ref.current.filter((f) => f.key !== key)); setData(null); setPhase('idle'); setNotice(null);
  };

  // Envoie les photos vers le bucket PRIVÉ avec les URLs signées délivrées par le serveur.
  async function uploadAll() {
    for (const it of ref.current) if (!it.blob) upd(it.key, { blob: await compressImage(it.file) });
    const sig = ref.current.map((f) => `${f.key}:${f.blob.size}:${f.blob.type}`).join('|');
    if (!prep.current || prep.current.sig !== sig) { // nouveau jeu de photos : nouvelles autorisations
      const r = await prepareUploads(ref.current.map((f) => ({ name: f.file.name, type: f.blob.type, size: f.blob.size })));
      prep.current = { sig, ...r, map: Object.fromEntries(ref.current.map((f, i) => [f.key, r.uploads[i]])) };
      setF(ref.current.map((f) => ({ ...f, status: 'new', progress: 0 })));
    }
    const failed = [];
    for (const it of ref.current) {
      if (it.status === 'done') continue; // déjà envoyée lors d'un essai précédent
      const u = prep.current.map[it.key];
      upd(it.key, { status: 'uploading', progress: 0 });
      const { error } = await supabase.storage.from(prep.current.bucket).uploadToSignedUrl(u.path, u.token, it.blob, { contentType: it.blob.type });
      if (error) { upd(it.key, { status: 'error' }); failed.push(error); } else upd(it.key, { status: 'done', progress: 100 });
    }
    if (failed.length) throw Object.assign(new Error(uploadErrorMessage(failed[0])), { partial: failed.length });
  }

  const submit = async (e) => {
    e.preventDefault(); if (busy) return;
    const d = collect(), er = validateSell(d);
    if (supabase && !consent) er.consent = 'Acceptez l\'enregistrement de votre demande pour continuer.';
    setErr(er); setData(null);
    const first = Object.keys(er)[0];
    if (first) { document.getElementById(first)?.focus(); return; }
    if (!supabase) { // mode sans Supabase : pas d'enregistrement, message WhatsApp seul ; les photos se joignent à la main
      setData({ ...d, reference: null, photoCount: files.length, manualPhotos: true }); setPhase('done'); setNotice(null); return;
    }
    setPhase('uploading'); setNotice({ type: 'info', text: files.length ? 'Téléversement en cours…' : 'Envoi de la demande…' });
    try {
      if (files.length) await uploadAll();
      const res = await submitRequest({
        customer_name: d.name, phone: d.phone, location: d.location, device_type: d.category, brand: d.brand, model: d.model, condition: d.condition,
        specifications: { ...Object.fromEntries(d.specsList.filter(([, x]) => x)), ...(d.serial ? { 'Numéro de série': d.serial } : {}) },
        expected_price: d.price ? Number.parseInt(d.price, 10) : null, description: d.description || null,
        website: v.website || '', requestId: prep.current?.requestId, claim: prep.current?.claim,
        photos: files.length ? ref.current.map((f) => ({ path: prep.current.map[f.key].path, name: f.file.name })) : [],
      });
      setData({ ...d, reference: res.reference, photoCount: res.photos }); setPhase('done');
      setNotice({ type: 'ok', text: res.photos ? 'Photos téléversées avec succès. Demande enregistrée.' : 'Demande enregistrée.' });
    } catch (x) {
      setPhase('error');
      const left = ref.current.filter((f) => f.status !== 'done').length;
      setNotice({ type: 'error', text: `${x.partial ? `Échec du téléversement : ${left} photo(s) sur ${ref.current.length} non envoyée(s). ` : ''}${x.message} Vos informations sont conservées : cliquez sur « Réessayer l'envoi ».` });
    }
  };

  const msg = data ? sellMessage(data) : '';
  const copy = async () => { try { await navigator.clipboard.writeText(msg); setCopied(true); } catch { setNotice({ type: 'error', text: 'Copie impossible : sélectionnez le texte du message.' }); } };
  const rows = data && [...(data.reference ? [['Référence', data.reference]] : []), ['Nom', data.name], ['Téléphone', data.phone], ['Localisation', data.location], ['Catégorie', data.categoryLabel], ['Appareil', `${data.brand} ${data.model}`], ['État', data.condition], ...data.specsList.filter(([, x]) => x), ['Prix souhaité', data.price ? formatPrice(data.price) : 'non renseigné'], ['Photos', data.manualPhotos ? `${data.photoCount} à joindre dans WhatsApp` : String(data.photoCount)]];
  const done = files.filter((f) => f.status === 'done').length, pct = files.length ? Math.round((done / files.length) * 100) : 0;

  return (
    <section className="wrap pad narrow">
      <Link to="/appareils">← Achat / Vente</Link>
      <h1>Vendre mon appareil</h1>
      <p className="lead">Demande d'estimation : PIXEL PLAY étudie votre proposition. Rien n'est accepté ni acheté automatiquement.</p>
      <form onSubmit={submit} noValidate>
        <input name="website" value={v.website || ''} onChange={set} tabIndex={-1} autoComplete="off" aria-hidden="true" className="sr" />
        <fieldset><legend>Vous</legend>
          {fld('name', 'Nom complet', true, { autoComplete: 'name' })}
          {fld('phone', 'Téléphone', true, { type: 'tel', autoComplete: 'tel', inputMode: 'tel', placeholder: '6XX XX XX XX' })}
          {fld('location', 'Localisation (quartier, ville)', true)}
        </fieldset>
        <fieldset><legend>Appareil</legend>
          <div className="fld"><label htmlFor="category">Catégorie *</label>
            <select {...fp('category')}><option value="">Choisir…</option><option value="ordinateur">Ordinateur portable ou de bureau</option><option value="telephone">Téléphone portable</option><option value="console">Console de jeux vidéo</option></select><Err n="category" /></div>
          {fld('brand', 'Marque', true)}{fld('model', 'Modèle', true)}
          {choice('condition', 'État général', true, CONDITIONS)}
          {fields.map((f) => f.options ? choice('s_' + f.name, f.label, f.required, f.options) : fld('s_' + f.name, f.label, f.required))}
          {v.category !== 'telephone' && <>{fld('serial', 'Numéro de série (facultatif)', false, { autoComplete: 'off' })}<p className="hint">Inutile s'il est introuvable.</p></>}
          {fld('price', 'Prix souhaité en FCFA (facultatif)', false, { inputMode: 'numeric' })}
          <div className="fld"><label htmlFor="description">Description complémentaire</label><textarea rows="3" {...fp('description')} /></div>
        </fieldset>
        <fieldset><legend>Photos</legend>
          <p className="hint">JPEG, PNG ou WebP · {CONFIG.maxPhotos} photos max · {CONFIG.maxPhotoMB} Mo max chacune. {supabase ? <>Elles sont allégées puis téléversées dans un espace <strong>privé</strong> : seul PIXEL PLAY peut les consulter.</> : <><strong>Le site n'envoie pas les photos</strong> : après validation, vous les joindrez vous-même dans la conversation WhatsApp.</>}</p>
          <input id="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={addPhotos} aria-describedby="e_photos" />
          <p className="err" id="e_photos" role="alert">{photoErr}</p>
          <ul id="prev">{files.map((f, i) => (
            <li key={f.key} className={f.status}><img src={f.preview} alt={`Aperçu de la photo ${i + 1}`} />
              {f.status !== 'new' && <span className="st">{STATE[f.status]}</span>}
              <button type="button" disabled={busy} aria-label={`Supprimer la photo ${i + 1}`} onClick={() => removePhoto(f.key)}>×</button></li>))}</ul>
          {(busy || phase === 'error') && files.length > 0 && <><progress max="100" value={pct} aria-label="Progression du téléversement" /><p className="hint">{done}/{files.length} photo(s) téléversée(s)</p></>}
        </fieldset>
        {supabase && <div className="fld"><label className="chk"><input type="checkbox" id="consent" checked={consent} aria-invalid={err.consent ? true : undefined} onChange={(e) => setConsent(e.target.checked)} />
          <span>J'accepte que ma demande (informations et photos) soit enregistrée pour que PIXEL PLAY puisse l'étudier et me contacter. *</span></label><Err n="consent" /></div>}
        <p className="hint">Ne communiquez jamais de mot de passe ni de code de vérification.</p>
        {notice && <p className={`notice ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>{notice.text}</p>}
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Envoi en cours…' : phase === 'error' ? "Réessayer l'envoi" : 'Envoyer ma demande'}</button>
      </form>
      {phase === 'done' && data && (
        <section id="recap" ref={recap} tabIndex={-1}>
          <h2>{data.manualPhotos ? 'Demande prête' : 'Demande enregistrée'}</h2>
          <dl>{rows.map(([k, x]) => <Fragment key={k}><dt>{k}</dt><dd>{x}</dd></Fragment>)}</dl>
          <p>Il s'agit d'une demande d'estimation, non encore acceptée par PIXEL PLAY. {data.manualPhotos ? `Rien n'a été enregistré par le site : envoyez le message WhatsApp ci-dessous${data.photoCount ? ` et joignez-y vos ${data.photoCount} photo(s) dans la conversation` : ''}.` : 'Envoyez le message WhatsApp ci-dessous pour être recontacté plus vite : il contient votre référence.'}</p>
          <details><summary>Voir le message WhatsApp</summary><pre className="msg">{msg}</pre></details>
          <p className="row"><a className="btn wa" href={waUrl(msg)} target="_blank" rel="noopener noreferrer"><WaIcon /><span>Ouvrir WhatsApp</span></a>
            <button type="button" className="btn ghostv" onClick={copy}>{copied ? 'Message copié ✓' : 'Copier le message'}</button></p>
        </section>
      )}
    </section>
  );
}
