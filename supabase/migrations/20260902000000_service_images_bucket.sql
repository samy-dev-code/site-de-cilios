-- Bucket público para imagens dos serviços (upload pelo painel admin).
insert into storage.buckets (id, name, public) values ('service-images','service-images', true)
on conflict (id) do nothing;

drop policy if exists "public read service images" on storage.objects;
create policy "public read service images" on storage.objects for select using (bucket_id = 'service-images');
drop policy if exists "admin upload service images" on storage.objects;
create policy "admin upload service images" on storage.objects for insert to authenticated with check (bucket_id = 'service-images');
drop policy if exists "admin update service images" on storage.objects;
create policy "admin update service images" on storage.objects for update to authenticated using (bucket_id = 'service-images');
