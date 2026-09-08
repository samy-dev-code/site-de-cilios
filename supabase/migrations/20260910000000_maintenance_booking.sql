-- Manutenção: RPC que cria um agendamento de manutenção vinculado ao
-- atendimento original (related_appointment_id), validando disponibilidade
-- no backend (horário de funcionamento, bloqueios, conflitos por duração).
-- Registra o evento no histórico dos DOIS agendamentos (novo e original).

create or replace function public.create_maintenance_booking(
  p_original_appointment_id uuid,
  p_service_id uuid,
  p_date date,
  p_time time,
  p_notes text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orig public.appointments%rowtype;
  v_svc public.services%rowtype;
  v_start int; v_end int;
  v_dur int;
  v_open_time time; v_close_time time;
  v_close_min int;
  v_overlap boolean;
  v_new_id uuid;
begin
  select * into v_orig from public.appointments where id = p_original_appointment_id;
  if not found then
    return json_build_object('ok', false, 'error', 'Atendimento original não encontrado.');
  end if;
  if v_orig.status <> 'completed' then
    return json_build_object('ok', false, 'error', 'A manutenção só pode ser agendada após a conclusão do atendimento.');
  end if;

  select * into v_svc from public.services where id = p_service_id and active = true and archived = false;
  if not found then
    return json_build_object('ok', false, 'error', 'Serviço de manutenção não encontrado ou indisponível.');
  end if;

  v_dur := coalesce(v_svc.duration_minutes, 60);
  if v_dur <= 0 then v_dur := 60; end if;
  v_start := date_part('hour', p_time)::int * 60 + date_part('minute', p_time)::int;
  v_end := v_start + v_dur;

  select open_time, close_time into v_open_time, v_close_time
    from public.business_hours where weekday = date_part('dow', p_date)::int;
  if not found or v_open_time is null or v_close_time is null then
    return json_build_object('ok', false, 'error', 'O estúdio está fechado nesse dia da semana.');
  end if;

  v_close_min := date_part('hour', v_close_time)::int * 60 + date_part('minute', v_close_time)::int;
  if v_start < date_part('hour', v_open_time)::int * 60 + date_part('minute', v_open_time)::int
     or v_end > v_close_min then
    return json_build_object('ok', false, 'error', 'O horário escolhido está fora do horário de funcionamento (o serviço precisa terminar antes do fechamento).');
  end if;

  if exists (select 1 from public.blocked_dates where blocked_date = p_date) then
    return json_build_object('ok', false, 'error', 'O estúdio está fechado nessa data (bloqueio ou folga).');
  end if;

  select exists (
    select 1 from public.appointments a
    left join public.services s on s.id = a.service_id
    where a.appointment_date = p_date
      and a.status in ('pending','confirmed','in_progress')
      and (date_part('hour', a.appointment_time)::int * 60 + date_part('minute', a.appointment_time)::int) < v_end
      and (date_part('hour', a.appointment_time)::int * 60 + date_part('minute', a.appointment_time)::int)
          + coalesce(s.duration_minutes, 60) > v_start
  ) into v_overlap;
  if v_overlap then
    return json_build_object('ok', false, 'error', 'Esse horário acabou de ser reservado. Escolha outro horário.');
  end if;

  insert into public.appointments (
    service_id, client_name, client_whatsapp, appointment_date, appointment_time,
    status, notes, payment_method, final_amount, original_amount,
    related_appointment_id
  ) values (
    p_service_id, v_orig.client_name, v_orig.client_whatsapp, p_date, p_time,
    'pending', nullif(btrim(coalesce(p_notes,'')), ''), 'pending',
    coalesce(v_svc.promotional_price, v_svc.price), coalesce(v_svc.promotional_price, v_svc.price),
    p_original_appointment_id
  ) returning id into v_new_id;

  insert into public.appointment_history (appointment_id, action, description, changed_by)
  values
    (v_new_id, 'maintenance_created',
      'Manutenção agendada (origem: atendimento de ' || to_char(v_orig.appointment_date, 'DD/MM/YYYY') || ')',
      'Admin'),
    (p_original_appointment_id, 'maintenance_scheduled',
      'Manutenção agendada para ' || to_char(p_date, 'DD/MM/YYYY') || ' às ' || to_char(p_time, 'HH24:MI')
        || ' (' || v_svc.name || ')',
      'Admin');

  return json_build_object('ok', true, 'appointment_id', v_new_id);
end $$;

grant execute on function public.create_maintenance_booking(uuid, uuid, date, time, text) to authenticated;
