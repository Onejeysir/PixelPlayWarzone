import { Link } from 'react-router-dom';
import { CONFIG } from '../lib/config.js';
import { waUrl, GENERIC } from '../lib/whatsapp.js';
import { ProductCard, WaIcon, usePage } from '../components/ui.jsx';
import { mapUrl } from '../components/Layout.jsx';
import { useCatalog } from '../components/CatalogContext.jsx';

const AXES = [
  ['/jeux', '01', 'Jeux vidéo', 'Jeux numériques et jeux physiques sur disque, PS4 et PS5.', 'Voir les jeux →'],
  ['/consoles', '02', 'Consoles', "PlayStation 4 et PlayStation 5, neuves ou d'occasion.", 'Voir les consoles →'],
  ['/appareils', '03', 'Achat / Vente', 'Ordinateurs, téléphones et consoles : vendez ou découvrez des appareils.', 'Voir les appareils →'],
];
const STEPS = ['Choisissez la catégorie de votre appareil et remplissez le formulaire.', "Ajoutez vos photos : elles sont téléversées de façon sécurisée à l'envoi de la demande.", "WhatsApp s'ouvre avec votre message prêt à envoyer, liens des photos inclus.", 'PIXEL PLAY consulte vos photos et vous répond avec une estimation.'];
const FAQ = [
  ['Comment commander ?', "Cliquez sur « Commander sur WhatsApp » : un message avec le produit et son prix s'ouvre dans WhatsApp. Aucune inscription n'est nécessaire."],
  ['Puis-je payer en ligne ?', 'Non, le site ne gère aucun paiement. Disponibilité, prix actuel et modalités sont confirmés avec PIXEL PLAY sur WhatsApp.'],
  ['Mes photos sont-elles envoyées avec ma demande ?', "Oui, par lien : le site téléverse vos photos de façon sécurisée au moment de l'envoi, puis ajoute leurs liens au message WhatsApp. WhatsApp ne joint pas les fichiers lui-même."],
  ["Mon appareil est-il racheté dès l'envoi du formulaire ?", "Non. Il s'agit d'une demande d'estimation, étudiée et validée par PIXEL PLAY."],
];

export default function Home() {
  const { products } = useCatalog();
  const top = [...products].filter((p) => p.stock).sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)).slice(0, 4);
  usePage('Jeux vidéo, consoles PS4 PS5 et high-tech à Douala', "PIXEL PLAY à Bonamoussadi, Douala : jeux vidéo, consoles PS4 et PS5, achat et vente d'appareils électroniques. Commande sur WhatsApp.");
  return (
    <>
      <section className="hero"><div className="wrap hero-in">
        <div>
          <p className="eyebrow">Bonamoussadi · Douala</p>
          <h1>Jeux, consoles<br />et high-tech.</h1>
          <p className="lead">PIXEL PLAY vend des jeux vidéo et des consoles PS4 / PS5, et rachète vos appareils électroniques. Commande directe sur WhatsApp.</p>
          <div className="row"><Link className="btn white" to="/consoles">Explorer les consoles</Link><Link className="btn ghost" to="/jeux">Découvrir les jeux</Link></div>
          <p><Link className="linkw" to="/vendre-mon-appareil">Vendre mon appareil →</Link></p>
        </div>
        <img className="hero-logo" src="/img/logo-white.png" alt="" width="320" height="320" />
      </div></section>
      <section className="wrap axes" aria-labelledby="ax"><h2 id="ax" className="sr">Nos trois activités</h2>
        {AXES.map(([to, n, t, d, g]) => <Link key={to} className="axe" to={to}><span className="n">{n}</span><h3>{t}</h3><p>{d}</p><span className="go">{g}</span></Link>)}
      </section>
      {top.length > 0 && <section className="wrap pad"><h2>À la une</h2><div className="grid">{top.map((p) => <ProductCard key={p.id} p={p} />)}</div></section>}
      <section className="band"><div className="wrap pad"><h2>Comment vendre son appareil</h2>
        <ol className="steps">{STEPS.map((s, i) => <li key={i}><b>{i + 1}</b><span>{s}</span></li>)}</ol>
        <Link className="btn white" to="/vendre-mon-appareil">Vendre mon appareil</Link></div></section>
      <section className="wrap pad narrow"><h2>Questions fréquentes</h2>{FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</section>
      <section className="wrap pad"><h2>Nous trouver</h2>
        <p><strong>PIXEL PLAY</strong><br />{CONFIG.address}<br />{CONFIG.city}</p>
        <p className="row"><a className="btn" href={mapUrl()} target="_blank" rel="noopener noreferrer">Voir sur la carte</a><a className="btn wa" href={waUrl(GENERIC)} target="_blank" rel="noopener noreferrer"><WaIcon />WhatsApp</a></p>
      </section>
    </>
  );
}
