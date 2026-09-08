-- updated_at na tabela banners + trigger para mantê-lo atualizado
alter table public.banners add column if not exists updated_at timestamptz not null default now();

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists banners_touch_updated_at on public.banners;
create trigger banners_touch_updated_at before update on public.banners for each row execute function public.touch_updated_at();
