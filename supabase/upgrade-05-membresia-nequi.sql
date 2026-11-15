-- =====================================================================
-- Upgrade 05 · Membresía con cobro recurrente por Nequi (Wompi)
--   - membership_plans: planes que crea el admin (precio en COP, cada cuántos días se cobra
--     y qué acceso da: 'kit' = Solo Kit COD, 'member' = academia completa).
--   - subscriptions: una suscripción por alumno, ligada a su cuenta Nequi tokenizada en Wompi.
--   - subscription_payments: cada cobro (el primero y los recurrentes).
--   Toda la escritura la hacen las Edge Functions (service role); el alumno solo lee lo suyo.
--   Requiere haber aplicado antes upgrade-04-acceso-kit.sql.
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------- planes
create table if not exists public.membership_plans (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 2 and 80),
  description   text check (char_length(description) <= 500),
  price_cop     integer not null check (price_cop between 1500 and 50000000),
  interval_days integer not null default 30 check (interval_days between 1 and 366),
  grants_role   text not null default 'kit' check (grants_role in ('kit', 'member')),
  active        boolean not null default true,
  position      integer not null default 0,
  created_at    timestamptz not null default now()
);

alter table public.membership_plans enable row level security;
drop policy if exists "planes: ver activos" on public.membership_plans;
create policy "planes: ver activos" on public.membership_plans
  for select to anon, authenticated using (active or public.is_admin());
drop policy if exists "planes: admin gestiona" on public.membership_plans;
create policy "planes: admin gestiona" on public.membership_plans
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.membership_plans to anon;
grant select, insert, update, delete on public.membership_plans to authenticated;
grant all on public.membership_plans to service_role;

-- ---------------------------------------------------------- suscripciones
create table if not exists public.subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles(id) on delete cascade,
  plan_id              uuid not null references public.membership_plans(id) on delete restrict,
  status               text not null default 'pendiente'
                       check (status in ('pendiente', 'activa', 'en_mora', 'cancelada', 'vencida', 'fallida')),
  customer_email       text not null,
  phone_last4          text check (phone_last4 ~ '^[0-9]{4}$'),
  nequi_token          text,
  payment_source_id    text,
  current_period_end   timestamptz,
  next_charge_at       timestamptz,
  failed_attempts      integer not null default 0,
  cancel_at_period_end boolean not null default false,
  canceled_at          timestamptz,
  last_error           text check (char_length(last_error) <= 500),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
-- Solo una suscripción viva por alumno.
create unique index if not exists subscriptions_one_live_per_user
  on public.subscriptions (user_id) where status in ('pendiente', 'activa', 'en_mora');
create index if not exists subscriptions_user_idx on public.subscriptions (user_id);
create index if not exists subscriptions_plan_idx on public.subscriptions (plan_id);
create index if not exists subscriptions_due_idx on public.subscriptions (next_charge_at)
  where status in ('activa', 'en_mora');
create index if not exists subscriptions_nequi_token_idx on public.subscriptions (nequi_token);

alter table public.subscriptions enable row level security;
drop policy if exists "suscripciones: ver la propia" on public.subscriptions;
create policy "suscripciones: ver la propia" on public.subscriptions
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
revoke all on public.subscriptions from anon;
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;

-- ----------------------------------------------------------------- cobros
create table if not exists public.subscription_payments (
  id                   uuid primary key default gen_random_uuid(),
  subscription_id      uuid not null references public.subscriptions(id) on delete cascade,
  user_id              uuid not null references public.profiles(id) on delete cascade,
  reference            text not null unique,
  amount_cop           integer not null check (amount_cop > 0),
  status               text not null default 'PENDING'
                       check (status in ('PENDING', 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR')),
  wompi_transaction_id text unique,
  status_message       text check (char_length(status_message) <= 500),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists subscription_payments_sub_idx on public.subscription_payments (subscription_id, created_at desc);
create index if not exists subscription_payments_user_idx on public.subscription_payments (user_id);
create index if not exists subscription_payments_pending_idx on public.subscription_payments (created_at)
  where status = 'PENDING';

alter table public.subscription_payments enable row level security;
drop policy if exists "cobros: ver los propios" on public.subscription_payments;
create policy "cobros: ver los propios" on public.subscription_payments
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
revoke all on public.subscription_payments from anon;
grant select on public.subscription_payments to authenticated;
grant all on public.subscription_payments to service_role;

-- ------------------------------------------------- aplicar resultado de un cobro
-- Idempotente: si el cobro ya tenía un estado final, no hace nada.
-- APPROVED → suma un periodo a la suscripción y le da (o extiende) el acceso al alumno.
-- Rechazado → el primer cobro deja la suscripción 'fallida'; los siguientes la pasan a 'en_mora'
--             y se reintenta al día siguiente (máximo 3 intentos).
create or replace function public.apply_subscription_payment(
  p_reference text, p_status text, p_transaction_id text, p_message text
) returns text language plpgsql security definer set search_path = public as $$
declare
  pay  public.subscription_payments;
  sub  public.subscriptions;
  plan public.membership_plans;
  prof public.profiles;
  new_end timestamptz;
  grace constant interval := interval '3 days';
begin
  if p_status not in ('PENDING', 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR') then
    raise exception 'estado_invalido';
  end if;

  select * into pay from public.subscription_payments where reference = p_reference for update;
  if not found then raise exception 'cobro_no_existe'; end if;
  if pay.status <> 'PENDING' then return pay.status; end if;

  update public.subscription_payments
     set status = p_status,
         wompi_transaction_id = coalesce(p_transaction_id, wompi_transaction_id),
         status_message = left(p_message, 500),
         updated_at = now()
   where id = pay.id;

  if p_status = 'PENDING' then return 'PENDING'; end if;

  select * into sub from public.subscriptions where id = pay.subscription_id for update;
  select * into plan from public.membership_plans where id = sub.plan_id;

  if p_status = 'APPROVED' then
    new_end := greatest(coalesce(sub.current_period_end, now()), now()) + make_interval(days => plan.interval_days);
    update public.subscriptions
       set status = case when status in ('cancelada', 'vencida') then status else 'activa' end,
           current_period_end = new_end,
           next_charge_at = case when cancel_at_period_end then null else new_end end,
           failed_attempts = 0,
           last_error = null,
           updated_at = now()
     where id = sub.id;

    select * into prof from public.profiles where id = sub.user_id for update;
    if prof.role not in ('admin', 'coach') then
      if plan.grants_role = 'member' then
        update public.profiles
           set role = 'member', active = true, pending = false, access_until = new_end + grace
         where id = prof.id;
      elsif not (prof.role = 'member' and prof.active) then
        -- Plan «Solo Kit»: no le quita el acceso completo a quien ya lo tiene.
        update public.profiles
           set role = 'kit', active = true, pending = false, access_until = new_end + grace
         where id = prof.id;
      end if;
    end if;
    return 'APPROVED';
  end if;

  -- Cobro rechazado / anulado / con error
  if sub.status = 'pendiente' then
    update public.subscriptions
       set status = 'fallida', failed_attempts = failed_attempts + 1,
           last_error = left(coalesce(p_message, p_status), 500), updated_at = now()
     where id = sub.id;
  else
    update public.subscriptions
       set status = case when status = 'activa' then 'en_mora' else status end,
           failed_attempts = failed_attempts + 1,
           next_charge_at = case when failed_attempts + 1 < 3 and not cancel_at_period_end then now() + interval '1 day' else null end,
           last_error = left(coalesce(p_message, p_status), 500),
           updated_at = now()
     where id = sub.id;
  end if;
  return p_status;
end;
$$;
revoke execute on function public.apply_subscription_payment(text, text, text, text) from public, anon, authenticated;
grant execute on function public.apply_subscription_payment(text, text, text, text) to service_role;

-- ------------------------------------------------------ vencer suscripciones
-- Se llama a diario desde la función de cobros. Pasado el periodo + 3 días de gracia sin pagar,
-- la suscripción vence. Las cuentas 'kit' ya se bloquean solas por access_until; a los miembros
-- completos que entraron por un plan 'member' se les quita el acceso.
create or replace function public.expire_subscriptions()
returns integer language plpgsql security definer set search_path = public as $$
declare
  n integer := 0;
  r record;
begin
  for r in
    select s.id, s.user_id, s.cancel_at_period_end, p.grants_role
      from public.subscriptions s
      join public.membership_plans p on p.id = s.plan_id
     where s.status in ('activa', 'en_mora')
       and s.current_period_end is not null
       and s.current_period_end + interval '3 days' < now()
     for update of s
  loop
    update public.subscriptions
       set status = case when r.cancel_at_period_end then 'cancelada' else 'vencida' end,
           next_charge_at = null, updated_at = now()
     where id = r.id;
    if r.grants_role = 'member' then
      update public.profiles set active = false
       where id = r.user_id and role = 'member'
         and not exists (select 1 from public.subscriptions s2
                          where s2.user_id = r.user_id and s2.id <> r.id and s2.status in ('activa', 'en_mora'));
    end if;
    n := n + 1;
  end loop;

  -- Suscripciones que se quedaron esperando la aprobación en Nequi más de 1 día.
  update public.subscriptions set status = 'fallida', last_error = 'No se aprobó en Nequi', updated_at = now()
   where status = 'pendiente' and created_at < now() - interval '1 day';
  return n;
end;
$$;
revoke execute on function public.expire_subscriptions() from public, anon, authenticated;
grant execute on function public.expire_subscriptions() to service_role;

-- ------------------------------------------------------- cancelar (alumno o admin)
-- No corta el acceso de inmediato: deja de cobrar y el acceso dura hasta fin del periodo pagado.
create or replace function public.cancel_subscription(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare sub public.subscriptions;
begin
  select * into sub from public.subscriptions where id = p_id for update;
  if not found or (sub.user_id <> auth.uid() and not public.is_admin()) then
    raise exception 'sin_permiso';
  end if;
  if sub.status = 'pendiente' then
    update public.subscriptions set status = 'cancelada', canceled_at = now(), next_charge_at = null, updated_at = now()
     where id = p_id;
  elsif sub.status in ('activa', 'en_mora') then
    update public.subscriptions set cancel_at_period_end = true, canceled_at = now(), next_charge_at = null, updated_at = now()
     where id = p_id;
  end if;
end;
$$;
revoke execute on function public.cancel_subscription(uuid) from public, anon;
grant execute on function public.cancel_subscription(uuid) to authenticated;

-- ---------------------------------------------------- (upgrade 07) pago con tarjeta
alter table public.subscriptions add column if not exists payment_method text not null default 'NEQUI' check (payment_method in ('NEQUI', 'CARD'));
alter table public.subscriptions add column if not exists card_brand text check (char_length(card_brand) <= 30);
alter table public.subscriptions add column if not exists card_last4 text check (card_last4 ~ '^[0-9]{4}$');
