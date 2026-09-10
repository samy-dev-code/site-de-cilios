-- Campos extras do portfólio: serviço realizado e categoria.
alter table public.gallery_items add column if not exists service_name text not null default '';
alter table public.gallery_items add column if not exists category text not null default '';
update public.gallery_items set service_name = label where service_name = '';
