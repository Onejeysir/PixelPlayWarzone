import { Link } from 'react-router-dom';
import Catalog from '../components/Catalog.jsx';
import { usePage } from '../components/ui.jsx';

const Page = ({ title, desc, lead, children, types }) => {
  usePage(title, desc);
  return (
    <section className="wrap pad">
      <h1>{title}</h1><p className="lead">{lead}</p>{children}
      <Catalog types={types} />
    </section>
  );
};
const G = ['jeu-numerique', 'jeu-physique'], D = ['jeu-numerique'], P = ['jeu-physique'], C = ['console'], A = ['appareil'];

export const Games = () => (
  <Page title="Jeux vidéo" desc="Jeux numériques et jeux physiques PS4 et PS5 chez PIXEL PLAY, Douala." lead="Choisissez entre jeux numériques et jeux sur disque." types={G}>
    <p className="row"><Link className="btn" to="/jeux/numeriques">Jeux numériques</Link><Link className="btn" to="/jeux/physiques">Jeux physiques</Link></p>
  </Page>
);
export const Digital = () => (
  <Page title="Jeux numériques" desc="Jeux numériques PS4 et PS5 chez PIXEL PLAY." lead="Produits numériques, proposés uniquement lorsque leur vente est autorisée." types={D}>
    <p className="note">Les conditions d'accès, de restriction et de transfert de chaque produit numérique ou compte sont précisées par PIXEL PLAY avant toute commande. Un compte n'est pas un produit physique. Ne communiquez jamais de mot de passe ni de code de vérification sur ce site.</p>
  </Page>
);
export const Physical = () => <Page title="Jeux physiques" desc="Jeux PS4 et PS5 sur disque, neufs ou d'occasion, chez PIXEL PLAY." lead="Jeux sur disque pour PS4 et PS5, neufs ou d'occasion." types={P} />;
export const Consoles = () => <Page title="Consoles" desc="Consoles PlayStation 4 et PlayStation 5 neuves ou d'occasion chez PIXEL PLAY, Douala." lead="PlayStation 4 et PlayStation 5 : filtrez par génération, variante, état et budget." types={C} />;

export function Devices() {
  usePage("Achat / Vente d'appareils", 'Vendez votre ordinateur, téléphone ou console à PIXEL PLAY, ou découvrez les appareils disponibles.');
  return (
    <section className="wrap pad">
      <h1>Achat / Vente</h1>
      <div className="axes two">
        <Link className="axe" to="/vendre-mon-appareil"><span className="n">A</span><h3>Vendre mon appareil</h3><p>Ordinateur, téléphone ou console : demandez une estimation.</p><span className="go">Faire une demande →</span></Link>
        <a className="axe" href="#catalog"><span className="n">B</span><h3>Acheter un appareil</h3><p>Appareils actuellement disponibles chez PIXEL PLAY.</p><span className="go">Voir la liste →</span></a>
      </div>
      <Catalog types={A} />
    </section>
  );
}
