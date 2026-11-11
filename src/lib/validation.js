import { CONFIG } from './config.js';
import { DEVICE_FIELDS } from './data.js';

export function validatePhone(v) {
  const s = String(v || '').replace(/[\s.\-()]/g, '');
  return /^(\+?237)?[236]\d{8}$/.test(s) || /^\+\d{8,15}$/.test(s);
}

export function validatePhotos(files, existing = 0) {
  const ok = [], errors = [];
  for (const f of files) {
    if (!CONFIG.photoTypes.includes(f.type)) errors.push(`« ${f.name} » : format non autorisé (JPEG, PNG ou WebP uniquement).`);
    else if (f.size > CONFIG.maxPhotoMB * 1048576) errors.push(`« ${f.name} » dépasse ${CONFIG.maxPhotoMB} Mo.`);
    else if (existing + ok.length >= CONFIG.maxPhotos) errors.push(`Maximum ${CONFIG.maxPhotos} photos.`);
    else ok.push(f);
  }
  return { ok, errors: [...new Set(errors)] };
}

export function validateSell(d) {
  const e = {}, need = 'Ce champ est obligatoire.';
  if (!d.name || d.name.length < 2) e.name = 'Indiquez votre nom complet.';
  if (!d.phone) e.phone = need; else if (!validatePhone(d.phone)) e.phone = 'Numéro invalide (ex. 6XX XX XX XX ou +237…).';
  if (!d.location) e.location = need;
  if (!d.category) e.category = 'Choisissez une catégorie.';
  if (!d.brand) e.brand = need;
  if (!d.model) e.model = need;
  if (!d.condition) e.condition = need;
  const pr = String(d.price || '').replace(/[\s.]/g, '');
  if (pr && !/^\d+$/.test(pr)) e.price = 'Indiquez un montant en chiffres.';
  for (const f of DEVICE_FIELDS[d.category] || []) if (f.required && !(d.specs || {})[f.name]) e['s_' + f.name] = need;
  return e;
}
