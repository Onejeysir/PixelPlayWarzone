-- Deux buckets distincts. Limites et types MIME appliqués par le serveur Storage (5 Mo = LIMITS.maxMB).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('pixelplay-product-images', 'pixelplay-product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('pixelplay-device-photos', 'pixelplay-device-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Images produits : lecture publique par URL (bucket public) ; écriture réservée au personnel.
create policy pixelplay_images_staff_all on storage.objects for all to authenticated
  using (bucket_id = 'pixelplay-product-images' and public.is_staff())
  with check (bucket_id = 'pixelplay-product-images' and public.is_staff());

-- Photos d'appareils : bucket PRIVÉ. Aucune politique pour anon : les envois passent par des URLs signées
-- générées par la fonction serveur ; le personnel peut lire (liens signés temporaires) ; seul l'admin supprime.
create policy pixelplay_photos_staff_read on storage.objects for select to authenticated
  using (bucket_id = 'pixelplay-device-photos' and public.is_staff());
create policy pixelplay_photos_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'pixelplay-device-photos' and public.is_admin());
