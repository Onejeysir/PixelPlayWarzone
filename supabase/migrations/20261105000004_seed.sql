-- Données de départ : catégories de base (leurs slugs pilotent les types du site) et coordonnées de l'entreprise.
insert into public.categories (name, slug, description) values
  ('Consoles', 'consoles', 'PlayStation 4 et PlayStation 5'),
  ('Jeux physiques', 'jeux-physiques', 'Jeux sur disque PS4 et PS5'),
  ('Jeux numériques', 'jeux-numeriques', 'Offres numériques autorisées'),
  ('Appareils', 'appareils', 'Ordinateurs, téléphones et consoles d''occasion')
on conflict (slug) do nothing;

insert into public.site_settings (id, business_name, whatsapp, phone, address, city, map_query)
values (1, 'PIXEL PLAY', '237697692598', '+237 697 692 598', 'Bonamoussadi, face Petit Terrain', 'Douala, Cameroun', 'Bonamoussadi, face Petit Terrain, Douala, Cameroun')
on conflict (id) do nothing;
