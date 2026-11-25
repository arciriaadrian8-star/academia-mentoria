-- =====================================================================
-- Upgrade 15 · Recordatorios automáticos de pago por WhatsApp
--   Registro de recordatorios enviados (por Cowork desde tu WhatsApp, o por la API de WhatsApp Business si la activas).
--   A los alumnos con cobro MANUAL (Nequi, Wompi, otro) se les recuerda:
--   1 día antes de su fecha de pago (configurable), el día del pago y a los 2 días si no ha pagado.
--   Normalmente los envía Cowork desde tu WhatsApp con la página «Mensajes de hoy» (/miembros/alumnos/hoy).
--   Opcional: la Edge Function «recordatorios-alumnos» los envía sola por la API de WhatsApp Business (9:00 a.m.)
--   si la configuras y activas «envío automático» en el panel; si no, el cron no hace nada.
--   Requiere upgrade-14-control-alumnos.sql y upgrade-06-cron-cobros.sql (usa la misma clave del cron).
--   ⚠️ Si tu proyecto de Supabase no es igamytklamsrylaykazs, cambia la URL de abajo.
-- =====================================================================

alter table public.student_billing_config
  add column if not exists days_before   integer not null default 1 check (days_before between 1 and 10),
  add column if not exists auto_whatsapp boolean not null default false;

create table if not exists public.student_reminders_log (
  enrollment_id uuid not null references public.student_enrollments(id) on delete cascade,
  stage         text not null check (stage in ('antes', 'hoy', 'vencido')),
  due_date      date not null,
  status        text not null default 'enviando'
                check (status in ('enviando', 'enviado', 'fallido', 'sin_whatsapp', 'sin_configurar')),
  detail        text check (char_length(detail) <= 500),
  created_at    timestamptz not null default now(),
  primary key (enrollment_id, stage, due_date)
);
create index if not exists student_reminders_log_created_idx on public.student_reminders_log (created_at desc);

alter table public.student_reminders_log enable row level security;
drop policy if exists "recordatorios: admin ve" on public.student_reminders_log;
create policy "recordatorios: admin ve" on public.student_reminders_log
  for select to authenticated using (public.is_admin());
revoke all on public.student_reminders_log from anon;
grant select on public.student_reminders_log to authenticated;
grant all on public.student_reminders_log to service_role;

-- 9:00 a.m. hora Colombia = 14:00 UTC, todos los días.
select cron.unschedule('recordatorios-alumnos') where exists (select 1 from cron.job where jobname = 'recordatorios-alumnos');
select cron.schedule(
  'recordatorios-alumnos',
  '0 14 * * *',
  $$
  select net.http_post(
    url := 'https://igamytklamsrylaykazs.supabase.co/functions/v1/recordatorios-alumnos',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret_cobros')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
