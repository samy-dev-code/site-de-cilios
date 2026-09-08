-- Catálogo profissional: categorias, campos completos de serviço,
-- histórico de preços e auditoria administrativa.
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  active boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.services
  add column if not exists promotional_price numeric(10,2),
  add column if not exists category_id uuid references public.categories(id) on delete set null,
  add column if not exists featured boolean not null default false,
  add column if not exists archived boolean not null default false,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists display_order int not null default 0;

update public.services set display_order = sort_order where display_order = 0;

create table if not exists public.service_price_history (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.services(id) on delete cascade,
  old_price numeric(10,2),
  new_price numeric(10,2) not null,
  old_promotional_price numeric(10,2),
  new_promotional_price numeric(10,2),
  user_email text,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_email text,
  action text not null,
  entity text not null,
  entity_id uuid,
  entity_name text,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_services_public on public.services(active, archived, display_order);
create index if not exists idx_services_category on public.services(category_id);
create index if not exists idx_price_history_service on public.service_price_history(service_id, created_at desc);
create index if not exists idx_audit_log_created on public.admin_audit_log(created_at desc);

alter table public.categories enable row level security;
alter table public.service_price_history enable row level security;
alter table public.admin_audit_log enable row level security;

drop policy if exists "public read active categories" on public.categories;
create policy "public read active categories" on public.categories for select using (active = true or auth.role() = 'authenticated');
drop policy if exists "admin write categories" on public.categories;
create policy "admin write categories" on public.categories for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "public read price history" on public.service_price_history;
create policy "public read price history" on public.service_price_history for select using (true);
drop policy if exists "admin insert price history" on public.service_price_history;
create policy "admin insert price history" on public.service_price_history for insert with check (auth.role() = 'authenticated');

drop policy if exists "admin read audit log" on public.admin_audit_log;
create policy "admin read audit log" on public.admin_audit_log for select using (auth.role() = 'authenticated');
drop policy if exists "admin insert audit log" on public.admin_audit_log;
create policy "admin insert audit log" on public.admin_audit_log for insert with check (auth.role() = 'authenticated');

insert into public.categories (name, slug, display_order) values
  ('Cílios', 'cilios', 1),
  ('Sobrancelhas', 'sobrancelhas', 2),
  ('Lash Lifting', 'lash-lifting', 3),
  ('Brow Lamination', 'brow-lamination', 4),
  ('Manutenção', 'manutencao', 5)
on conflict (name) do nothing;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_services_updated_at on public.services;
create trigger trg_services_updated_at before update on public.services
  for each row execute function public.set_updated_at();
