import { useEffect, useState } from 'react';
import { STATUS_LABEL } from '../../shared/product.js';
import { friendly } from '../lib/admin.js';

export const unwrap = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

export function useQuery(fn, deps = []) {
  const [s, setS] = useState({ data: null, loading: true, error: null });
  const [n, setN] = useState(0);
  useEffect(() => {
    let dead = false;
    setS((o) => ({ ...o, loading: true, error: null }));
    Promise.resolve().then(fn).then((data) => !dead && setS({ data, loading: false, error: null })).catch((e) => !dead && setS({ data: null, loading: false, error: friendly(e) }));
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, ...deps]);
  return { ...s, reload: () => setN((x) => x + 1) };
}

export const Badge = ({ status }) => <span className={`badge-s ${status}`}>{STATUS_LABEL[status]}</span>;
export const Msg = ({ m }) => (m ? <p className={`notice ${m.type}`} role={m.type === 'error' ? 'alert' : 'status'}>{m.text}</p> : null);
export const Wait = ({ q }) => (q.loading ? <p role="status">Chargement…</p> : q.error ? <p className="notice error" role="alert">{q.error} <button type="button" className="linkbtn" onClick={q.reload}>Réessayer</button></p> : null);

export function InlineNumber({ value, onSave, label }) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);
  return (
    <form className="inl" onSubmit={(e) => { e.preventDefault(); onSave(v); }}>
      <input aria-label={label} type="number" min="0" inputMode="numeric" value={v} onChange={(e) => setV(e.target.value)} />
      {v !== String(value) && <button className="btn sm">OK</button>}
    </form>
  );
}

export function Pager({ page, pages, onPage }) {
  if (pages <= 1) return null;
  return <p className="row" aria-label="Pagination"><button type="button" className="btn ghostv sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>← Précédent</button><span>Page {page} / {pages}</span><button type="button" className="btn ghostv sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Suivant →</button></p>;
}
