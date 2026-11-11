// CATALOGUE DE DÉMONSTRATION : tous les produits ci-dessous sont des exemples (demo:true).
// Pour passer en production : remplacez ces lignes par vos vrais produits, mettez demo:false
// et indiquez le chemin d'une vraie photo dans "image" (ex. '/assets/img/ps5.webp').
// `stock` : true/false, ou un nombre d'exemplaires (limite la quantité commandable).
const p = (id, type, name, platform, variant, condition, price, stock, description) =>
  ({ id, type, name, platform, variant, condition, price, stock, description, image: null, demo: true });

export const PRODUCTS = [
  p('c-ps5-std', 'console', 'PlayStation 5 Standard', 'PS5', 'PS5 Standard (lecteur)', 'Neuf', 450000, 3, 'Console PS5 avec lecteur de disque. Exemple de démonstration.'),
  p('c-ps5-dig', 'console', 'PlayStation 5 Digital Edition', 'PS5', 'PS5 Digital Edition', 'Neuf', 400000, true, 'Console PS5 sans lecteur de disque. Exemple de démonstration.'),
  p('c-ps5-slim', 'console', 'PlayStation 5 Slim', 'PS5', 'PS5 Slim', 'Occasion', 380000, false, 'Exemple de démonstration.'),
  p('c-ps4-slim', 'console', 'PlayStation 4 Slim 500 Go', 'PS4', 'PS4 Slim', 'Occasion', 120000, true, 'Exemple de démonstration.'),
  p('c-ps4-pro', 'console', 'PlayStation 4 Pro 1 To', 'PS4', 'PS4 Pro', 'Occasion', 160000, true, 'Exemple de démonstration.'),
  p('c-ps4-std', 'console', 'PlayStation 4 Standard', 'PS4', 'PS4 Standard', 'Occasion', 90000, true, 'Exemple de démonstration.'),
  p('g-gow', 'jeu-physique', 'God of War Ragnarök', 'PS5', null, 'Neuf', 25000, 2, 'Jeu sur disque. Exemple de démonstration.'),
  p('g-gt7', 'jeu-physique', 'Gran Turismo 7', 'PS4', null, 'Occasion', 12000, true, 'Jeu sur disque. Exemple de démonstration.'),
  p('g-sm2', 'jeu-physique', "Marvel's Spider-Man 2", 'PS5', null, 'Occasion', 20000, false, 'Jeu sur disque. Exemple de démonstration.'),
  p('g-tlou', 'jeu-physique', 'The Last of Us Part II', 'PS4', null, 'Occasion', 10000, true, 'Jeu sur disque. Exemple de démonstration.'),
  p('n-gow', 'jeu-numerique', 'God of War Ragnarök (numérique)', 'PS5', null, null, 22000, true, 'Produit numérique. Conditions précisées avant commande. Exemple de démonstration.'),
  p('n-gt7', 'jeu-numerique', 'Gran Turismo 7 (numérique)', 'PS4', null, null, 10000, true, 'Produit numérique. Conditions précisées avant commande. Exemple de démonstration.'),
  p('a-lap', 'appareil', 'Ordinateur portable 15" (exemple)', 'Ordinateur', null, 'Occasion', 180000, true, 'Exemple de démonstration.'),
  p('a-tel', 'appareil', 'Smartphone 128 Go (exemple)', 'Téléphone', null, 'Occasion', 90000, true, 'Exemple de démonstration.'),
  p('g-fc25', 'jeu-physique', 'EA Sports FC 25', 'PS5', null, 'Neuf', 35000, 6, 'Football sur disque PS5, boîtier d’origine.'),
  p('g-gta', 'jeu-physique', 'GTA V', 'PS4', null, 'Occasion', 8000, 8, 'Disque testé, notice absente.'),
  p('g-hzd', 'jeu-physique', 'Horizon Forbidden West', 'PS5', null, 'Neuf', 27000, 1, 'Dernier exemplaire neuf sous blister.'),
  p('n-fc25', 'jeu-numerique', 'EA Sports FC 25 (numérique)', 'PS5', null, null, 30000, 4, 'Code ou compte précisé avant paiement.'),
  p('n-miles', 'jeu-numerique', "Marvel's Spider-Man: Miles Morales (numérique)", 'PS5', null, null, 18000, true, 'Jeu numérique PS5. Accès confirmé sur WhatsApp.'),
  p('a-mac', 'appareil', 'MacBook Air 13" 2019', 'Ordinateur', null, 'Occasion', 220000, 1, '8 Go de RAM, SSD 256 Go, batterie correcte.'),
];
Object.assign(PRODUCTS.find((x) => x.id === 'g-fc25'), { featured: true, popularity: 96, listPrice: 40000 });
Object.assign(PRODUCTS.find((x) => x.id === 'n-fc25'), { popularity: 88, listPrice: 34000 });
Object.assign(PRODUCTS.find((x) => x.id === 'c-ps5-std'), { featured: true, popularity: 99 });
Object.assign(PRODUCTS.find((x) => x.id === 'g-gow'), { featured: true, popularity: 94 });
Object.assign(PRODUCTS.find((x) => x.id === 'c-ps4-pro'), { popularity: 70 });
Object.assign(PRODUCTS.find((x) => x.id === 'a-mac'), { disabled: true, popularity: 20 });

export const CAT_LABEL = { ordinateur: 'Ordinateur', telephone: 'Téléphone', console: 'Console' };

// Champs adaptés à chaque catégorie d'appareil du formulaire de vente.
export const DEVICE_FIELDS = {
  ordinateur: [
    { name: 'type', label: 'Type', options: ['Portable', 'Bureau'], required: true },
    { name: 'cpu', label: 'Processeur' }, { name: 'ram', label: 'Mémoire RAM' },
    { name: 'storage', label: 'Stockage (capacité et type)' }, { name: 'gpu', label: 'Carte graphique (si applicable)' },
    { name: 'screen', label: "Taille d'écran (si applicable)" },
    { name: 'battery', label: 'État de la batterie (portable)', options: ['Bon', 'Moyen', 'Faible', 'Inconnu'] },
    { name: 'acc', label: 'Accessoires fournis' },
  ],
  telephone: [
    { name: 'storage', label: 'Capacité de stockage' }, { name: 'ram', label: 'Mémoire RAM (si connue)' },
    { name: 'screen', label: "État de l'écran", options: ['Intact', 'Rayures légères', 'Fissuré'], required: true },
    { name: 'battery', label: 'État de la batterie (si connu)' }, { name: 'acc', label: 'Accessoires fournis' },
  ],
  console: [
    { name: 'gen', label: 'Modèle et génération (ex. PS5)' }, { name: 'edition', label: 'Version ou édition' },
    { name: 'storage', label: 'Capacité de stockage (si connue)' },
    { name: 'drive', label: 'État du lecteur de disque', options: ['Fonctionne', 'Défectueux', 'Sans lecteur'] },
    { name: 'padstate', label: 'État des manettes' }, { name: 'padcount', label: 'Nombre de manettes' },
    { name: 'acc', label: 'Jeux et accessoires inclus' },
  ],
};

// Mode démonstration (Supabase non configuré) : mêmes champs que le catalogue réel.
for (const p of PRODUCTS) { p.reference = p.id; p.status = !p.stock ? 'out' : typeof p.stock === 'number' && p.stock <= 3 ? 'low' : 'available'; }
