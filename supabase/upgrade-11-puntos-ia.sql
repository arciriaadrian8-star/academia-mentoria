-- =====================================================================
-- Upgrade 11 · Puntos de IA mensuales
--   Cada alumno tiene una bolsa de puntos al mes (se recarga el día 1, hora de Colombia).
--   Cada acción de IA descuenta puntos: crear landing, rehacer una foto, etc.
--   El admin elige los puntos por defecto (Ajustes) y los de cada alumno (ficha del miembro).
--   Reemplaza los límites por número fijo o por % del pago (upgrade 10).
--   Requiere haber aplicado antes upgrade-10-makedrop-landing.sql.
-- =====================================================================

alter table public.settings
  drop column if exists landing_limit_mode,
  drop column if exists landing_monthly_kit,
  drop column if exists landing_monthly_member,
  drop column if exists landing_budget_pct,
  drop column if exists landing_default_usd_kit,
  drop column if exists landing_default_usd_member,
  add column if not exists points_monthly_kit int not null default 1000 check (points_monthly_kit between 0 and 1000000),
  add column if not exists points_monthly_member int not null default 1000 check (points_monthly_member between 0 and 1000000),
  add column if not exists points_landing int not null default 270 check (points_landing between 0 and 100000),
  add column if not exists points_redo int not null default 80 check (points_redo between 0 and 100000),
  -- Tope de gasto de IA por landing (COP): la IA hace las fotos de mejor calidad que quepan en el tope.
  add column if not exists landing_max_cop int not null default 500 check (landing_max_cop between 0 and 10000);

-- Puntos mensuales de cada alumno (vacío = los de Ajustes según su tipo).
alter table public.member_billing drop column if exists monthly_usd;
alter table public.member_billing add column if not exists monthly_points int check (monthly_points between 0 and 1000000);

-- Cada gasto de puntos (solo lo escribe el servidor).
create table if not exists public.ai_points_usage (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  action     text not null check (action in ('landing', 'rehacer_foto', 'guion')),
  points     int not null check (points between 0 and 100000),
  ref_id     uuid,
  created_at timestamptz not null default now()
);
create index if not exists ai_points_usage_user_idx on public.ai_points_usage (user_id, created_at desc);
alter table public.ai_points_usage enable row level security;
drop policy if exists "puntos: ver los propios o staff" on public.ai_points_usage;
create policy "puntos: ver los propios o staff" on public.ai_points_usage
  for select to authenticated using (user_id = (select auth.uid()) or public.is_staff());
revoke all on public.ai_points_usage from anon, authenticated;
grant select on public.ai_points_usage to authenticated;
grant all on public.ai_points_usage to service_role;

-- Inicio del mes actual en hora de Colombia.
create or replace function public.points_month_start()
returns timestamptz language sql stable set search_path = public as $$
  select date_trunc('month', now() at time zone 'America/Bogota') at time zone 'America/Bogota'
$$;

-- Bolsa del mes de un usuario: allowance null = sin límite (admin y coaches).
create or replace function public.points_balance(p_user uuid)
returns table (allowance int, used int, balance int)
language plpgsql stable security definer set search_path = public as $$
declare
  v_role text;
  v_allowance int;
  v_used int;
begin
  if p_user <> coalesce(auth.uid(), p_user) and not public.is_staff() then
    raise exception 'sin_permiso';
  end if;
  select role into v_role from public.profiles where id = p_user;
  select coalesce(
           (select b.monthly_points from public.member_billing b where b.user_id = p_user),
           case when v_role = 'kit' then s.points_monthly_kit else s.points_monthly_member end
         )
    into v_allowance
    from public.settings s where s.id = 1;
  select coalesce(sum(u.points), 0)::int into v_used
    from public.ai_points_usage u where u.user_id = p_user and u.created_at >= public.points_month_start();
  if v_role in ('admin', 'coach') then
    return query select null::int, v_used, null::int;
  else
    return query select v_allowance, v_used, greatest(v_allowance - v_used, 0);
  end if;
end;
$$;
revoke execute on function public.points_balance(uuid) from public, anon;
grant execute on function public.points_balance(uuid) to authenticated, service_role;

-- Descuenta puntos (solo el servidor). Devuelve el id del gasto (para reembolsarlo si la IA falla).
create or replace function public.spend_points(p_user uuid, p_action text, p_points int, p_ref uuid)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_balance int;
  v_allowance int;
  v_id bigint;
begin
  perform 1 from public.profiles where id = p_user for update; -- un gasto a la vez por usuario
  select b.allowance, b.balance into v_allowance, v_balance from public.points_balance(p_user) b;
  if v_allowance is not null and v_balance < p_points then
    raise exception 'sin_puntos';
  end if;
  insert into public.ai_points_usage (user_id, action, points, ref_id) values (p_user, p_action, p_points, p_ref) returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.spend_points(uuid, text, int, uuid) from public, anon, authenticated;
grant execute on function public.spend_points(uuid, text, int, uuid) to service_role;
