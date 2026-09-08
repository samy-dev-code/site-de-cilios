-- Galeria de antes/depois editável pelo painel admin.
create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  label text not null default '',
  hint text not null default '',
  before_url text not null default '',
  after_url text not null default '',
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.gallery_items enable row level security;

drop policy if exists "public read active gallery items" on public.gallery_items;
create policy "public read active gallery items" on public.gallery_items
  for select using (active = true);

drop policy if exists "admin full gallery items" on public.gallery_items;
create policy "admin full gallery items" on public.gallery_items
  for all to authenticated using (true) with check (true);

-- Bucket público para as fotos da galeria.
insert into storage.buckets (id, name, public) values ('galeria','galeria', true)
on conflict (id) do nothing;

drop policy if exists "public read galeria" on storage.objects;
create policy "public read galeria" on storage.objects for select using (bucket_id = 'galeria');

drop policy if exists "admin upload galeria" on storage.objects;
create policy "admin upload galeria" on storage.objects for insert to authenticated with check (bucket_id = 'galeria');

drop policy if exists "admin update galeria" on storage.objects;
create policy "admin update galeria" on storage.objects for update to authenticated using (bucket_id = 'galeria');

drop policy if exists "admin delete galeria" on storage.objects;
create policy "admin delete galeria" on storage.objects for delete to authenticated using (bucket_id = 'galeria');

-- Preenche com os 4 itens atuais do site.
insert into public.gallery_items (label, hint, before_url, after_url, position)
values
  ('Volume Russo', 'Resultado natural', '', '/galeria/cliente-1.jpeg', 0),
  ('Fio a Fio', 'Olhar marcado', '', '/galeria/cliente-2.jpeg', 1),
  ('Mega Volume', 'Impacto total', '', '/galeria/cliente-3.jpeg', 2),
  ('Brasileiro', 'Elegância diária', '', '/galeria/cliente-4.jpeg', 3)
on conflict do nothing;
