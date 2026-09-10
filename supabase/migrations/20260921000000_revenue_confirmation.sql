-- Receita confirmada: registra quando um agendamento passa a valer como receita.
-- Pendente = não é receita. Confirmado (ou fases posteriores) = receita.
-- Cancelado/reagendado de volta = deixa de ser receita.
-- Idempotente: clicar em "Confirmar" novamente não muda o valor nem a data.

alter table public.appointments
  add column if not exists revenue_confirmed_at timestamptz;

create or replace function public.handle_revenue_confirmation()
returns trigger
language plpgsql
as $$
begin
  if new.status in ('confirmed', 'in_progress', 'completed') then
    -- Selo registrado apenas na primeira confirmação (idempotente)
    new.revenue_confirmed_at := coalesce(old.revenue_confirmed_at, now());
  else
    -- pending / cancelled / rescheduled: não conta como receita
    new.revenue_confirmed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_revenue_confirmation on public.appointments;
create trigger trg_revenue_confirmation
  before update of status on public.appointments
  for each row execute function public.handle_revenue_confirmation();

drop trigger if exists trg_revenue_confirmation_insert on public.appointments;
create trigger trg_revenue_confirmation_insert
  before insert on public.appointments
  for each row execute function public.handle_revenue_confirmation();
