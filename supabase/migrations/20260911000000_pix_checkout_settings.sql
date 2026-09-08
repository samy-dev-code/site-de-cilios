-- Parte 3 — Pagamento PIX: configurações do checkout + bucket do QR Code
insert into public.settings (key, value) values
  ('pix_enabled', 'true'),
  ('pix_copia_e_cola', ''),
  ('pix_qr_url', '/pix-marilash.png')
on conflict (key) do nothing;

-- Bucket público para upload do QR Code PIX pelo painel admin
insert into storage.buckets (id, name, public) values ('pix', 'pix', true) on conflict (id) do nothing;

drop policy if exists "public read pix storage" on storage.objects;
create policy "public read pix storage" on storage.objects for select using (bucket_id = 'pix');
drop policy if exists "admin write pix storage" on storage.objects;
create policy "admin write pix storage" on storage.objects for all
  using (bucket_id = 'pix' and auth.role() = 'authenticated')
  with check (bucket_id = 'pix' and auth.role() = 'authenticated');
