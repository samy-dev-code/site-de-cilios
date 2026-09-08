-- Etapa de pagamento: método escolhido pela cliente + configurações PIX
alter table public.appointments add column if not exists payment_method text not null default 'pending';

-- Garante o constraint válido mesmo em bancos já criados com a coluna
do $$ begin
  alter table public.appointments drop constraint if exists appointments_payment_method_check;
  alter table public.appointments add constraint appointments_payment_method_check
    check (payment_method in ('pix','cash','card','pending'));
exception when others then null; end $$;

create table if not exists public.settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;

drop policy if exists "public read settings" on public.settings;
create policy "public read settings" on public.settings for select using (true);

drop policy if exists "admin write settings" on public.settings;
create policy "admin write settings" on public.settings for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into public.settings (key, value) values
  ('pix_key', 'marilashdesigner@pix.com.br'),
  ('pix_holder_name', 'MARI LASH DESIGNER'),
  ('pix_city', 'BAURU')
on conflict (key) do nothing;
