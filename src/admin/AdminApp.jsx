import { useState } from 'react';
import { Navigate, NavLink, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import './admin.css';
import { supabase } from '../lib/supabase.js';
import { AdminProvider, useAdmin } from './AdminContext.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Products from './pages/Products.jsx';
import ProductForm from './pages/ProductForm.jsx';
import Inventory from './pages/Inventory.jsx';
import Categories from './pages/Categories.jsx';
import { RequestList, RequestDetail } from './pages/Requests.jsx';
import Settings from './pages/Settings.jsx';

function Login() {
  const { session, profile, loading } = useAdmin();
  const nav = useNavigate();
  const [f, setF] = useState({ email: '', password: '' }), [show, setShow] = useState(false), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  if (!supabase) return <div className="adm-center"><h1>Administration</h1><p className="notice error">Supabase n'est pas activé : l'administration sera disponible après sa configuration (VITE_ENABLE_SUPABASE=true, URL et clé publique — voir le README).</p></div>;
  if (!loading && session && profile) return <Navigate to="/admin" replace />;
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    const { error } = await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password });
    setBusy(false);
    if (error) setErr('Identifiants incorrects.'); // message volontairement générique
    else nav('/admin', { replace: true });
  };
  return (
    <div className="adm-center">
      <form className="adm-login" onSubmit={submit}>
        <h1>Administration</h1><p className="hint">Accès réservé au personnel PIXEL PLAY.</p>
        <div className="fld"><label htmlFor="em">Adresse e-mail</label><input id="em" type="email" autoComplete="username" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div className="fld"><label htmlFor="pw">Mot de passe</label>
          <div className="pwrow"><input id="pw" type={show ? 'text' : 'password'} autoComplete="current-password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
            <button type="button" className="btn ghostv sm" aria-pressed={show} onClick={() => setShow(!show)}>{show ? 'Masquer' : 'Afficher'}</button></div></div>
        {err && <p className="notice error" role="alert">{err}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}</button>
      </form>
    </div>
  );
}

function Layout() {
  const { profile, signOut, isAdmin } = useAdmin();
  const [open, setOpen] = useState(false);
  const links = [['/admin', 'Tableau de bord', true], ['/admin/products', 'Gestion des produits'], ['/admin/products/new', 'Ajouter un produit'], ['/admin/inventory', 'Gestion des stocks'], ['/admin/categories', 'Catégories'], ['/admin/purchase-requests', 'Demandes de rachat'], ...(isAdmin ? [['/admin/settings', 'Paramètres']] : [])];
  return (
    <div className={`adm${open ? ' open' : ''}`}>
      <header className="adm-top"><button type="button" className="burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}><span /></button>
        <strong>PIXEL PLAY · Admin</strong><span className="adm-user">{profile.full_name || 'Compte'} <em>({profile.role})</em></span></header>
      <nav className="adm-side" aria-label="Administration" onClick={() => setOpen(false)}>
        {links.map(([to, label, end]) => <NavLink key={to} to={to} end={end}>{label}</NavLink>)}
        <button type="button" className="linkbtn out" onClick={signOut}>Déconnexion</button>
      </nav>
      <main className="adm-main"><Outlet /></main>
    </div>
  );
}

function Guard() {
  const { loading, session, profile, signOut } = useAdmin();
  if (loading) return <p role="status" className="adm-center">Chargement…</p>;
  if (!session) return <Navigate to="/admin/login" replace />;
  if (!profile) return <div className="adm-center"><h1>Accès non autorisé</h1><p>Ce compte n'a pas de droits d'administration.</p><button type="button" className="btn" onClick={signOut}>Se déconnecter</button></div>;
  return <Layout />;
}

export default function AdminApp() {
  return (
    <AdminProvider>
      <Routes>
        <Route path="/admin/login" element={<Login />} />
        <Route element={<Guard />}>
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/products" element={<Products />} />
          <Route path="/admin/products/new" element={<ProductForm />} />
          <Route path="/admin/products/:id" element={<ProductForm />} />
          <Route path="/admin/inventory" element={<Inventory />} />
          <Route path="/admin/categories" element={<Categories />} />
          <Route path="/admin/purchase-requests" element={<RequestList />} />
          <Route path="/admin/purchase-requests/:id" element={<RequestDetail />} />
          <Route path="/admin/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminProvider>
  );
}
