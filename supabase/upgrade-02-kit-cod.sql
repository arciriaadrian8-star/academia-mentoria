-- =====================================================================
-- Upgrade 02 · Kit COD: progreso semanal, ruta de 30 días,
-- muro de resultados y revisión de tiendas.
-- =====================================================================

-- Reporte semanal de cada alumno
create table if not exists public.progress_reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  week_start  date not null,
  currency    text not null default 'COP' check (char_length(currency) <= 5),
  orders      integer not null default 0 check (orders >= 0),
  delivered   integer not null default 0 check (delivered >= 0),
  revenue     numeric(14,2) not null default 0 check (revenue >= 0),
  ad_spend    numeric(14,2) not null default 0 check (ad_spend >= 0),
  profit      numeric(14,2) not null default 0,
  notes       text check (char_length(notes) <= 2000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, week_start)
);
create index if not exists progress_reports_user_idx on public.progress_reports (user_id, week_start desc);

-- Tareas completadas de la ruta de 30 días
create table if not exists public.roadmap_progress (
  user_id   uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  task_key  text not null check (char_length(task_key) <= 40),
  done_at   timestamptz not null default now(),
  primary key (user_id, task_key)
);

-- Muro de resultados (el staff los verifica)
create table if not exists public.results (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  title       text not null check (char_length(title) between 3 and 120),
  body        text check (char_length(body) <= 3000),
  image_url   text check (char_length(image_url) <= 1000),
  amount      numeric(14,2) check (amount >= 0),
  currency    text check (char_length(currency) <= 5),
  verified    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists results_created_idx on public.results (created_at desc);
create index if not exists results_user_idx on public.results (user_id);

-- Revisión de tienda: el alumno pide, el staff responde
create table if not exists public.store_reviews (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  store_url    text not null check (char_length(store_url) <= 500),
  product      text check (char_length(product) <= 200),
  ad_url       text check (char_length(ad_url) <= 500),
  question     text check (char_length(question) <= 3000),
  status       text not null default 'pendiente' check (status in ('pendiente', 'revisada')),
  feedback     text check (char_length(feedback) <= 10000),
  reviewed_by  uuid references public.profiles(id) on delete set null,
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists store_reviews_status_idx on public.store_reviews (status, created_at desc);
create index if not exists store_reviews_user_idx on public.store_reviews (user_id);
create index if not exists store_reviews_reviewer_idx on public.store_reviews (reviewed_by);

alter table public.progress_reports enable row level security;
alter table public.roadmap_progress enable row level security;
alter table public.results enable row level security;
alter table public.store_reviews enable row level security;

-- progreso: cada uno lo suyo; el staff ve todo
create policy "progreso: ver propio o staff" on public.progress_reports
  for select to authenticated using (user_id = (select auth.uid()) or public.is_staff());
create policy "progreso: crear propio" on public.progress_reports
  for insert to authenticated with check (user_id = (select auth.uid()) and public.is_active());
create policy "progreso: editar propio" on public.progress_reports
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "progreso: borrar propio" on public.progress_reports
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "ruta: ver propia o staff" on public.roadmap_progress
  for select to authenticated using (user_id = (select auth.uid()) or public.is_staff());
create policy "ruta: marcar propia" on public.roadmap_progress
  for insert to authenticated with check (user_id = (select auth.uid()) and public.is_active());
create policy "ruta: desmarcar propia" on public.roadmap_progress
  for delete to authenticated using (user_id = (select auth.uid()));

-- resultados: todos los activos ven; cada uno publica los suyos sin verificar; staff verifica y modera
create policy "resultados: leer activos" on public.results
  for select to authenticated using (public.is_active());
create policy "resultados: publicar propio" on public.results
  for insert to authenticated with check (user_id = (select auth.uid()) and public.is_active() and (verified = false or public.is_staff()));
create policy "resultados: staff edita" on public.results
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "resultados: borrar propio o staff" on public.results
  for delete to authenticated using (user_id = (select auth.uid()) or public.is_staff());

-- revisiones: el alumno ve y crea las suyas; el staff ve y responde todas
create policy "revisiones: ver propias o staff" on public.store_reviews
  for select to authenticated using (user_id = (select auth.uid()) or public.is_staff());
create policy "revisiones: pedir" on public.store_reviews
  for insert to authenticated with check (
    user_id = (select auth.uid()) and public.is_active() and status = 'pendiente' and feedback is null and reviewed_by is null
  );
create policy "revisiones: staff responde" on public.store_reviews
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "revisiones: borrar propia pendiente o staff" on public.store_reviews
  for delete to authenticated using ((user_id = (select auth.uid()) and status = 'pendiente') or public.is_staff());

-- Los alumnos pueden subir capturas a public-assets/results/<su id>/
create or replace function public.can_write_public_asset(object_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff() or (
    public.is_active()
    and split_part(object_name, '/', 1) in ('avatars', 'posts', 'results')
    and split_part(object_name, '/', 2) = auth.uid()::text
  )
$$;
