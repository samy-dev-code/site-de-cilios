-- Bucket público para upload de banners do painel administrativo
insert into storage.buckets (id, name, public) values ('banners', 'banners', true) on conflict (id) do nothing;

drop policy if exists "public read banners storage" on storage.objects;
create policy "public read banners storage" on storage.objects for select using (bucket_id = 'banners');

drop policy if exists "admin write banners storage" on storage.objects;
create policy "admin write banners storage" on storage.objects for all
  using (bucket_id = 'banners' and auth.role() = 'authenticated')
  with check (bucket_id = 'banners' and auth.role() = 'authenticated');
