-- Promoções, cupons, participantes de agendamento e validação server-side de valores.

-- ============ PROMOÇÕES ============
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_url text,
  discount_type text not null default 'percentage' check (discount_type in ('percentage','fixed')),
  discount_value numeric(10,2) not null default 0 check (discount_value >= 0),
  participants int not null default 1 check (participants between 1 and 20),
  service_ids uuid[] not null default '{}',
  price numeric(10,2),
  start_date date,
  end_date date,
  active boolean not null default true,
  archived boolean not null default false,
  featured boolean not null default false,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_promotions_public on public.promotions(active, archived, display_order);

-- ============ CUPONS ============
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text,
  description text,
  discount_type text not null default 'percentage' check (discount_type in ('percentage','fixed')),
  discount_value numeric(10,2) not null default 0 check (discount_value >= 0),
  start_date date,
  end_date date,
  active boolean not null default true,
  archived boolean not null default false,
  max_uses int,
  max_uses_per_client int,
  min_amount numeric(10,2) not null default 0 check (min_amount >= 0),
  service_ids uuid[] not null default '{}',
  category_ids uuid[] not null default '{}',
  promotion_ids uuid[] not null default '{}',
  allow_with_promotion boolean not null default false,
  uses int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_coupons_code on public.coupons(upper(code));

-- ============ REGISTROS DE USO DE CUPOM ============
create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  appointment_id uuid,
  client_whatsapp text not null,
  discount_amount numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_redemptions_coupon on public.coupon_redemptions(coupon_id);
create index if not exists idx_redemptions_client on public.coupon_redemptions(client_whatsapp);

-- ============ PARTICIPANTES DO AGENDAMENTO ============
create table if not exists public.appointment_participants (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  participant_number int not null default 1,
  name text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_participants_appointment on public.appointment_participants(appointment_id);

-- ============ COLUNAS DE VALOR NO AGENDAMENTO ============
alter table public.appointments
  add column if not exists promotion_id uuid references public.promotions(id) on delete set null,
  add column if not exists coupon_id uuid references public.coupons(id) on delete set null,
  add column if not exists coupon_code text,
  add column if not exists original_amount numeric(10,2) not null default 0,
  add column if not exists promotion_discount numeric(10,2) not null default 0,
  add column if not exists coupon_discount numeric(10,2) not null default 0,
  add column if not exists total_discount numeric(10,2) not null default 0,
  add column if not exists final_amount numeric(10,2) not null default 0,
  add column if not exists participants_count int not null default 1;

-- Forma de pagamento ainda não escolhida
alter table public.appointments drop constraint if exists appointments_payment_method_check;
alter table public.appointments add constraint appointments_payment_method_check
  check (payment_method = any (array['pix','cash','card','pending']));

-- ============ RLS ============
alter table public.promotions enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.appointment_participants enable row level security;

drop policy if exists "public read active promotions" on public.promotions;
create policy "public read active promotions" on public.promotions
  for select using ((active = true and archived = false) or auth.role() = 'authenticated');
drop policy if exists "admin write promotions" on public.promotions;
create policy "admin write promotions" on public.promotions
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "admin read coupons" on public.coupons;
create policy "admin read coupons" on public.coupons for select using (auth.role() = 'authenticated');
drop policy if exists "admin write coupons" on public.coupons;
create policy "admin write coupons" on public.coupons
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "admin read redemptions" on public.coupon_redemptions;
create policy "admin read redemptions" on public.coupon_redemptions for select using (auth.role() = 'authenticated');

drop policy if exists "public read participants" on public.appointment_participants;
create policy "public read participants" on public.appointment_participants for select using (true);
drop policy if exists "public insert participants" on public.appointment_participants;
create policy "public insert participants" on public.appointment_participants for insert with check (true);
drop policy if exists "admin update participants" on public.appointment_participants;
create policy "admin update participants" on public.appointment_participants for update using (auth.role() = 'authenticated');
drop policy if exists "admin delete participants" on public.appointment_participants;
create policy "admin delete participants" on public.appointment_participants for delete using (auth.role() = 'authenticated');

-- ============ updated_at ============
drop trigger if exists trg_promotions_updated_at on public.promotions;
create trigger trg_promotions_updated_at before update on public.promotions
  for each row execute function public.set_updated_at();
drop trigger if exists trg_coupons_updated_at on public.coupons;
create trigger trg_coupons_updated_at before update on public.coupons
  for each row execute function public.set_updated_at();

-- ============================================================
-- Validação de cupom no servidor (o público não lê a tabela coupons)
-- ============================================================
create or replace function public.validate_coupon(
  p_code text,
  p_base_amount numeric,
  p_client_whatsapp text,
  p_service_id uuid default null,
  p_category_id uuid default null,
  p_promotion_id uuid default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.coupons%rowtype;
  v_client text := regexp_replace(coalesce(p_client_whatsapp,''), '\D', '', 'g');
  v_discount numeric;
  v_has_promo boolean := p_promotion_id is not null;
begin
  select * into c from public.coupons
    where upper(btrim(p_code)) = upper(code) and archived = false limit 1;

  if not found then
    return json_build_object('valid', false, 'error', 'Cupom não encontrado.');
  end if;
  if not c.active then
    return json_build_object('valid', false, 'error', 'Este cupom está desativado.');
  end if;
  if c.start_date is not null and current_date < c.start_date then
    return json_build_object('valid', false, 'error', 'Este cupom ainda não começou a valer.');
  end if;
  if c.end_date is not null and current_date > c.end_date then
    return json_build_object('valid', false, 'error', 'Este cupom está expirado.');
  end if;
  if c.max_uses is not null and c.uses >= c.max_uses then
    return json_build_object('valid', false, 'error', 'Este cupom atingiu o limite de utilizações.');
  end if;
  if v_has_promo and not c.allow_with_promotion then
    return json_build_object('valid', false, 'error', 'Este cupom não pode ser acumulado com promoções.');
  end if;
  if c.promotion_ids is not null and array_length(c.promotion_ids, 1) > 0
     and (p_promotion_id is null or not (p_promotion_id = any(c.promotion_ids))) then
    return json_build_object('valid', false, 'error', 'Este cupom não vale para a promoção selecionada.');
  end if;
  if c.service_ids is not null and array_length(c.service_ids, 1) > 0
     and (p_service_id is null or not (p_service_id = any(c.service_ids))) then
    return json_build_object('valid', false, 'error', 'Este cupom não vale para este serviço.');
  end if;
  if c.category_ids is not null and array_length(c.category_ids, 1) > 0
     and (p_category_id is null or not (p_category_id = any(c.category_ids))) then
    return json_build_object('valid', false, 'error', 'Este cupom não vale para esta categoria.');
  end if;
  if p_base_amount is null or p_base_amount < c.min_amount then
    return json_build_object('valid', false, 'error',
      format('Este cupom exige um valor mínimo de R$ %s.', to_char(c.min_amount, 'FM999990.00')));
  end if;
  if c.max_uses_per_client is not null and v_client <> '' then
    if (select count(*) from public.coupon_redemptions r
        where r.coupon_id = c.id and r.client_whatsapp = v_client) >= c.max_uses_per_client then
      return json_build_object('valid', false, 'error', 'Você já utilizou este cupom o número máximo de vezes.');
    end if;
  end if;

  v_discount := case
    when c.discount_type = 'percentage' then round(p_base_amount * c.discount_value / 100.0, 2)
    else least(c.discount_value, p_base_amount)
  end;

  return json_build_object(
    'valid', true,
    'coupon_id', c.id,
    'code', c.code,
    'name', c.name,
    'discount_type', c.discount_type,
    'discount_value', c.discount_value,
    'discount_amount', v_discount
  );
end $$;

grant execute on function public.validate_coupon(text, numeric, text, uuid, uuid, uuid) to anon, authenticated;

-- ============================================================
-- Criação de agendamento com validação server-side de TODOS os valores.
-- O frontend nunca manda preço: o banco calcula original, descontos e final.
-- ============================================================
create or replace function public.create_booking(
  p_service_id uuid default null,
  p_promotion_id uuid default null,
  p_client_name text default null,
  p_client_whatsapp text default null,
  p_appointment_date date default null,
  p_appointment_time time default null,
  p_payment_method text default 'pending',
  p_notes text default null,
  p_coupon_code text default null,
  p_participants jsonb default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_svc public.services%rowtype;
  v_promo public.promotions%rowtype;
  v_client text := regexp_replace(coalesce(p_client_whatsapp,''), '\D', '', 'g');
  v_names text[];
  v_required int := 1;
  v_original numeric;
  v_promo_discount numeric := 0;
  v_coupon jsonb;
  v_coupon_discount numeric := 0;
  v_total_discount numeric;
  v_final numeric;
  v_appt_id uuid;
  v_start int; v_end int; v_dur int;
  v_overlap boolean;
  v_category_id uuid;
begin
  if coalesce(btrim(p_client_name), '') = '' or v_client = '' then
    return json_build_object('ok', false, 'error', 'Nome e WhatsApp são obrigatórios.');
  end if;
  if p_service_id is null and p_promotion_id is null then
    return json_build_object('ok', false, 'error', 'Selecione um serviço ou uma promoção.');
  end if;

  if p_service_id is not null then
    select * into v_svc from public.services where id = p_service_id and active = true and archived = false;
    if not found then
      return json_build_object('ok', false, 'error', 'Serviço indisponível.');
    end if;
    v_original := coalesce(v_svc.promotional_price, v_svc.price);
    v_dur := v_svc.duration_minutes;
    v_category_id := v_svc.category_id;
  else
    select * into v_promo from public.promotions
      where id = p_promotion_id and active = true and archived = false;
    if not found then
      return json_build_object('ok', false, 'error', 'Promoção indisponível.');
    end if;
    if v_promo.start_date is not null and current_date < v_promo.start_date then
      return json_build_object('ok', false, 'error', 'Esta promoção ainda não começou.');
    end if;
    if v_promo.end_date is not null and current_date > v_promo.end_date then
      return json_build_object('ok', false, 'error', 'Esta promoção já terminou.');
    end if;
    v_required := v_promo.participants;
    v_names := coalesce(
      (select array_agg(btrim(elem->>'name')) from jsonb_array_elements(p_participants) elem
        where coalesce(btrim(elem->>'name'), '') <> ''),
      '{}'
    );
    if coalesce(array_length(v_names, 1), 0) < v_required then
      return json_build_object('ok', false, 'error',
        format('Esta promoção exige %s participante(s) com nome informado.', v_required));
    end if;

    select coalesce(sum(duration_minutes), 60) into v_dur
      from public.services where v_promo.service_ids is not null and id = any(v_promo.service_ids);

    if v_promo.price is not null then
      v_original := v_promo.price;
    else
      select coalesce(sum(coalesce(promotional_price, price)), 0) into v_original
        from public.services where v_promo.service_ids is not null and id = any(v_promo.service_ids);
      if v_original = 0 then
        return json_build_object('ok', false, 'error', 'Promoção sem serviços ou preço configurado.');
      end if;
    end if;

    v_promo_discount := case
      when v_promo.discount_type = 'percentage' then round(v_original * v_promo.discount_value / 100.0, 2)
      else least(v_promo.discount_value, v_original)
    end;
  end if;

  if coalesce(btrim(p_coupon_code), '') <> '' then
    v_coupon := public.validate_coupon(
      btrim(p_coupon_code),
      v_original - v_promo_discount,
      v_client,
      p_service_id,
      v_category_id,
      p_promotion_id
    );
    if not (v_coupon->>'valid')::boolean then
      return json_build_object('ok', false, 'error', v_coupon->>'error');
    end if;
    v_coupon_discount := (v_coupon->>'discount_amount')::numeric;
  end if;

  v_total_discount := v_promo_discount + v_coupon_discount;
  v_final := greatest(v_original - v_total_discount, 0);

  if v_dur is null or v_dur <= 0 then v_dur := 60; end if;
  v_start := date_part('hour', p_appointment_time)::int * 60 + date_part('minute', p_appointment_time)::int;
  v_end := v_start + v_dur;
  select exists (
    select 1 from public.appointments a
    left join public.services s on s.id = a.service_id
    where a.appointment_date = p_appointment_date
      and a.status in ('pending','confirmed')
      and (date_part('hour', a.appointment_time)::int * 60 + date_part('minute', a.appointment_time)::int) < v_end
      and (date_part('hour', a.appointment_time)::int * 60 + date_part('minute', a.appointment_time)::int)
          + coalesce(s.duration_minutes, 60) > v_start
  ) into v_overlap;
  if v_overlap then
    return json_build_object('ok', false, 'error', 'Este horário acabou de ser preenchido. Escolha outro, por favor.');
  end if;

  insert into public.appointments (
    service_id, promotion_id, client_name, client_whatsapp,
    appointment_date, appointment_time, payment_method, notes,
    coupon_id, coupon_code, original_amount, promotion_discount,
    coupon_discount, total_discount, final_amount, participants_count
  ) values (
    p_service_id, p_promotion_id, btrim(p_client_name), btrim(p_client_whatsapp),
    p_appointment_date, p_appointment_time, coalesce(nullif(p_payment_method,''), 'pending'), nullif(btrim(coalesce(p_notes,'')), ''),
    (v_coupon->>'coupon_id')::uuid, v_coupon->>'code', v_original, v_promo_discount,
    v_coupon_discount, v_total_discount, v_final, v_required
  ) returning id into v_appt_id;

  if v_required > 1 or (v_names is not null and array_length(v_names,1) > 0) then
    insert into public.appointment_participants (appointment_id, participant_number, name)
    select v_appt_id, n, v_names[n]
    from generate_subscripts(v_names, 1) as n;
  end if;

  if v_coupon ? 'coupon_id' then
    insert into public.coupon_redemptions (coupon_id, appointment_id, client_whatsapp, discount_amount)
    values ((v_coupon->>'coupon_id')::uuid, v_appt_id, v_client, v_coupon_discount);
    update public.coupons set uses = uses + 1 where id = (v_coupon->>'coupon_id')::uuid;
  end if;

  return json_build_object(
    'ok', true,
    'appointment_id', v_appt_id,
    'original_amount', v_original,
    'promotion_discount', v_promo_discount,
    'coupon_discount', v_coupon_discount,
    'total_discount', v_total_discount,
    'final_amount', v_final
  );
end $$;

grant execute on function public.create_booking(uuid, uuid, text, text, date, time, text, text, text, jsonb) to anon, authenticated;
