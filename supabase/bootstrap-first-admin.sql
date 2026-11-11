-- PREMIER ADMINISTRATEUR (à exécuter UNE fois, dans le SQL Editor Supabase = accès serveur, jamais depuis le site).
-- 1) Supabase > Authentication > Users > Add user : e-mail + mot de passe (cochez « Auto confirm »).
-- 2) Désactivez les inscriptions publiques : Authentication > Providers > Email > « Allow new users to sign up » = OFF.
-- 3) Remplacez l'e-mail ci-dessous et exécutez :
insert into public.profiles (id, full_name, role)
select id, 'Propriétaire PIXEL PLAY', 'admin' from auth.users where email = 'VOTRE-EMAIL@exemple.com'
on conflict (id) do update set role = 'admin';
-- Ajouter un gestionnaire (droits limités) : même requête avec role 'manager'.
-- Retirer l'accès : delete from public.profiles where id = (select id from auth.users where email = '...');
