-- Dois períodos de atendimento por dia (ex.: 08:00–11:00 e 18:30–20:30)
alter table public.business_hours
  add column if not exists open_time_2 time without time zone,
  add column if not exists close_time_2 time without time zone;

-- Horários atuais da profissional
update public.business_hours
set open_time = '08:00', close_time = '11:00',
    open_time_2 = '18:30', close_time_2 = '20:30'
where is_open = true;

-- Helper: hora -> minutos desde 00:00
create or replace function public.time_to_min(t time without time zone) returns int
language sql immutable as $$ select date_part('hour', t)::int * 60 + date_part('minute', t)::int $$;

-- create_booking passa a validar que o agendamento (início + duração) cabe
-- inteiramente dentro de um dos períodos configurados em business_hours.
create or replace function public.create_booking(
  p_service_id uuid, p_promotion_id uuid, p_client_name text, p_client_whatsapp text,
  p_appointment_date date, p_appointment_time time without time zone, p_payment_method text,
  p_notes text, p_coupon_code text, p_participants jsonb, p_appointment_type text
) returns jsonb
language plpgsql security definer set search_path = public
as $fn$
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
  v_type text := coalesce(nullif(btrim(coalesce(p_appointment_type,'')), ''), 'service');
  v_hours record;
  v_in_period boolean := false;
begin
  if coalesce(btrim(p_client_name), '') = '' or v_client = '' then
    return json_build_object('ok', false, 'error', 'Nome e WhatsApp são obrigatórios.');
  end if;
  if p_service_id is null and p_promotion_id is null then
    return json_build_object('ok', false, 'error', 'Selecione um serviço ou uma promoção.');
  end if;

  -- O agendamento precisa respeitar os períodos de atendimento do dia
  select * into v_hours from public.business_hours
    where weekday = date_part('isodow', p_appointment_date)::int % 7 and is_open = true;
  if not found then
    return json_build_object('ok', false, 'error', 'Não atendemos neste dia da semana.');
  end if;

  if p_service_id is not null then
    select * into v_svc from public.services where id = p_service_id and active = true and archived = false;
    if not found then
      return json_build_object('ok', false, 'error', 'Serviço indisponível.');
    end if;
    v_category_id := v_svc.category_id;
    if v_type = 'maintenance' then
      if not coalesce(v_svc.maintenance_enabled, false) or v_svc.maintenance_price is null then
        return json_build_object('ok', false, 'error', 'Este serviço não oferece manutenção.');
      end if;
      v_original := coalesce(v_svc.maintenance_promotional_price, v_svc.maintenance_price);
      v_dur := coalesce(v_svc.maintenance_duration_minutes, v_svc.duration_minutes, 60);
    else
      v_type := 'service';
      v_original := coalesce(v_svc.promotional_price, v_svc.price);
      v_dur := v_svc.duration_minutes;
    end if;
  else
    select * into v_promo from public.promotions
      where id = p_promotion_id and active = true and archived = false;
    if not found then
      return json_build_object('ok', false, 'error', 'Promoção indisponível.');
    end if;
    v_type := 'promotion';
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

  -- Dentro de algum dos períodos configurados no Admin (1 ou 2 períodos por dia)
  v_in_period :=
    (v_hours.open_time is not null and v_hours.close_time is not null
      and v_start >= public.time_to_min(v_hours.open_time) and v_end <= public.time_to_min(v_hours.close_time))
    or (v_hours.open_time_2 is not null and v_hours.close_time_2 is not null
      and v_start >= public.time_to_min(v_hours.open_time_2) and v_end <= public.time_to_min(v_hours.close_time_2));
  if not v_in_period then
    return json_build_object('ok', false, 'error', 'Este horário não está dentro dos períodos de atendimento. Escolha outro, por favor.');
  end if;

  -- Conflito real de intervalo: cada agendamento ocupa do próprio início
  -- até início + duration_minutes (armazenado na própria linha, cobrindo
  -- serviço, manutenção e promoção).
  select exists (
    select 1 from public.appointments a
    where a.appointment_date = p_appointment_date
      and a.status in ('pending','confirmed')
      and (date_part('hour', a.appointment_time)::int * 60 + date_part('minute', a.appointment_time)::int) < v_end
      and (date_part('hour', a.appointment_time)::int * 60 + date_part('minute', a.appointment_time)::int)
          + coalesce(a.duration_minutes, 60) > v_start
  ) into v_overlap;
  if v_overlap then
    return json_build_object('ok', false, 'error', 'Este horário acabou de ser preenchido. Escolha outro, por favor.');
  end if;

  insert into public.appointments (
    service_id, promotion_id, client_name, client_whatsapp,
    appointment_date, appointment_time, payment_method, notes,
    coupon_id, coupon_code, original_amount, promotion_discount,
    coupon_discount, total_discount, final_amount, participants_count,
    appointment_type, duration_minutes
  ) values (
    p_service_id, p_promotion_id, btrim(p_client_name), btrim(p_client_whatsapp),
    p_appointment_date, p_appointment_time, coalesce(nullif(p_payment_method,''), 'pending'), nullif(btrim(coalesce(p_notes,'')), ''),
    (v_coupon->>'coupon_id')::uuid, v_coupon->>'code', v_original, v_promo_discount,
    v_coupon_discount, v_total_discount, v_final, v_required,
    v_type, v_dur
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
end
$fn$;