-- ============================================================================
-- Preparação para pagamentos PIX da InfinitePay (APENAS ESTRUTURA)
--
-- O que faz:
--   1. Registra a tabela `payments` (já existente no banco) de forma idempotente,
--      com índices, trigger de updated_at e política RLS para o painel autenticado.
--   2. Registra a tabela `webhook_events` (já existente no banco) de forma idempotente,
--      com leitura restrita ao painel autenticado.
--   3. Adiciona ao AGENDAMENTO (appointments) o status de pagamento e os campos
--      que vinculam o pagamento ao agendamento:
--        - payment_status   → aguardando_pagamento | pago | expirado | cancelado
--        - payment_provider → provedor do pagamento online (ex.: infinitepay)
--        - order_nsu        → NSU do pedido no provedor (vínculo com payments.order_nsu)
--        - transaction_nsu  → NSU da transação confirmada no provedor
--        - payment_amount   → valor efetivamente cobrado (R$)
--        - payment_paid_at  → momento da confirmação do pagamento
--   4. Espelha nos agendamentos o pagamento mais recente já registrado (backfill).
--
-- NÃO implementa a InfinitePay: nenhuma chamada de API, webhook ou frontend aqui.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Tabela de pagamentos
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  provider text not null default 'infinitepay',
  status text not null default 'pending'
    constraint payments_status_check check (status in ('pending','paid','expired','canceled','failed','refunded')),
  amount numeric not null default 0,
  amount_cents integer not null default 0,
  order_nsu text not null,
  invoice_slug text,
  transaction_nsu text,
  checkout_url text,
  expires_at timestamptz,
  paid_at timestamptz,
  notified_at timestamptz,
  last_error text,
  last_webhook jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payments_order_nsu_key on public.payments (order_nsu);
create index if not exists payments_appointment_idx on public.payments (appointment_id);
create index if not exists payments_stale_idx on public.payments (provider, status, created_at);

drop trigger if exists payments_touch_updated_at on public.payments;
create trigger payments_touch_updated_at before update on public.payments
  for each row execute function public.touch_updated_at();

comment on table public.payments is 'Pagamentos online (InfinitePay) vinculados aos agendamentos';

-- RLS: apenas o painel autenticado gerencia pagamentos
alter table public.payments enable row level security;
drop policy if exists "admin manage payments" on public.payments;
create policy "admin manage payments" on public.payments
  for all to authenticated
  using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 2) Eventos de webhook do provedor
-- ---------------------------------------------------------------------------
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'infinitepay',
  event_key text not null,
  event_type text,
  order_nsu text,
  transaction_nsu text,
  payload jsonb,
  status text not null default 'received'
    constraint webhook_events_status_check check (status in ('received','processed','duplicate','ignored','error')),
  result text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint webhook_events_provider_event_key_key unique (provider, event_key)
);

comment on table public.webhook_events is 'Webhooks recebidos do provedor de pagamento (InfinitePay)';

-- RLS: leitura apenas pelo painel autenticado (escrita via service role / funções)
alter table public.webhook_events enable row level security;
drop policy if exists "admin read webhook events" on public.webhook_events;
create policy "admin read webhook events" on public.webhook_events
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 3) Status e campos de vínculo do pagamento no agendamento
-- ---------------------------------------------------------------------------
alter table public.appointments
  add column if not exists payment_status text not null default 'aguardando_pagamento';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'appointments_payment_status_check'
      and conrelid = 'public.appointments'::regclass
  ) then
    alter table public.appointments
      add constraint appointments_payment_status_check
      check (payment_status in ('aguardando_pagamento','pago','expirado','cancelado'));
  end if;
end $$;

alter table public.appointments
  add column if not exists payment_provider text,
  add column if not exists order_nsu text,
  add column if not exists transaction_nsu text,
  add column if not exists payment_amount numeric not null default 0,
  add column if not exists payment_paid_at timestamptz;

create index if not exists idx_appointments_payment_status on public.appointments (payment_status);
create index if not exists idx_appointments_order_nsu on public.appointments (order_nsu);

comment on column public.appointments.payment_status is 'Status do pagamento do agendamento: aguardando_pagamento | pago | expirado | cancelado';
comment on column public.appointments.payment_provider is 'Provedor do pagamento online (ex.: infinitepay); nulo quando não há pagamento online';
comment on column public.appointments.order_nsu is 'NSU do pedido no provedor de pagamento — vínculo com public.payments.order_nsu';
comment on column public.appointments.transaction_nsu is 'NSU da transação de pagamento confirmada no provedor';
comment on column public.appointments.payment_amount is 'Valor efetivamente cobrado no pagamento online (R$)';
comment on column public.appointments.payment_paid_at is 'Momento em que o pagamento foi confirmado (status pago)';

-- ---------------------------------------------------------------------------
-- 4) Backfill: espelha nos agendamentos o pagamento mais recente registrado
-- ---------------------------------------------------------------------------
with latest_payment as (
  select distinct on (appointment_id)
    appointment_id, provider, status, amount, order_nsu, transaction_nsu, paid_at
  from public.payments
  order by appointment_id, created_at desc
)
update public.appointments a
set payment_status = case p.status
      when 'paid' then 'pago'
      when 'expired' then 'expirado'
      when 'canceled' then 'cancelado'
      else 'aguardando_pagamento'
    end,
    payment_provider = p.provider,
    payment_amount = p.amount,
    order_nsu = p.order_nsu,
    transaction_nsu = p.transaction_nsu,
    payment_paid_at = p.paid_at
from latest_payment p
where a.id = p.appointment_id
  and a.payment_status = 'aguardando_pagamento';
