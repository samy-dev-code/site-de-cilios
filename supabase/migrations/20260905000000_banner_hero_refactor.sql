-- Banner hero full-width: encaixe, posição e altura configuráveis por banner
alter table public.banners
  add column if not exists object_fit text not null default 'cover',
  add column if not exists object_position text not null default 'center',
  add column if not exists height_mode text not null default 'default',
  add column if not exists title_size text not null default 'normal',
  add column if not exists overlay_opacity int not null default 55;
