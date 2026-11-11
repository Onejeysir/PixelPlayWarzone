// Informations commerciales centralisées : modifiez ici uniquement.
import { LIMITS } from '../../shared/constants.js';

export const CONFIG = {
  brand: 'PIXEL PLAY',
  whatsapp: '237697692598',
  phoneDisplay: '+237 697 69 25 98',
  phoneTel: '+237697692598',
  address: 'Bonamoussadi, face petit terrain',
  city: 'Douala, Cameroun',
  mapQuery: 'Bonamoussadi, face Petit Terrain, Douala, Cameroun',
  deliveryFee: null, // frais de livraison en FCFA (entier) ; null = « À confirmer »
  maxPerItem: 10, // quantité max par produit quand le stock n'est pas chiffré
  imageMaxDim: 1600, // côté max (px) après compression
  imageQuality: 0.82, // qualité WebP/JPEG
  uploadTimeoutMs: 60000,
  maxPhotos: LIMITS.maxPhotos,
  maxPhotoMB: LIMITS.maxMB,
  photoTypes: ['image/jpeg', 'image/png', 'image/webp'],
};
