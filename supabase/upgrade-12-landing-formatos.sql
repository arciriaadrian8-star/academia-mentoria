-- =====================================================================
-- Upgrade 12 · Formatos de MakeDrop Landing
--   completa = textos + fotos con IA (cuesta points_landing)
--   rapida   = textos + imágenes armadas con la foto del alumno (cuesta points_landing_text)
--   texto    = título y descripción · prompts = prompts para hacer las fotos gratis en Gemini
--   El alumno puede subir sus propias fotos (hechas en Gemini) para «despues», «usos» o «antes».
--   Requiere haber aplicado antes upgrade-11-puntos-ia.sql.
-- =====================================================================

alter table public.ai_landings
  add column if not exists mode text not null default 'completa' check (mode in ('completa', 'rapida', 'texto', 'prompts'));

alter table public.settings
  add column if not exists points_landing_text int not null default 30 check (points_landing_text between 0 and 100000);

-- El alumno sube su propia foto (hecha en Gemini) para «despues», «usos» o «antes».
create or replace function public.set_landing_photo(p_id uuid, p_slot text, p_path text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_slot not in ('despues', 'usos', 'antes') then
    raise exception 'foto_invalida';
  end if;
  if p_path is null or split_part(p_path, '/', 1) <> (select auth.uid())::text or split_part(p_path, '/', 2) <> p_id::text
     or p_path !~ '^[0-9a-f-]+/[0-9a-f-]+/mine-(despues|usos|antes)-[0-9]+\.jpg$' then
    raise exception 'ruta_invalida';
  end if;
  update public.ai_landings
     set images = coalesce(images, '{}'::jsonb) || jsonb_build_object(p_slot, p_path),
         result = case when result is null then result
                       else jsonb_set(result, '{modelos_fotos}', coalesce(result->'modelos_fotos', '{}'::jsonb) || jsonb_build_object(p_slot, 'mi-foto')) end
   where id = p_id and user_id = (select auth.uid()) and status = 'listo';
  if not found then
    raise exception 'no_encontrada';
  end if;
end;
$$;
revoke execute on function public.set_landing_photo(uuid, text, text) from public, anon;
grant execute on function public.set_landing_photo(uuid, text, text) to authenticated;
