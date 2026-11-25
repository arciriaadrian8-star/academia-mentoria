-- =====================================================================
-- Upgrade 14 · Control de alumnos (acompañamiento y membresías)
--   Un solo lugar para todos los alumnos, sin importar por dónde pagaron:
--   - student_enrollments: cada alumno en un programa (acompañamiento o membresía), con la
--     plataforma de pago (Nequi, Wompi, Whop, Skool u otra), si se cobra solo o hay que cobrarle,
--     el valor, cada cuánto paga y hasta cuándo tiene pagado. Puede estar ligado a su cuenta de la
--     academia o no (muchos solo están en Skool o Whop).
--   - student_payments: cada pago registrado (los manuales de Nequi/Wompi y las renovaciones de Whop/Skool).
--   - student_followups: seguimiento del acompañamiento (sesiones hechas, notas, recordatorios enviados).
--   - student_billing_config: tu número de Nequi, enlace de Wompi y los mensajes de WhatsApp.
--   Solo el admin ve y edita todo esto.
--   Requiere haber aplicado antes upgrade-13-registro-makedrop.sql.
-- =====================================================================

-- ------------------------------------------------------------ inscripciones
create table if not exists public.student_enrollments (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.profiles(id) on delete set null,
  full_name         text not null check (char_length(full_name) between 1 and 120),
  email             text check (char_length(email) <= 200),
  whatsapp          text check (whatsapp ~ '^[0-9]{8,15}$'),
  program           text not null default 'membresia' check (program in ('acompanamiento', 'membresia')),
  plan_name         text check (char_length(plan_name) <= 80),
  platform          text not null default 'nequi' check (platform in ('nequi', 'wompi', 'whop', 'skool', 'otro')),
  auto_renew        boolean not null default false,
  amount            numeric(12,2) not null default 0 check (amount >= 0),
  currency          text not null default 'COP' check (currency in ('COP', 'USD')),
  interval_days     integer check (interval_days is null or interval_days between 1 and 366), -- null = pago único
  start_date        date not null default (now() at time zone 'America/Bogota')::date,
  paid_until        date,
  end_date          date,
  sessions_included integer check (sessions_included is null or sessions_included between 0 and 1000),
  status            text not null default 'activo' check (status in ('activo', 'pausado', 'cancelado', 'finalizado')),
  notes             text check (char_length(notes) <= 2000),
  last_reminder_at  timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists student_enrollments_user_idx on public.student_enrollments (user_id);
create index if not exists student_enrollments_due_idx on public.student_enrollments (paid_until) where status = 'activo';
create index if not exists student_enrollments_program_idx on public.student_enrollments (program, status);
create index if not exists student_enrollments_email_idx on public.student_enrollments (lower(email));

alter table public.student_enrollments enable row level security;
drop policy if exists "alumnos: admin gestiona" on public.student_enrollments;
create policy "alumnos: admin gestiona" on public.student_enrollments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.student_enrollments from anon;
grant select, insert, update, delete on public.student_enrollments to authenticated;
grant all on public.student_enrollments to service_role;

-- -------------------------------------------------------------------- pagos
create table if not exists public.student_payments (
  id            uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.student_enrollments(id) on delete cascade,
  paid_at       date not null default (now() at time zone 'America/Bogota')::date,
  amount        numeric(12,2) not null check (amount > 0),
  currency      text not null default 'COP' check (currency in ('COP', 'USD')),
  platform      text not null check (platform in ('nequi', 'wompi', 'whop', 'skool', 'otro')),
  reference     text check (char_length(reference) <= 120),
  note          text check (char_length(note) <= 500),
  covers_until  date,
  created_at    timestamptz not null default now()
);
create index if not exists student_payments_enrollment_idx on public.student_payments (enrollment_id, paid_at desc);
create index if not exists student_payments_paid_at_idx on public.student_payments (paid_at desc);

alter table public.student_payments enable row level security;
drop policy if exists "pagos alumnos: admin gestiona" on public.student_payments;
create policy "pagos alumnos: admin gestiona" on public.student_payments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.student_payments from anon;
grant select, insert, update, delete on public.student_payments to authenticated;
grant all on public.student_payments to service_role;

-- -------------------------------------------------------------- seguimiento
create table if not exists public.student_followups (
  id            uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.student_enrollments(id) on delete cascade,
  kind          text not null default 'nota' check (kind in ('sesion', 'nota', 'recordatorio')),
  happened_at   date not null default (now() at time zone 'America/Bogota')::date,
  note          text not null check (char_length(note) between 1 and 2000),
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists student_followups_enrollment_idx on public.student_followups (enrollment_id, happened_at desc);

alter table public.student_followups enable row level security;
drop policy if exists "seguimiento: admin gestiona" on public.student_followups;
create policy "seguimiento: admin gestiona" on public.student_followups
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.student_followups from anon;
grant select, insert, update, delete on public.student_followups to authenticated;
grant all on public.student_followups to service_role;

-- ------------------------------------------------------------ configuración
create table if not exists public.student_billing_config (
  id                   integer primary key default 1 check (id = 1),
  nequi_number         text check (char_length(nequi_number) <= 30),
  wompi_link           text check (char_length(wompi_link) <= 300),
  reminder_days        integer not null default 3 check (reminder_days between 0 and 30),
  template_manual      text check (char_length(template_manual) <= 1500),
  template_overdue     text check (char_length(template_overdue) <= 1500),
  template_auto_failed text check (char_length(template_auto_failed) <= 1500),
  updated_at           timestamptz not null default now()
);
insert into public.student_billing_config (id) values (1) on conflict (id) do nothing;

alter table public.student_billing_config enable row level security;
drop policy if exists "config cobros: admin gestiona" on public.student_billing_config;
create policy "config cobros: admin gestiona" on public.student_billing_config
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.student_billing_config from anon;
grant select, insert, update on public.student_billing_config to authenticated;
grant all on public.student_billing_config to service_role;
