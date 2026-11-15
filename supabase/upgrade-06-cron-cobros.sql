-- =====================================================================
-- Upgrade 06 · Programa el cobro automático de las membresías (3 veces al día).
--   Cambia TU_CRON_SECRET por una clave larga al azar. La función «cobros-recurrentes» la lee de Vault.
--   Requiere upgrade-05-membresia-nequi.sql.
-- =====================================================================

select vault.create_secret('TU_CRON_SECRET', 'cron_secret_cobros', 'Clave para llamar a cobros-recurrentes');

create or replace function public.cron_secret_cobros()
returns text language sql stable security definer set search_path = public, vault as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret_cobros'
$$;
revoke execute on function public.cron_secret_cobros() from public, anon, authenticated;
grant execute on function public.cron_secret_cobros() to service_role;

-- 8:00, 14:00 y 20:00 hora Colombia (13, 19 y 01 UTC).
select cron.schedule(
  'cobros-membresia',
  '0 1,13,19 * * *',
  $$
  select net.http_post(
    url := 'https://igamytklamsrylaykazs.supabase.co/functions/v1/cobros-recurrentes',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret_cobros')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
