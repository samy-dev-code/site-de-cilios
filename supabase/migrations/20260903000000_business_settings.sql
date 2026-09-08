-- Configurações gerais do negócio editáveis pelo painel /admin/configuracoes
insert into public.settings (key, value) values
  ('business_name', 'Mari Lash Designer'),
  ('whatsapp_number', '5514998792169'),
  ('instagram', 'marilashdesigner'),
  ('address', '')
on conflict (key) do nothing;
