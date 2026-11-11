import { CONFIG } from './config.js';

// Redimensionne et recompresse (WebP, sinon JPEG). Renvoie l'original si la compression échoue ou n'est pas plus légère.
export async function compressImage(file, { maxDim = CONFIG.imageMaxDim, quality = CONFIG.imageQuality } = {}) {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const k = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.();
    const to = (t) => new Promise((r) => c.toBlob(r, t, quality));
    let out = await to('image/webp'); if (!out || out.type !== 'image/webp') out = await to('image/jpeg');
    return out && out.size < file.size ? out : file;
  } catch { return file; }
}
