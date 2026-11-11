-- PIXEL PLAY : stockage des photos de la page « Vendre mon appareil ».
-- À exécuter une fois dans Supabase > SQL Editor.

-- 1) Bucket PUBLIC en lecture par URL uniquement (les liens doivent s'ouvrir depuis WhatsApp sans connexion).
--    Limites appliquées PAR LE SERVEUR : 5 Mo (= CONFIG.maxPhotoMB) et seulement JPEG/PNG/WebP.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('device-photos', 'device-photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- 2) Le public (clé « anon ») peut UNIQUEMENT ajouter un fichier, et seulement à l'emplacement <id22>/<n>.<ext>.
--    Aucune politique SELECT / UPDATE / DELETE pour anon : impossible de lister, remplacer ou supprimer des fichiers.
drop policy if exists "pixelplay_anon_insert_photos" on storage.objects;
create policy "pixelplay_anon_insert_photos" on storage.objects
  for insert to anon
  with check (
    bucket_id = 'device-photos'
    and (storage.foldername(name))[1] ~ '^[A-Za-z0-9_-]{22}$'
    and name ~ '^[A-Za-z0-9_-]{22}/[0-9]{1,2}\.(webp|jpg|png)$'
  );
