import { CONFIG } from './config.js';
export const formatPrice = (n) => new Intl.NumberFormat('fr-FR').format(n).replace(/[\u202f\u00a0]/g, ' ') + ' FCFA';
export const waUrl = (text) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;
export const GENERIC = "Bonjour PIXEL PLAY, j'ai une question.";
export const TYPE_LABEL = { 'jeu-numerique': 'Numérique', 'jeu-physique': 'Disque', console: 'Console', appareil: 'Appareil' };
const join = (a) => a.filter((x) => x != null && x !== false).join('\n');

export function sellMessage(d) {
  const specs = (d.specsList || []).filter(([, v]) => v).map(([k, v]) => `   • ${k} : ${v}`);
  const n = d.photoCount || 0;
  return join(['Bonjour PIXEL PLAY,', '', 'Je souhaite proposer un appareil pour estimation et éventuel rachat.', '',
    ...(d.reference ? [`Référence de ma demande : ${d.reference}`, ''] : []),
    'INFORMATIONS DU VENDEUR', `Nom : ${d.name}`, `Téléphone : ${d.phone}`, `Localisation : ${d.location}`, '',
    "INFORMATIONS DE L'APPAREIL", `Type : ${d.categoryLabel}`, `Marque : ${d.brand}`, `Modèle : ${d.model}`,
    `État : ${d.condition}`, specs.length ? 'Caractéristiques :' : null, ...specs,
    d.serial ? `Numéro de série : ${d.serial}` : null,
    d.category === 'telephone' ? 'IMEI : à communiquer dans la conversation uniquement si nécessaire' : null,
    `Prix souhaité : ${d.price ? formatPrice(d.price) : 'non renseigné'}`,
    d.description ? `Description : ${d.description}` : null, '',
    "PHOTOS DE L'APPAREIL", '',
    d.manualPhotos ? (n ? `Photos : ${n} photo(s) à joindre dans cette conversation WhatsApp.` : 'Aucune photo jointe.')
      : n ? `Nombre de photos : ${n} (enregistrées de façon sécurisée, consultables dans votre espace de gestion avec la référence ci-dessus)` : 'Aucune photo jointe.', '',
    n ? 'Merci de consulter les photos et de me communiquer votre estimation.' : 'Merci de me communiquer votre estimation.']);
}
