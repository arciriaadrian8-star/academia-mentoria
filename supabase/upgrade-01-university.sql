-- =====================================================================
--  ACTUALIZACIÓN 01 — "University": bienvenida, plataformas, sesiones
--  grupales, beneficios (códigos) y ranking.
--  Si tu proyecto ya tiene el schema.sql, ejecuta SOLO este archivo.
--  (Las instalaciones nuevas ya lo incluyen al final de schema.sql.)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. BIENVENIDA / INDUCCIÓN
-- ---------------------------------------------------------------------
-- Una sola fila con el vídeo y la información de inducción (solo la ven miembros activos)
create table if not exists public.onboarding (
  id          int primary key default 1 check (id = 1),
  video_url   text,
  content     text,
  updated_at  timestamptz not null default now()
);
insert into public.onboarding (id) values (1) on conflict (id) do nothing;

alter table public.profiles add column if not exists welcome_seen_at timestamptz;

-- El alumno puede marcar que ya vio la inducción (las columnas visibles se conceden explícitamente)
grant select (welcome_seen_at) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- 2. PLATAFORMAS (directorio de herramientas externas)
-- ---------------------------------------------------------------------
create table if not exists public.platforms (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  url           text not null,
  category      text not null default 'otros',
  logo_url      text,
  tutorial_url  text,          -- vídeo o lección con el tutorial
  perk          text,          -- cupón / beneficio / nota corta
  position      int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists platforms_category_idx on public.platforms (category, position);

-- ---------------------------------------------------------------------
-- 3. SESIONES GRUPALES ENTRE ALUMNOS
-- ---------------------------------------------------------------------
create table if not exists public.study_sessions (
  id                uuid primary key default gen_random_uuid(),
  host_id           uuid not null references public.profiles (id) on delete cascade,
  title             text not null,
  description       text,
  topic             text not null default 'general',
  starts_at         timestamptz not null,
  duration_minutes  int not null default 60 check (duration_minutes between 5 and 480),
  meet_url          text not null,
  max_attendees     int check (max_attendees is null or max_attendees between 2 and 500),
  created_at        timestamptz not null default now()
);
create index if not exists study_sessions_starts_idx on public.study_sessions (starts_at);

create table if not exists public.session_attendees (
  session_id  uuid not null references public.study_sessions (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  joined_at   timestamptz not null default now(),
  primary key (session_id, user_id)
);
create index if not exists session_attendees_user_idx on public.session_attendees (user_id);

-- ---------------------------------------------------------------------
-- 4. BENEFICIOS (ej. Google AI Pro 18 meses) con enlace o códigos únicos
-- ---------------------------------------------------------------------
create table if not exists public.benefits (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,                       -- instrucciones en Markdown
  image_url     text,
  claim_url     text,                       -- enlace de canje (opcional)
  delivery      text not null default 'link' check (delivery in ('link', 'code')),
  active        boolean not null default true,
  position      int not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists public.benefit_codes (
  id           uuid primary key default gen_random_uuid(),
  benefit_id   uuid not null references public.benefits (id) on delete cascade,
  code         text not null,
  assigned_to  uuid references public.profiles (id) on delete set null,
  assigned_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (benefit_id, code)
);
create index if not exists benefit_codes_free_idx on public.benefit_codes (benefit_id) where assigned_to is null;

create table if not exists public.benefit_claims (
  benefit_id  uuid not null references public.benefits (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  code_id     uuid references public.benefit_codes (id) on delete set null,
  claimed_at  timestamptz not null default now(),
  primary key (benefit_id, user_id)
);

-- Reclamar un beneficio: guarda el reclamo y, si es por código, asigna uno libre.
create or replace function public.claim_benefit(bid uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  b public.benefits;
  existing public.benefit_claims;
  free_code public.benefit_codes;
begin
  if not public.is_active() then
    raise exception 'Tu cuenta no está activa';
  end if;
  select * into b from public.benefits where id = bid and active;
  if not found then
    raise exception 'Este beneficio no está disponible';
  end if;

  select * into existing from public.benefit_claims where benefit_id = bid and user_id = auth.uid();
  if found then
    return (select code from public.benefit_codes where id = existing.code_id);
  end if;

  if b.delivery = 'code' then
    select * into free_code from public.benefit_codes
      where benefit_id = bid and assigned_to is null
      order by created_at
      limit 1
      for update skip locked;
    if not found then
      raise exception 'Se agotaron los códigos. Avísale a tu mentor.';
    end if;
    update public.benefit_codes set assigned_to = auth.uid(), assigned_at = now() where id = free_code.id;
    insert into public.benefit_claims (benefit_id, user_id, code_id) values (bid, auth.uid(), free_code.id);
    return free_code.code;
  end if;

  insert into public.benefit_claims (benefit_id, user_id) values (bid, auth.uid());
  return null;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. RANKING (puntos calculados a partir de la actividad)
--    Lección completada 10 · Publicación 5 · Comentario 2 · Like recibido 1
--    Sesión organizada 15 · Sesión a la que te uniste 5
-- ---------------------------------------------------------------------
create or replace function public.leaderboard(since timestamptz default null)
returns table (
  id uuid,
  full_name text,
  avatar_url text,
  role text,
  lessons int,
  posts int,
  comments int,
  likes int,
  hosted int,
  joined int,
  points int
) language sql stable security definer set search_path = public as $$
  with p as (
    select pr.id, pr.full_name, pr.avatar_url, pr.role
    from public.profiles pr
    where pr.active and public.is_active()
  ),
  l as (select user_id, count(*)::int n from public.lesson_progress where since is null or completed_at >= since group by user_id),
  po as (select author_id, count(*)::int n from public.posts where since is null or created_at >= since group by author_id),
  co as (select author_id, count(*)::int n from public.comments where since is null or created_at >= since group by author_id),
  li as (
    select po2.author_id, count(*)::int n
    from public.post_likes pl join public.posts po2 on po2.id = pl.post_id
    where pl.user_id <> po2.author_id and (since is null or po2.created_at >= since)
    group by po2.author_id
  ),
  -- Solo cuentan sesiones que ya empezaron y en las que hubo al menos otra persona.
  h as (
    select s.host_id, count(*)::int n
    from public.study_sessions s
    where s.starts_at <= now() and (since is null or s.starts_at >= since)
      and exists (select 1 from public.session_attendees a where a.session_id = s.id and a.user_id <> s.host_id)
    group by s.host_id
  ),
  j as (
    select sa.user_id, count(*)::int n
    from public.session_attendees sa join public.study_sessions s on s.id = sa.session_id
    where sa.user_id <> s.host_id and s.starts_at <= now() and (since is null or s.starts_at >= since)
    group by sa.user_id
  )
  select
    p.id, p.full_name, p.avatar_url, p.role,
    coalesce(l.n, 0), coalesce(po.n, 0), coalesce(co.n, 0), coalesce(li.n, 0), coalesce(h.n, 0), coalesce(j.n, 0),
    coalesce(l.n, 0) * 10 + coalesce(po.n, 0) * 5 + coalesce(co.n, 0) * 2 + coalesce(li.n, 0)
      + coalesce(h.n, 0) * 15 + coalesce(j.n, 0) * 5
  from p
  left join l on l.user_id = p.id
  left join po on po.author_id = p.id
  left join co on co.author_id = p.id
  left join li on li.author_id = p.id
  left join h on h.host_id = p.id
  left join j on j.user_id = p.id
  order by 11 desc, p.full_name
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.onboarding        enable row level security;
alter table public.platforms         enable row level security;
alter table public.study_sessions    enable row level security;
alter table public.session_attendees enable row level security;
alter table public.benefits          enable row level security;
alter table public.benefit_codes     enable row level security;
alter table public.benefit_claims    enable row level security;

create policy "inducción: leer activos" on public.onboarding
  for select to authenticated using (public.is_active());
create policy "inducción: admin edita" on public.onboarding
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "plataformas: leer activos" on public.platforms
  for select to authenticated using (public.is_active());
create policy "plataformas: staff gestiona" on public.platforms
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "sesiones: leer activos" on public.study_sessions
  for select to authenticated using (public.is_active());
create policy "sesiones: crear propia" on public.study_sessions
  for insert to authenticated with check (public.is_active() and host_id = auth.uid());
create policy "sesiones: editar anfitrión o staff" on public.study_sessions
  for update to authenticated using (host_id = auth.uid() or public.is_staff())
  with check (host_id = auth.uid() or public.is_staff());
create policy "sesiones: borrar anfitrión o staff" on public.study_sessions
  for delete to authenticated using (host_id = auth.uid() or public.is_staff());

create policy "asistentes: leer activos" on public.session_attendees
  for select to authenticated using (public.is_active());
create policy "asistentes: unirse" on public.session_attendees
  for insert to authenticated with check (
    public.is_active() and user_id = auth.uid()
    and exists (
      select 1 from public.study_sessions s
      where s.id = session_id
        and s.starts_at + make_interval(mins => s.duration_minutes) > now()
        and (s.max_attendees is null or (select count(*) from public.session_attendees a where a.session_id = s.id) < s.max_attendees)
    )
  );
create policy "asistentes: salir o staff" on public.session_attendees
  for delete to authenticated using (user_id = auth.uid() or public.is_staff());

create policy "beneficios: leer" on public.benefits
  for select to authenticated using (public.is_staff() or (public.is_active() and active));
create policy "beneficios: admin gestiona" on public.benefits
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "códigos: ver el propio o admin" on public.benefit_codes
  for select to authenticated using (assigned_to = auth.uid() or public.is_admin());
create policy "códigos: admin gestiona" on public.benefit_codes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "reclamos: ver propios o admin" on public.benefit_claims
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "reclamos: admin borra" on public.benefit_claims
  for delete to authenticated using (public.is_admin());

-- Permisos de la API
grant select, update on public.onboarding to authenticated;
grant all on public.onboarding to service_role;
grant select, insert, update, delete on public.platforms, public.study_sessions, public.session_attendees,
  public.benefits, public.benefit_codes, public.benefit_claims to authenticated;
grant all on public.platforms, public.study_sessions, public.session_attendees,
  public.benefits, public.benefit_codes, public.benefit_claims to service_role;
revoke execute on function public.claim_benefit(uuid) from public, anon;
grant execute on function public.claim_benefit(uuid) to authenticated;
revoke execute on function public.leaderboard(timestamptz) from public, anon;
grant execute on function public.leaderboard(timestamptz) to authenticated;

-- ---------------------------------------------------------------------
-- DATOS DE EJEMPLO (puedes editarlos o borrarlos desde la plataforma)
-- ---------------------------------------------------------------------
insert into public.platforms (name, description, url, category, position)
select * from (values
  ('Dropi', 'Proveedores y logística contraentrega (COD) en LATAM. Aquí montas tus pedidos y sigues las guías.', 'https://app.dropi.co', 'proveedores', 1),
  ('Shopify', 'Crea tu tienda online y tus páginas de producto.', 'https://www.shopify.com', 'tiendas', 1),
  ('Meta Ads Manager', 'Crea y mide tus campañas de Facebook e Instagram.', 'https://adsmanager.facebook.com', 'anuncios', 1),
  ('Biblioteca de anuncios de Meta', 'Espía los anuncios activos de la competencia.', 'https://www.facebook.com/ads/library', 'anuncios', 2),
  ('TikTok Creative Center', 'Tendencias, anuncios top y productos virales de TikTok.', 'https://ads.tiktok.com/business/creativecenter', 'anuncios', 3),
  ('Canva', 'Diseña creativos, banners y miniaturas.', 'https://www.canva.com', 'diseno', 1),
  ('CapCut', 'Edita tus videos y creativos para anuncios.', 'https://www.capcut.com', 'diseno', 2),
  ('ChatGPT', 'Copys, guiones, investigación de producto y atención al cliente.', 'https://chatgpt.com', 'ia', 1),
  ('Claude', 'Asistente de IA para estrategias, textos y análisis.', 'https://claude.ai', 'ia', 2),
  ('Google Gemini', 'IA de Google (incluida con Google AI Pro).', 'https://gemini.google.com', 'ia', 3),
  ('Google Trends', 'Valida si un producto está creciendo en búsquedas.', 'https://trends.google.com', 'investigacion', 1)
) as v(name, description, url, category, position)
where not exists (select 1 from public.platforms);

insert into public.benefits (title, description, delivery, active, position)
select
  'Google AI Pro · 18 meses',
  'Acceso a Google AI Pro durante 18 meses, incluido en tu mentoría.' || chr(10) || chr(10) ||
  '**Cómo activarlo:**' || chr(10) || '1. Pulsa **Reclamar**.' || chr(10) || '2. Sigue el enlace o usa tu código.' || chr(10) || '3. Inicia sesión con tu cuenta de Google y confirma.',
  'link', false, 1
where not exists (select 1 from public.benefits);
