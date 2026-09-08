-- Sistema avançado de banners promocionais
alter table public.banners
  add column if not exists button_text text,
  add column if not exists button_url text,
  add column if not exists desktop_image_url text,
  add column if not exists mobile_image_url text,
  add column if not exists content_position text not null default 'center',
  add column if not exists featured boolean not null default false,
  add column if not exists archived boolean not null default false,
  add column if not exists start_at timestamptz,
  add column if not exists end_at timestamptz,
  add column if not exists no_expiration boolean not null default true,
  add column if not exists duration int not null default 6000,
  add column if not exists updated_at timestamptz not null default now();

update public.banners set desktop_image_url = image_url where desktop_image_url is null and image_url is not null;

drop policy if exists "public read active banners" on public.banners;
create policy "public read published banners" on public.banners for select using ((active = true and archived = false) or auth.role() = 'authenticated');

create index if not exists idx_banners_order on public.banners(archived, active, sort_order);
