-- Mari Lash Designer — schema inicial
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  duration_minutes int not null default 60,
  image_url text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text,
  subtitle text,
  image_url text,
  link_url text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  rating int not null default 5 check (rating between 1 and 5),
  message text not null,
  photo_url text,
  approved boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.services(id) on delete set null,
  client_name text not null,
  client_whatsapp text not null,
  appointment_date date not null,
  appointment_time time not null,
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled','completed')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.business_hours (
  id smallint primary key,
  weekday smallint not null check (weekday between 0 and 6),
  open_time time,
  close_time time,
  is_open boolean not null default true
);

create table if not exists public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  blocked_date date not null unique,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_services_active on public.services(active, sort_order);
create index if not exists idx_banners_active on public.banners(active, sort_order);
create index if not exists idx_appointments_date on public.appointments(appointment_date);

alter table public.services enable row level security;
alter table public.banners enable row level security;
alter table public.testimonials enable row level security;
alter table public.appointments enable row level security;
alter table public.business_hours enable row level security;
alter table public.blocked_dates enable row level security;

create policy "public read active services" on public.services for select using (active = true or auth.role() = 'authenticated');
create policy "admin write services" on public.services for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "public read active banners" on public.banners for select using (active = true or auth.role() = 'authenticated');
create policy "admin write banners" on public.banners for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "public read approved testimonials" on public.testimonials for select using (approved = true or auth.role() = 'authenticated');
create policy "admin write testimonials" on public.testimonials for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "public insert appointments" on public.appointments for insert with check (true);
create policy "public read appointments" on public.appointments for select using (true);
create policy "admin update appointments" on public.appointments for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin delete appointments" on public.appointments for delete using (auth.role() = 'authenticated');
create policy "public read business_hours" on public.business_hours for select using (true);
create policy "admin write business_hours" on public.business_hours for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "public read blocked_dates" on public.blocked_dates for select using (true);
create policy "admin write blocked_dates" on public.blocked_dates for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into public.services (name, description, price, duration_minutes, sort_order) values
  ('Fio a Fio', 'Técnica que aplica um fio sintético por cílio natural, garantindo um olhar definido e natural.', 180.00, 120, 1),
  ('Volume Russo', 'Fios ultrafinos em leques leves para um efeito volumoso, com toque de sofisticação.', 220.00, 150, 2),
  ('Mega Volume', 'Máxima densidade e impacto visual, ideal para quem ama um olhar marcante.', 280.00, 180, 3),
  ('Fox Eyes', 'Técnica que alonga o canto externo dos olhos, criando um efeito de olhar elevado e felino.', 240.00, 150, 4)
on conflict do nothing;

insert into public.business_hours (id, weekday, open_time, close_time, is_open) values
  (0, 0, null, null, false),
  (1, 1, '09:00', '19:00', true),
  (2, 2, '09:00', '19:00', true),
  (3, 3, '09:00', '19:00', true),
  (4, 4, '09:00', '19:00', true),
  (5, 5, '09:00', '19:00', true),
  (6, 6, '09:00', '16:00', true)
on conflict (id) do nothing;
