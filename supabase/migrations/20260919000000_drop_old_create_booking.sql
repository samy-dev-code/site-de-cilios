-- Remove o overload antigo de create_booking (sem p_appointment_type),
-- que não gravava appointment_type nem duration_minutes.
drop function if exists public.create_booking(
  uuid, uuid, text, text, date, time without time zone, text, text, text, jsonb
);
