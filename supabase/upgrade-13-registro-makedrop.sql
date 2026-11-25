-- =====================================================================
-- Upgrade 13 · Registro desde la página de MakeDrop
--   El formulario de registro pregunta «¿Eres miembro de la Academia?» (metadato academy_member).
--   Sí  → cuenta de la academia esperando aprobación del admin (como siempre).
--   No  → cuenta MakeDrop IA (rol kit) sin acceso hasta que active su membresía en /membresia.
--   Ninguna de las dos respuestas da acceso por sí sola.
--   Requiere haber aplicado antes upgrade-12-landing-formatos.sql.
-- =====================================================================

alter table public.profiles add column if not exists academy_member boolean;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_first boolean;
  approve boolean;
  answer text := lower(coalesce(new.raw_user_meta_data ->> 'academy_member', ''));
  is_member boolean := case when answer in ('si', 'sí', 'true') then true when answer in ('no', 'false') then false else null end;
begin
  select not exists (select 1 from public.profiles) into is_first;
  select coalesce((select auto_approve from public.settings where id = 1), false) into approve;
  insert into public.profiles (id, email, full_name, avatar_url, role, active, pending, academy_member)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    case when is_first then 'admin' when is_member = false then 'kit' else 'member' end,
    is_first or (approve and is_member is not false),
    not is_first and not approve and is_member is not false,
    is_member
  );
  return new;
end;
$$;
