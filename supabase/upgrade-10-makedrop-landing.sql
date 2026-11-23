-- =====================================================================
-- Upgrade 10 · MakeDrop Landing (landing completa para Shopify con IA)
--   - ai_landings: cada landing que pide un alumno (texto + imágenes con Gemini).
--   - Bucket privado "makedrop": fotos del alumno, imágenes de la IA y las finales.
--   Requiere haber aplicado antes upgrade-04-acceso-kit.sql (usa has_kit()).
-- =====================================================================

create table if not exists public.ai_landings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  code          text not null default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8) check (code ~ '^[a-z0-9]{8}$'),
  product       text not null check (char_length(product) between 2 and 120),
  description   text not null check (char_length(description) between 10 and 2000),
  country       text not null default 'Colombia' check (char_length(country) <= 40),
  price         text not null check (char_length(price) between 1 and 40),
  compare_price text check (char_length(compare_price) <= 40),
  offer         text check (char_length(offer) <= 200),
  audience      text check (char_length(audience) <= 40),
  store_name    text check (char_length(store_name) <= 60),
  color         text check (color ~ '^#[0-9a-fA-F]{6}$'),
  reviews       text check (char_length(reviews) <= 4000),
  photo_paths   text[] not null default '{}' check (cardinality(photo_paths) <= 3),
  gif_path      text check (char_length(gif_path) <= 300),
  status        text not null default 'procesando' check (status in ('procesando', 'listo', 'error')),
  result        jsonb,
  images        jsonb,
  error         text check (char_length(error) <= 1000),
  created_at    timestamptz not null default now(),
  finished_at   timestamptz
);
create index if not exists ai_landings_user_idx on public.ai_landings (user_id, created_at desc);

alter table public.ai_landings enable row level security;

drop policy if exists "landings ia: ver propias o staff" on public.ai_landings;
create policy "landings ia: ver propias o staff" on public.ai_landings
  for select to authenticated using (user_id = (select auth.uid()) or public.is_staff());
drop policy if exists "landings ia: crear propia" on public.ai_landings;
create policy "landings ia: crear propia" on public.ai_landings
  for insert to authenticated with check (
    user_id = (select auth.uid()) and public.has_kit() and status = 'procesando' and result is null and images is null
  );
drop policy if exists "landings ia: borrar propia" on public.ai_landings;
create policy "landings ia: borrar propia" on public.ai_landings
  for delete to authenticated using (user_id = (select auth.uid()) or public.is_staff());
-- Solo la función del servidor (service role) actualiza estado, resultado e imágenes.
revoke all on public.ai_landings from anon;
grant select, insert, delete on public.ai_landings to authenticated;
grant all on public.ai_landings to service_role;

-- Límite de landings cada 30 días por tipo de alumno (el admin lo cambia en Ajustes)
alter table public.settings
  add column if not exists landing_limit_kit int not null default 2 check (landing_limit_kit between 0 and 100),
  add column if not exists landing_limit_member int not null default 10 check (landing_limit_member between 0 and 200);

-- Bucket privado: cada alumno solo ve y escribe en su carpeta (<user_id>/...)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('makedrop', 'makedrop', false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "makedrop: subir a su carpeta" on storage.objects;
create policy "makedrop: subir a su carpeta" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'makedrop' and public.has_kit() and split_part(name, '/', 1) = (select auth.uid())::text
  );
drop policy if exists "makedrop: reemplazar en su carpeta" on storage.objects;
create policy "makedrop: reemplazar en su carpeta" on storage.objects
  for update to authenticated using (
    bucket_id = 'makedrop' and public.has_kit() and split_part(name, '/', 1) = (select auth.uid())::text
  );
drop policy if exists "makedrop: ver los suyos" on storage.objects;
create policy "makedrop: ver los suyos" on storage.objects
  for select to authenticated using (bucket_id = 'makedrop' and split_part(name, '/', 1) = (select auth.uid())::text);
drop policy if exists "makedrop: borrar los suyos" on storage.objects;
create policy "makedrop: borrar los suyos" on storage.objects
  for delete to authenticated using (bucket_id = 'makedrop' and split_part(name, '/', 1) = (select auth.uid())::text);
