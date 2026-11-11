// Constantes partagées navigateur + fonctions serveur (une seule source de vérité).
export const LIMITS = { maxPhotos: 5, maxMB: 5 };
export const IMG_BUCKET = 'pixelplay-product-images';
export const PHOTO_BUCKET = 'pixelplay-device-photos';
export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
export const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
