-- =====================================================================
-- Upgrade 03 · Guion IA desde un video ganador (Gemini)
-- =====================================================================

create table if not exists public.ai_scripts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  product      text not null check (char_length(product) between 2 and 120),
  description  text not null check (char_length(description) between 5 and 1500),
  country      text not null default 'Colombia' check (char_length(country) <= 40),
  price        text check (char_length(price) <= 40),
  offer        text check (char_length(offer) <= 200),
  format       text not null default 'mismo' check (char_length(format) <= 40),
  video_path   text check (char_length(video_path) <= 300),
  status       text not null default 'procesando' check (status in ('procesando', 'listo', 'error')),
  result       jsonb,
  error        text check (char_length(error) <= 1000),
  created_at   timestamptz not null default now(),
  finished_at  timestamptz
);
create index if not exists ai_scripts_user_idx on public.ai_scripts (user_id, created_at desc);

alter table public.ai_scripts enable row level security;

create policy "guiones ia: ver propios o staff" on public.ai_scripts
  for select to authenticated using (user_id = (select auth.uid()) or public.is_staff());
create policy "guiones ia: crear propio" on public.ai_scripts
  for insert to authenticated with check (
    user_id = (select auth.uid()) and public.is_active() and status = 'procesando' and result is null
  );
create policy "guiones ia: borrar propio" on public.ai_scripts
  for delete to authenticated using (user_id = (select auth.uid()) or public.is_staff());
-- Solo la función del servidor (service role) actualiza estado y resultado.

-- Bucket privado para los videos (se borran después del análisis)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ai-videos', 'ai-videos', false, 104857600, array['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v', 'video/3gpp'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "ai-videos: subir a su carpeta" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'ai-videos' and public.is_active() and split_part(name, '/', 1) = (select auth.uid())::text
  );
create policy "ai-videos: ver los suyos" on storage.objects
  for select to authenticated using (bucket_id = 'ai-videos' and split_part(name, '/', 1) = (select auth.uid())::text);
create policy "ai-videos: borrar los suyos" on storage.objects
  for delete to authenticated using (bucket_id = 'ai-videos' and split_part(name, '/', 1) = (select auth.uid())::text);
