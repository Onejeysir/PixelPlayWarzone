import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { IMG_BUCKET, EXT } from '../../../shared/constants.js';
import { categoryType } from '../../../shared/product.js';
import { SPEC_FIELDS, checkImages, friendly, newSlug, validateProduct } from '../../lib/admin.js';
import { compressImage } from '../../lib/images.js';
import { Msg, unwrap, useQuery, Wait } from '../parts.jsx';

const blank = (threshold = '3') => ({ name: '', reference: '', description: '', category_id: '', price: '', promotional_price: '', stock_quantity: '0', stock_alert_threshold: threshold, condition: 'new', availability_enabled: true, featured: false, specs: {}, stock_reason: '' });
const toForm = (p) => ({ name: p.name, reference: p.reference, description: p.description || '', category_id: p.category_id, price: String(p.price), promotional_price: p.promotional_price == null ? '' : String(p.promotional_price), stock_quantity: String(p.stock_quantity), stock_alert_threshold: String(p.stock_alert_threshold), condition: p.condition, availability_enabled: p.availability_enabled, featured: p.featured, specs: p.specifications || {}, stock_reason: '' });
const pub = (path) => supabase.storage.from(IMG_BUCKET).getPublicUrl(path).data.publicUrl;

export default function ProductForm() {
  const { id } = useParams(), edit = !!id, nav = useNavigate();
  const cats = useQuery(async () => unwrap(await supabase.from('categories').select('id,name,slug,parent_id').order('name')));
  const prod = useQuery(async () => (edit ? unwrap(await supabase.from('products').select('*, product_images(id,storage_path,is_primary,display_order)').eq('id', id).single()) : null), [id]);
  const [f, setF] = useState(null), [err, setErr] = useState({}), [files, setFiles] = useState([]), [busy, setBusy] = useState(false), [m, setM] = useState(null);
  useEffect(() => {
    if (edit) { if (prod.data) setF(toForm(prod.data)); return; }
    supabase.from('site_settings').select('stock_alert_default').eq('id', 1).maybeSingle().then(({ data }) => setF(blank(String(data?.stock_alert_default ?? 3))));
  }, [prod.data, edit]);
  const w = Wait({ q: cats }) || (edit ? Wait({ q: prod }) : null);
  if (w) return <><h1>{edit ? 'Modifier le produit' : 'Ajouter un produit'}</h1>{w}</>;
  if (!f) return <p role="status">Chargement…</p>;

  const byId = new Map(cats.data.map((c) => [c.id, c])), type = f.category_id ? categoryType(byId.get(f.category_id), byId) : null;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const setSpec = (k) => (e) => setF({ ...f, specs: { ...f.specs, [k]: e.target.value } });
  const E = ({ k }) => <p className="err" role="alert">{err[k]}</p>;
  const imgs = edit ? [...prod.data.product_images].sort((a, b) => (b.is_primary - a.is_primary) || a.display_order - b.display_order) : [];

  const save = async (e) => {
    e.preventDefault(); setM(null);
    const er = validateProduct(f); setErr(er); if (Object.keys(er).length) return;
    const chk = checkImages(files); if (!chk.ok) return setM({ type: 'error', text: chk.errors.join(' ') });
    setBusy(true);
    try {
      const specifications = Object.fromEntries(Object.entries(f.specs).filter(([, v]) => String(v).trim()));
      const row = { name: f.name.trim(), reference: f.reference.trim(), description: f.description.trim(), category_id: f.category_id, price: Number(f.price), promotional_price: f.promotional_price === '' ? null : Number(f.promotional_price), stock_alert_threshold: Number(f.stock_alert_threshold), condition: f.condition, availability_enabled: f.availability_enabled, featured: f.featured, specifications };
      let pid = id;
      if (!edit) pid = unwrap(await supabase.from('products').insert({ ...row, slug: newSlug(f.name), stock_quantity: Number(f.stock_quantity) }).select('id').single()).id;
      else {
        unwrap(await supabase.from('products').update(row).eq('id', id).select('id').single());
        if (Number(f.stock_quantity) !== prod.data.stock_quantity) unwrap(await supabase.rpc('adjust_stock', { p_product: id, p_new: Number(f.stock_quantity), p_reason: f.stock_reason.trim() || 'Modification depuis la fiche produit' }));
      }
      const hasPrimary = imgs.some((i) => i.is_primary);
      let order = Math.max(-1, ...imgs.map((i) => i.display_order)) + 1;
      for (const [i, file] of files.entries()) {
        const blob = await compressImage(file), path = `${pid}/${crypto.randomUUID()}.${EXT[blob.type]}`;
        const up = await supabase.storage.from(IMG_BUCKET).upload(path, blob, { contentType: blob.type, upsert: false });
        if (up.error) throw new Error(`Produit enregistré, mais une image n'a pas pu être envoyée : ${up.error.message}`);
        unwrap(await supabase.from('product_images').insert({ product_id: pid, storage_path: path, is_primary: !hasPrimary && i === 0, display_order: order++ }).select('id').single());
      }
      nav('/admin/products', { state: { flash: edit ? 'Produit modifié.' : 'Produit ajouté : il apparaît automatiquement sur le site.' } });
    } catch (x) { setM({ type: 'error', text: friendly(x) }); } finally { setBusy(false); }
  };
  const imgAct = async (fn, ok) => { try { await fn(); setM({ type: 'ok', text: ok }); prod.reload(); } catch (x) { setM({ type: 'error', text: friendly(x) }); } };
  const makePrimary = (i) => imgAct(async () => { unwrap(await supabase.from('product_images').update({ is_primary: false }).eq('product_id', id).select('id')); unwrap(await supabase.from('product_images').update({ is_primary: true }).eq('id', i.id).select('id')); }, 'Image principale modifiée.');
  const delImg = (i) => window.confirm('Supprimer cette image ?') && imgAct(async () => { unwrap(await supabase.from('product_images').delete().eq('id', i.id).select('id')); await supabase.storage.from(IMG_BUCKET).remove([i.storage_path]); }, 'Image supprimée.');

  return (
    <>
      <p><Link to="/admin/products">← Produits</Link></p>
      <h1>{edit ? 'Modifier le produit' : 'Ajouter un produit'}</h1><Msg m={m} />
      <form className="adm-form" onSubmit={save} noValidate>
        <fieldset><legend>Informations</legend>
          <div className="fld"><label htmlFor="name">Nom du produit *</label><input id="name" value={f.name} onChange={set('name')} /><E k="name" /></div>
          <div className="fld"><label htmlFor="reference">Référence unique *</label><input id="reference" value={f.reference} onChange={set('reference')} /><E k="reference" /></div>
          <div className="fld"><label htmlFor="category_id">Catégorie *</label><select id="category_id" value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value, specs: {} })}><option value="">Choisir…</option>{cats.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><E k="category_id" /></div>
          <div className="fld"><label htmlFor="description">Description</label><textarea id="description" rows="4" value={f.description} onChange={set('description')} /></div>
          <div className="fld"><label htmlFor="condition">État *</label><select id="condition" value={f.condition} onChange={set('condition')}><option value="new">Neuf</option><option value="used">Occasion</option></select></div>
        </fieldset>
        {type && <fieldset><legend>Caractéristiques</legend>{SPEC_FIELDS[type].map(([k, label, opt]) => (
          <div className="fld" key={k}><label htmlFor={`sp_${k}`}>{label}</label>
            {Array.isArray(opt) ? <select id={`sp_${k}`} value={f.specs[k] || ''} onChange={setSpec(k)}><option value="">—</option>{opt.map((o) => <option key={o}>{o}</option>)}</select>
              : opt === 'textarea' ? <textarea id={`sp_${k}`} rows="3" value={f.specs[k] || ''} onChange={setSpec(k)} /> : <input id={`sp_${k}`} value={f.specs[k] || ''} onChange={setSpec(k)} />}</div>))}</fieldset>}
        <fieldset><legend>Prix et stock</legend>
          <div className="fld"><label htmlFor="price">Prix de vente (FCFA) *</label><input id="price" inputMode="numeric" value={f.price} onChange={set('price')} /><E k="price" /></div>
          <div className="fld"><label htmlFor="promotional_price">Prix promotionnel (facultatif)</label><input id="promotional_price" inputMode="numeric" value={f.promotional_price} onChange={set('promotional_price')} /><E k="promotional_price" /></div>
          <div className="fld"><label htmlFor="stock_quantity">Quantité en stock *</label><input id="stock_quantity" inputMode="numeric" value={f.stock_quantity} onChange={set('stock_quantity')} /><E k="stock_quantity" /></div>
          {edit && Number(f.stock_quantity) !== prod.data.stock_quantity && <div className="fld"><label htmlFor="stock_reason">Motif du changement de stock</label><input id="stock_reason" value={f.stock_reason} onChange={set('stock_reason')} placeholder="Réception de stock, correction…" /></div>}
          <div className="fld"><label htmlFor="stock_alert_threshold">Seuil d'alerte de stock *</label><input id="stock_alert_threshold" inputMode="numeric" value={f.stock_alert_threshold} onChange={set('stock_alert_threshold')} /><E k="stock_alert_threshold" /></div>
          <label className="chk"><input type="checkbox" checked={f.availability_enabled} onChange={set('availability_enabled')} /> Produit disponible à la vente (décochez pour le déclarer temporairement indisponible)</label>
          <label className="chk"><input type="checkbox" checked={f.featured} onChange={set('featured')} /> Produit mis en avant sur l'accueil</label>
        </fieldset>
        <fieldset><legend>Images</legend>
          {imgs.length > 0 && <ul className="imgs">{imgs.map((i) => <li key={i.id}><img src={pub(i.storage_path)} alt="" />{i.is_primary ? <strong>Principale</strong> : <button type="button" className="linkbtn" onClick={() => makePrimary(i)}>Définir principale</button>}<button type="button" className="linkbtn danger" onClick={() => delImg(i)}>Supprimer</button></li>)}</ul>}
          <div className="fld"><label htmlFor="files">{edit ? 'Ajouter des images' : 'Image principale puis images secondaires'}</label><input id="files" type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(e) => setFiles([...e.target.files])} />
            <p className="hint">JPEG, PNG ou WebP, 5 Mo max chacune. {files.length > 0 && `${files.length} fichier(s) sélectionné(s).`}</p></div>
        </fieldset>
        <button className="btn" disabled={busy}>{busy ? 'Enregistrement…' : edit ? 'Enregistrer les modifications' : 'Ajouter le produit'}</button>
      </form>
    </>
  );
}
