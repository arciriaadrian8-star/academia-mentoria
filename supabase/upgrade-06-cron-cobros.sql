-- =====================================================================
-- Upgrade 06 · Programa el cobro automático de las membresías (3 veces al día).
--   Antes: despliega la Edge Function «cobros-recurrentes» y crea el secreto CRON_SECRET
--   con el MISMO valor que pones abajo en lugar de TU_CRON_SECRET.
--   Requiere upgrade-05-membresia-nequi.sql.
-- =====================================================================

select vault.create_secret('TU_CRON_SECRET', 'cron_secret_cobros', 'Clave para llamar a cobros-recurrentes');

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
