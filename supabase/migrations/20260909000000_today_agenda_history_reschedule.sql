-- Agenda do dia, histórico de alterações, status "em andamento"/"reagendado"
-- e reagendamento com revalidação de conflitos no backend.

-- ============ HISTÓRICO DE AGENDAMENTOS ============
create table if not exists public.appointment_history (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  action text not null,
  description text not null,
  changed_by text,
  created_at timestamptz not null default now()
);
create index if not exists idx_appointment_history_appt on public.appointment_history(appointment_id, created_at);

alter table public.appointments enable row level security;

drop policy if exists "admin read appointment history" on public.appointment_history;
create policy "admin read appointment history" on public.appointment_history
  for select using (auth.role() = 'authenticated');
drop policy if exists "admin write appointment history" on public.appointment_history;
create policy "admin write appointment history" on public.appointment_history
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Colunas de reagendamento e vínculo entre agendamentos (ex.: manutenção)
alter table public.appointments
  add column if not exists rescheduled_from_date date,
  add column if not exists rescheduled_from_time time,
  add column if not exists related_appointment_id uuid references public.appointments(id) on delete set null;

-- Novos status: em andamento e reagendado
alter table public.appointments drop constraint if exists appointments_status_check;
alter table public.appointments add constraint appointments_status_check
  check (status = any (array['pending','confirmed','cancelled','completed','in_progress','rescheduled']));

-- ============ RPC: mudar status (registrando no histórico) ============
create or replace function public.set_appointment_status(
  p_appointment_id uuid,
  p_status text,
  p_changed_by text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old text;
  v_desc text;
begin
  if p_status not in ('pending','confirmed','cancelled','completed','in_progress','rescheduled') then
    return json_build_object('ok', false, 'error', 'Status inválido.');
  end if;

  select status into v_old from public.appointments where id = p_appointment_id;
  if not found then
    return json_build_object('ok', false, 'error', 'Agendamento não encontrado.');
  end if;
  if v_old = p_status then
    return json_build_object('ok', true, 'status', v_old);
  end if;

  v_desc := case p_status
    when 'confirmed'   then 'Atendimento confirmado'
    when 'pending'     then 'Retornado para pendente'
    when 'cancelled'   then 'Atendimento cancelado'
    when 'completed'   then 'Atendimento concluído'
    when 'in_progress' then 'Atendimento iniciado (em andamento)'
    when 'rescheduled' then 'Atendimento reagendado'
    else p_status
  end;

  update public.appointments set status = p_status where id = p_appointment_id;

  insert into public.appointment_history (appointment_id, action, description, changed_by)
  values (p_appointment_id, 'status_' || p_status, v_desc, p_changed_by);

  return json_build_object('ok', true, 'status', p_status);
end $$;

grant execute on function public.set_appointment_status(uuid, text, text) to authenticated;

-- ============ RPC: reagendar com revalidação de conflito no backend ============
create or replace function public.reschedule_appointment(
  p_appointment_id uuid,
  p_new_date date,
  p_new_time time,
  p_reason text default null,
  p_changed_by text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appt public.appointments%rowtype;
  v_dur int;
  v_start int; v_end int;
  v_overlap boolean;
  v_old_br text; v_new_br text;
begin
  select * into v_appt from public.appointments where id = p_appointment_id;
  if not found then
    return json_build_object('ok', false, 'error', 'Agendamento não encontrado.');
  end if;
  if v_appt.status = 'cancelled' then
    return json_build_object('ok', false, 'error', 'Não é possível reagendar um agendamento cancelado.');
  end if;
  if v_appt.appointment_date = p_new_date and v_appt.appointment_time = p_new_time then
    return json_build_object('ok', false, 'error', 'Escolha uma data ou horário diferente do atual.');
  end if;

  select coalesce(duration_minutes, 60) into v_dur
    from public.services where id = v_appt.service_id;
  if v_dur is null or v_dur <= 0 then v_dur := 60; end if;

  v_start := date_part('hour', p_new_time)::int * 60 + date_part('minute', p_new_time)::int;
  v_end := v_start + v_dur;

  select exists (
    select 1 from public.appointments a
    left join public.services s on s.id = a.service_id
    where a.appointment_date = p_new_date
      and a.id <> p_appointment_id
      and a.status in ('pending','confirmed','in_progress')
      and (date_part('hour', a.appointment_time)::int * 60 + date_part('minute', a.appointment_time)::int) < v_end
      and (date_part('hour', a.appointment_time)::int * 60 + date_part('minute', a.appointment_time)::int)
          + coalesce(s.duration_minutes, 60) > v_start
  ) into v_overlap;
  if v_overlap then
    return json_build_object('ok', false, 'error', 'Esse horário acabou de ser reservado. Escolha outro horário.');
  end if;

  v_old_br := to_char(v_appt.appointment_date, 'DD/MM/YYYY') || ' às ' || to_char(v_appt.appointment_time, 'HH24:MI');
  v_new_br := to_char(p_new_date, 'DD/MM/YYYY') || ' às ' || to_char(p_new_time, 'HH24:MI');

  update public.appointments
    set rescheduled_from_date = v_appt.appointment_date,
        rescheduled_from_time = v_appt.appointment_time,
        appointment_date = p_new_date,
        appointment_time = p_new_time,
        status = case when v_appt.status = 'pending' then 'pending' else 'confirmed' end
    where id = p_appointment_id;

  insert into public.appointment_history (appointment_id, action, description, changed_by)
  values (
    p_appointment_id,
    'rescheduled',
    'Agendamento reagendado: ' || v_old_br || ' → ' || v_new_br
      || case when coalesce(btrim(coalesce(p_reason,'')), '') <> ''
              then ' · Motivo: ' || btrim(p_reason) else '' end,
    p_changed_by
  );

  return json_build_object('ok', true);
end $$;

grant execute on function public.reschedule_appointment(uuid, date, time, text, text) to authenticated;
