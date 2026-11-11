-- PIXEL PLAY : schéma (tables, contraintes, index, fonctions métier, journal d'audit).
-- À exécuter dans l'ordre des fichiers (SQL Editor ou `supabase db push`).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null check (role in ('admin', 'manager')),
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  parent_id uuid references public.categories (id) on delete restrict,
  description text,
  created_at timestamptz not null default now()
);
create index categories_parent_idx on public.categories (parent_id);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  reference text not null unique check (length(btrim(reference)) > 0),
  description text not null default '',
  category_id uuid not null references public.categories (id) on delete restrict,
  price integer not null check (price >= 0),
  promotional_price integer check (promotional_price is null or (promotional_price >= 0 and promotional_price < price)),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  stock_alert_threshold integer not null default 3 check (stock_alert_threshold >= 0),
  condition text not null default 'new' check (condition in ('new', 'used')),
  availability_enabled boolean not null default true,
  specifications jsonb not null default '{}'::jsonb check (jsonb_typeof(specifications) = 'object'),
  featured boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on public.products (category_id);
create index products_visible_idx on public.products (created_at desc) where archived_at is null;
create index products_featured_idx on public.products (featured) where featured and archived_at is null;

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null unique,
  is_primary boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, display_order);
create unique index product_images_one_primary on public.product_images (product_id) where is_primary;

create table public.stock_movements (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products (id) on delete cascade,
  previous_quantity integer not null,
  changed_quantity integer not null,
  new_quantity integer not null check (new_quantity >= 0),
  reason text not null check (length(btrim(reason)) > 0),
  performed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index stock_movements_product_idx on public.stock_movements (product_id, created_at desc);

create table public.device_purchase_requests (
  id uuid primary key default gen_random_uuid(),
  reference text unique,
  customer_name text not null check (char_length(customer_name) between 2 and 100),
  phone text not null check (char_length(phone) between 8 and 20),
  location text not null check (char_length(location) between 2 and 120),
  device_type text not null check (device_type in ('ordinateur', 'telephone', 'console')),
  brand text not null check (char_length(brand) between 1 and 80),
  model text not null check (char_length(model) between 1 and 80),
  specifications jsonb not null default '{}'::jsonb check (jsonb_typeof(specifications) = 'object'),
  condition text not null,
  expected_price integer check (expected_price is null or expected_price >= 0),
  description text,
  status text not null default 'new' check (status in ('new', 'reviewing', 'awaiting_info', 'offer_made', 'accepted', 'rejected', 'done')),
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index device_requests_status_idx on public.device_purchase_requests (status, created_at desc);

create table public.device_purchase_photos (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.device_purchase_requests (id) on delete cascade,
  storage_path text not null unique, -- unique : empêche d'attacher deux fois les mêmes fichiers
  original_filename text,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  file_size integer not null check (file_size > 0),
  created_at timestamptz not null default now()
);
create index device_photos_request_idx on public.device_purchase_photos (request_id);

create table public.site_settings (
  id smallint primary key default 1 check (id = 1),
  business_name text not null,
  whatsapp text not null check (whatsapp ~ '^[0-9]{8,15}$'),
  phone text not null,
  address text not null,
  city text not null,
  map_query text not null,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  contact_info text,
  stock_alert_default integer not null default 3 check (stock_alert_default >= 0),
  updated_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor uuid references public.profiles (id) on delete set null,
  action text not null,
  table_name text not null,
  row_id text,
  details jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);

-- ───────── Fonctions ─────────
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager'));
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Même règle que shared/product.js : la désactivation manuelle prime sur le calcul automatique.
create or replace function public.stock_status(qty integer, threshold integer, enabled boolean) returns text
language sql immutable as $$
  select case when not enabled then 'disabled' when qty <= 0 then 'out' when qty <= threshold then 'low' else 'available' end;
$$;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger products_updated before update on public.products for each row execute function public.set_updated_at();
create trigger requests_updated before update on public.device_purchase_requests for each row execute function public.set_updated_at();
create trigger settings_updated before update on public.site_settings for each row execute function public.set_updated_at();

create or replace function public.set_request_reference() returns trigger language plpgsql as $$
begin new.reference := upper(substr(replace(new.id::text, '-', ''), 1, 10)); return new; end $$;
create trigger requests_reference before insert on public.device_purchase_requests for each row execute function public.set_request_reference();

-- Le stock ne peut changer QUE par adjust_stock() : l'historique est ainsi toujours complet.
create or replace function public.guard_stock_update() returns trigger language plpgsql as $$
begin
  if new.stock_quantity is distinct from old.stock_quantity
     and coalesce(current_setting('pixelplay.stock_rpc', true), '') <> 'on' then
    raise exception 'Le stock ne peut être modifié que via adjust_stock()' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger products_guard_stock before update on public.products for each row execute function public.guard_stock_update();

create or replace function public.log_initial_stock() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.stock_quantity > 0 then
    insert into public.stock_movements (product_id, previous_quantity, changed_quantity, new_quantity, reason, performed_by)
    values (new.id, 0, new.stock_quantity, new.stock_quantity, 'Stock initial', auth.uid());
  end if;
  return new;
end $$;
create trigger products_initial_stock after insert on public.products for each row execute function public.log_initial_stock();

create or replace function public.adjust_stock(p_product uuid, p_new integer, p_reason text) returns integer
language plpgsql security definer set search_path = public as $$
declare prev integer;
begin
  if not public.is_staff() then raise exception 'Accès refusé' using errcode = '42501'; end if;
  if p_new is null or p_new < 0 then raise exception 'Quantité invalide' using errcode = '22023'; end if;
  if p_reason is null or length(btrim(p_reason)) = 0 then raise exception 'Motif obligatoire' using errcode = '22023'; end if;
  select stock_quantity into prev from public.products where id = p_product for update;
  if not found then raise exception 'Produit introuvable' using errcode = 'P0002'; end if;
  if prev = p_new then return p_new; end if;
  perform set_config('pixelplay.stock_rpc', 'on', true);
  update public.products set stock_quantity = p_new where id = p_product;
  perform set_config('pixelplay.stock_rpc', 'off', true);
  insert into public.stock_movements (product_id, previous_quantity, changed_quantity, new_quantity, reason, performed_by)
  values (p_product, prev, p_new - prev, p_new, btrim(p_reason), auth.uid());
  return p_new;
end $$;

-- Suppression : si du stock a déjà été décrémenté (historique commercial), le produit est ARCHIVÉ, sinon supprimé.
-- Renvoie les chemins d'images à retirer du bucket quand il y a suppression réelle.
create or replace function public.remove_product(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare paths text[];
begin
  if not public.is_admin() then raise exception 'Accès refusé' using errcode = '42501'; end if;
  if exists (select 1 from public.stock_movements where product_id = p_id and changed_quantity < 0) then
    update public.products set archived_at = now(), availability_enabled = false where id = p_id;
    return jsonb_build_object('result', 'archived', 'paths', '[]'::jsonb);
  end if;
  select coalesce(array_agg(storage_path), '{}') into paths from public.product_images where product_id = p_id;
  delete from public.products where id = p_id;
  return jsonb_build_object('result', 'deleted', 'paths', to_jsonb(paths));
end $$;

-- Journal d'audit : qui a modifié quoi (diff champ par champ pour les UPDATE).
create or replace function public.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare rid text; det jsonb;
begin
  if tg_op = 'DELETE' then
    rid := to_jsonb(old) ->> 'id'; det := to_jsonb(old);
  elsif tg_op = 'INSERT' then
    rid := to_jsonb(new) ->> 'id'; det := to_jsonb(new);
  else
    rid := to_jsonb(new) ->> 'id';
    select coalesce(jsonb_object_agg(n.key, jsonb_build_array(o.value, n.value)), '{}'::jsonb) into det
      from jsonb_each(to_jsonb(old)) o join jsonb_each(to_jsonb(new)) n on n.key = o.key
      where o.value is distinct from n.value and n.key <> 'updated_at';
    if det = '{}'::jsonb then return new; end if;
  end if;
  insert into public.audit_log (actor, action, table_name, row_id, details) values (auth.uid(), tg_op, tg_table_name, rid, det);
  return coalesce(new, old);
end $$;
create trigger products_audit after insert or update or delete on public.products for each row execute function public.audit_row();
create trigger categories_audit after insert or update or delete on public.categories for each row execute function public.audit_row();
create trigger product_images_audit after insert or delete on public.product_images for each row execute function public.audit_row();
create trigger settings_audit after update on public.site_settings for each row execute function public.audit_row();
create trigger requests_audit after update or delete on public.device_purchase_requests for each row execute function public.audit_row();

revoke execute on function public.adjust_stock(uuid, integer, text) from public, anon;
revoke execute on function public.remove_product(uuid) from public, anon;
