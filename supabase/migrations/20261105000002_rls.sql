-- Sécurité au niveau des lignes (RLS). Rien n'est lisible/modifiable sans politique explicite.
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.stock_movements enable row level security;
alter table public.device_purchase_requests enable row level security;
alter table public.device_purchase_photos enable row level security;
alter table public.site_settings enable row level security;
alter table public.audit_log enable row level security;

-- Défense en profondeur : l'anonyme n'a aucun droit sur les tables sensibles.
revoke all on public.profiles, public.stock_movements, public.device_purchase_requests, public.device_purchase_photos, public.audit_log from anon;
-- Aucune écriture directe sur ces tables depuis le navigateur (stock via adjust_stock, suppression via remove_product).
revoke insert, update, delete on public.profiles, public.stock_movements, public.audit_log, public.device_purchase_photos from authenticated;
revoke delete on public.products from authenticated;
revoke insert on public.device_purchase_requests from authenticated;
revoke update on public.device_purchase_requests from authenticated;
grant update (status, internal_notes) on public.device_purchase_requests to authenticated; -- le reste est immuable

-- profiles : lecture réservée au personnel ; AUCUNE écriture (les rôles se gèrent côté serveur : SQL Editor / service_role).
create policy profiles_staff_read on public.profiles for select to authenticated using (public.is_staff());

-- categories : lecture publique ; écriture admin.
create policy categories_read on public.categories for select to anon, authenticated using (true);
create policy categories_admin_write on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- products : le public voit les produits non archivés ; le personnel voit tout ; le personnel écrit ; suppression via remove_product().
create policy products_public_read on public.products for select to anon, authenticated using (archived_at is null);
create policy products_staff_read on public.products for select to authenticated using (public.is_staff());
create policy products_staff_insert on public.products for insert to authenticated with check (public.is_staff());
create policy products_staff_update on public.products for update to authenticated using (public.is_staff()) with check (public.is_staff());

create policy product_images_public_read on public.product_images for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.archived_at is null));
create policy product_images_staff_all on public.product_images for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy stock_movements_staff_read on public.stock_movements for select to authenticated using (public.is_staff());

-- Demandes de rachat : créées UNIQUEMENT par la fonction serveur (service_role) ; lecture/mise à jour limitée au personnel.
create policy requests_staff_read on public.device_purchase_requests for select to authenticated using (public.is_staff());
create policy requests_staff_update on public.device_purchase_requests for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy requests_admin_delete on public.device_purchase_requests for delete to authenticated using (public.is_admin());
grant delete on public.device_purchase_requests to authenticated;
create policy photos_staff_read on public.device_purchase_photos for select to authenticated using (public.is_staff());

create policy settings_read on public.site_settings for select to anon, authenticated using (true);
create policy settings_admin_update on public.site_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy audit_admin_read on public.audit_log for select to authenticated using (public.is_admin());
