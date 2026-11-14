-- =====================================================================
-- Upgrade 04 · Acceso SOLO al Kit COD con códigos de un solo uso
--   - Nuevo rol 'kit': entra únicamente a las herramientas del Kit COD.
--   - access_until: fecha en que vence su acceso (null = sin vencimiento).
--   - access_codes: códigos que genera el admin; cada uno sirve UNA vez.
--   Requiere haber aplicado antes upgrade-03-video-ia.sql.
-- =====================================================================

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'coach', 'member', 'kit'));
alter table public.profiles add column if not exists access_until timestamptz;
grant select (access_until) on public.profiles to authenticated;

-- is_active() = miembro de la academia completa. Las cuentas 'kit' NO lo son,
-- así que no ven cursos, comunidad, calendario, sesiones, ranking, etc.
create or replace function public.is_active()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active and role <> 'kit')
$$;

-- has_kit() = puede usar las herramientas del Kit (miembros completos y cuentas 'kit' con acceso vigente).
create or replace function public.has_kit()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active
      and (role <> 'kit' or access_until is null or access_until > now())
  )
$$;

-- Un usuario no puede cambiarse la fecha de vencimiento.
create or replace function public.protect_profile_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    new.role         := old.role;
    new.active       := old.active;
    new.email        := old.email;
    new.pending      := old.pending;
    new.access_until := old.access_until;
  end if;
  return new;
end;
$$;

-- Guion IA: también lo usan las cuentas 'kit'
drop policy if exists "guiones ia: crear propio" on public.ai_scripts;
create policy "guiones ia: crear propio" on public.ai_scripts
  for insert to authenticated with check (
    user_id = (select auth.uid()) and public.has_kit() and status = 'procesando' and result is null
  );

drop policy if exists "ai-videos: subir a su carpeta" on storage.objects;
create policy "ai-videos: subir a su carpeta" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'ai-videos' and public.has_kit() and split_part(name, '/', 1) = (select auth.uid())::text
  );

-- Códigos de acceso (solo el admin los ve)
create table if not exists public.access_codes (
  code        text primary key check (code ~ '^KIT-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$'),
  days        int check (days is null or days between 1 and 3650),
  note        text check (char_length(note) <= 200),
  created_by  uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  used_by     uuid references public.profiles(id) on delete set null,
  used_at     timestamptz
);
create index if not exists access_codes_created_idx on public.access_codes (created_at desc);
create index if not exists access_codes_used_by_idx on public.access_codes (used_by);
create index if not exists access_codes_created_by_idx on public.access_codes (created_by);

alter table public.access_codes enable row level security;
drop policy if exists "códigos kit: admin gestiona" on public.access_codes;
create policy "códigos kit: admin gestiona" on public.access_codes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.access_codes from anon;
grant select, insert, update, delete on public.access_codes to authenticated;
grant all on public.access_codes to service_role;

-- Canjea un código para un usuario: lo convierte en cuenta 'kit' (o le suma días si ya lo es).
-- Solo lo llama el servidor de la web (service role). Devuelve la nueva fecha de vencimiento.
create or replace function public.redeem_access_code(p_code text, p_user uuid)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare
  c public.access_codes;
  p public.profiles;
  new_until timestamptz;
begin
  select * into c from public.access_codes where code = p_code for update;
  if not found then raise exception 'codigo_invalido'; end if;
  if c.used_at is not null then raise exception 'codigo_usado'; end if;

  select * into p from public.profiles where id = p_user for update;
  if not found then raise exception 'sin_perfil'; end if;
  if p.role in ('admin', 'coach') or (p.role = 'member' and p.active) then raise exception 'acceso_completo'; end if;

  if c.days is null or (p.role = 'kit' and p.active and p.access_until is null) then
    new_until := null;
  else
    new_until := greatest(coalesce(case when p.role = 'kit' and p.active then p.access_until end, now()), now())
                 + make_interval(days => c.days);
  end if;

  update public.profiles set role = 'kit', active = true, pending = false, access_until = new_until where id = p_user;
  update public.access_codes set used_by = p_user, used_at = now() where code = c.code;
  return new_until;
end;
$$;

revoke execute on function public.redeem_access_code(text, uuid) from public, anon, authenticated;
grant execute on function public.redeem_access_code(text, uuid) to service_role;
