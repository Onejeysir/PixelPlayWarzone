
import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';

import { Header, Footer, Fab, Toast } from './components/Layout.jsx';
import { SiteProvider } from './components/SiteContext.jsx';
import { CatalogProvider } from './components/CatalogContext.jsx';
import { CartProvider } from './components/CartContext.jsx';

import Home from './pages/Home.jsx';
import { Games, Digital, Physical, Consoles, Devices } from './pages/Catalogs.jsx';
import Cart from './pages/Cart.jsx';
import Sell from './pages/Sell.jsx';
import { Contact, Product, NotFound } from './pages/Misc.jsx';

const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));

function PublicShell() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <a className="skip" href="#main">
        Aller au contenu
      </a>

      <Header />

      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/jeux" element={<Games />} />
          <Route path="/jeux/numeriques" element={<Digital />} />
          <Route path="/jeux/physiques" element={<Physical />} />
          <Route path="/consoles" element={<Consoles />} />
          <Route path="/appareils" element={<Devices />} />
          <Route path="/vendre-mon-appareil" element={<Sell />} />
          <Route path="/panier" element={<Cart />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/produit/:id" element={<Product />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />
      <Fab />
      <Toast />
    </>
  );
}

export default function App() {
  const { pathname } = useLocation();

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return (
      <Suspense
        fallback={
          <p role="status" style={{ padding: 24 }}>
            Chargement…
          </p>
        }
      >
        <AdminApp />
      </Suspense>
    );
  }

  return (
    <SiteProvider>
      <CatalogProvider>
        <CartProvider>
          <PublicShell />
        </CartProvider>
      </CatalogProvider>
    </SiteProvider>
  );
}
