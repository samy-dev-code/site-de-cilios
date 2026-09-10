-- Manutenção passa a viver DENTRO do registro do serviço
-- (colunas maintenance_enabled / maintenance_price / maintenance_promotional_price /
--  maintenance_duration_minutes já existem e são usadas por create_booking e
--  create_maintenance_booking). Remove o vínculo antigo com serviço separado.
-- O serviço duplicado "Manutenção ..." é arquivado (não excluído, preservando histórico).

-- Arquiva qualquer serviço que existia apenas como "manutenção" de outro
update services s
set active = false, archived = true, featured = false
where exists (select 1 from services o where o.maintenance_service_id = s.id);

-- Limpa a referência antiga
update services set maintenance_service_id = null where maintenance_service_id is not null;

-- Nota: create_booking (com p_appointment_type='maintenance') e
-- create_maintenance_booking já leem os campos embutidos do próprio serviço.
