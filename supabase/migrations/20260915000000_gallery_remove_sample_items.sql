-- Remove itens de exemplo hardcoded (fotos /galeria/cliente-*.jpeg que não existem mais).
delete from public.gallery_items where before_url = '' and after_url like '/galeria/%';
