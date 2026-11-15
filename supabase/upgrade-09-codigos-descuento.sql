-- =====================================================================
-- Upgrade 09 · Códigos de descuento para las membresías
--   - discount_codes: los crea el admin (porcentaje o valor fijo, por cuántos cobros, usos máximos,
--     vencimiento y, opcionalmente, para un solo plan).
--   - La suscripción guarda una copia del descuento al momento de suscribirse, así cambiar o
--     desactivar el código después no altera lo que ya se le prometió al alumno.
--   - subscription_charge_amount(): calcula cuánto se cobra en cada cobro (mínimo $1.500, el de Wompi).
--   Requiere upgrade-05 (membresías).
-- =====================================================================

create table if not exists public.discount_codes (
  code            text primary key check (code ~ '^[A-Z0-9_-]{3,30}$'),
  description     text check (char_length(description) <= 200),
  kind            text not null check (kind in ('percent', 'fixed')),
  value           integer not null check (value > 0),
  duration        text not null default 'first' check (duration in ('first', 'months', 'forever')),
  duration_months integer check (duration_months between 1 and 36),
  plan_id         uuid references public.membership_plans(id) on delete cascade,
  max_redemptions integer check (max_redemptions > 0),
  redemptions     integer not null default 0,
  expires_at      timestamptz,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  check (kind <> 'percent' or value <= 99),
  check (duration <> 'months' or duration_months is not null)
);
create index if not exists discount_codes_plan_idx on public.discount_codes (plan_id);

alter table public.discount_codes enable row level security;
drop policy if exists "códigos descuento: admin gestiona" on public.discount_codes;
create policy "códigos descuento: admin gestiona" on public.discount_codes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.discount_codes from anon;
grant select, insert, update, delete on public.discount_codes to authenticated;
grant all on public.discount_codes to service_role;

-- Copia del descuento en la suscripción. discount_remaining: cobros que aún llevan descuento
-- (0 = ninguno, -1 = para siempre).
alter table public.subscriptions add column if not exists discount_code text references public.discount_codes(code) on delete set null;
alter table public.subscriptions add column if not exists discount_kind text check (discount_kind in ('percent', 'fixed'));
alter table public.subscriptions add column if not exists discount_value integer check (discount_value > 0);
alter table public.subscriptions add column if not exists discount_remaining integer not null default 0;
create index if not exists subscriptions_discount_code_idx on public.subscriptions (discount_code);
grant select (discount_code, discount_remaining) on public.subscriptions to authenticated;

-- Precio con descuento (nunca menos de $1.500, el mínimo que acepta Wompi).
create or replace function public.discounted_price(p_price integer, p_kind text, p_value integer)
returns integer language sql immutable as $$
  select greatest(1500, case
    when p_kind = 'percent' then round(p_price * (100 - p_value) / 100.0)::int
    when p_kind = 'fixed'   then p_price - p_value
    else p_price end)
$$;

-- Cuánto se le cobra hoy a una suscripción.
create or replace function public.subscription_charge_amount(p_sub uuid)
returns integer language sql stable security definer set search_path = public as $$
  select case when s.discount_remaining <> 0 and s.discount_kind is not null
              then public.discounted_price(p.price_cop, s.discount_kind, s.discount_value)
              else p.price_cop end
    from public.subscriptions s join public.membership_plans p on p.id = s.plan_id
   where s.id = p_sub
$$;
revoke execute on function public.subscription_charge_amount(uuid) from public, anon, authenticated;
grant execute on function public.subscription_charge_amount(uuid) to service_role;

-- Valida un código para un plan. Devuelve si sirve, por qué no, y el precio del primer cobro.
create or replace function public.validate_discount_code(p_code text, p_plan uuid)
returns table (valid boolean, reason text, kind text, value integer, duration text, duration_months integer, first_price integer, regular_price integer)
language plpgsql stable security definer set search_path = public as $$
declare
  c public.discount_codes;
  pr integer;
begin
  select price_cop into pr from public.membership_plans where id = p_plan and active;
  if pr is null then return query select false, 'plan_invalido', null::text, null::int, null::text, null::int, null::int, null::int; return; end if;
  select * into c from public.discount_codes where code = upper(trim(p_code));
  if not found or not c.active then return query select false, 'no_existe', null::text, null::int, null::text, null::int, null::int, pr; return; end if;
  if c.expires_at is not null and c.expires_at < now() then return query select false, 'vencido', null::text, null::int, null::text, null::int, null::int, pr; return; end if;
  if c.max_redemptions is not null and c.redemptions >= c.max_redemptions then return query select false, 'agotado', null::text, null::int, null::text, null::int, null::int, pr; return; end if;
  if c.plan_id is not null and c.plan_id <> p_plan then return query select false, 'otro_plan', null::text, null::int, null::text, null::int, null::int, pr; return; end if;
  return query select true, null::text, c.kind, c.value, c.duration, c.duration_months, public.discounted_price(pr, c.kind, c.value), pr;
end;
$$;
revoke execute on function public.validate_discount_code(text, uuid) from public, anon, authenticated;
grant execute on function public.validate_discount_code(text, uuid) to service_role;

-- Al aprobarse un cobro: el primer pago cuenta un uso del código y cada cobro con descuento
-- descuenta uno de los que le quedan.
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
    if sub.discount_code is not null and sub.current_period_end is null then
      update public.discount_codes set redemptions = redemptions + 1 where code = sub.discount_code;
    end if;

    new_end := greatest(coalesce(sub.current_period_end, now()), now()) + make_interval(days => plan.interval_days);
    update public.subscriptions
       set status = case when status in ('cancelada', 'vencida') then status else 'activa' end,
           current_period_end = new_end,
           next_charge_at = case when cancel_at_period_end then null else new_end end,
           failed_attempts = 0,
           discount_remaining = case when discount_remaining > 0 then discount_remaining - 1 else discount_remaining end,
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
        update public.profiles
           set role = 'kit', active = true, pending = false, access_until = new_end + grace
         where id = prof.id;
      end if;
    end if;
    return 'APPROVED';
  end if;

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

-- Después del pago: el alumno crea su cuenta en Skool y envía su correo por WhatsApp.
alter table public.membership_plans add column if not exists skool_url text check (char_length(skool_url) <= 300);
alter table public.membership_plans add column if not exists contact_whatsapp text check (contact_whatsapp ~ '^[0-9]{8,15}$');
alter table public.subscriptions add column if not exists skool_email text check (char_length(skool_email) <= 200);
grant select (skool_email) on public.subscriptions to authenticated;

-- ------------------------------------------------- (upgrade 10) pago sin cuenta
-- El alumno paga sin registrarse: la cuenta «Solo Kit» se crea sola con su correo, y la página
-- sigue el pago con este token secreto (los alumnos no pueden leerlo: no está en los permisos de columna).
alter table public.subscriptions add column if not exists checkout_token text;
create index if not exists subscriptions_checkout_token_idx on public.subscriptions (checkout_token);
-- Precio normal (tachado) que se muestra junto a «Cupón aplicado».
alter table public.membership_plans add column if not exists compare_price_cop integer check (compare_price_cop is null or compare_price_cop between 1500 and 50000000);

-- ------------------------------------------------- (upgrade 11) solo el admin cancela
create or replace function public.cancel_subscription(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare sub public.subscriptions;
begin
  if not public.is_admin() then raise exception 'sin_permiso'; end if;
  select * into sub from public.subscriptions where id = p_id for update;
  if not found then raise exception 'no_existe'; end if;
  if sub.status = 'pendiente' then
    update public.subscriptions set status = 'cancelada', canceled_at = now(), next_charge_at = null, updated_at = now() where id = p_id;
  elsif sub.status in ('activa', 'en_mora') then
    update public.subscriptions set cancel_at_period_end = true, canceled_at = now(), next_charge_at = null, updated_at = now() where id = p_id;
  end if;
end;
$$;
