-- Leitura pública deve mostrar apenas serviços ativos E não arquivados
drop policy "public read active services" on public.services;
create policy "public read active services" on public.services
for select to anon
using (active = true and archived = false);
