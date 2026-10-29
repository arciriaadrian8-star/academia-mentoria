-- =====================================================================
--  ACADEMIA DE MENTORÍA — Esquema completo de base de datos (Supabase)
--  Copia TODO este archivo en Supabase > SQL Editor > New query > Run.
--  Se puede ejecutar una sola vez en un proyecto nuevo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PERFILES Y ROLES
--    admin  = dueño de la academia (control total)
--    coach  = puede crear contenido, eventos y moderar (no gestiona miembros)
--    member = alumno / miembro de la mentoría
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text not null default '',
  avatar_url  text,
  bio         text,
  role        text not null default 'member' check (role in ('admin', 'coach', 'member')),
  active      boolean not null default false,
  pending     boolean not null default false,  -- se registró solo y espera aprobación
  created_at  timestamptz not null default now()
);

-- Niveles de acceso (ej: "Básico", "Premium", "VIP 1:1")
create table public.access_levels (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  color       text not null default '#6366f1',
  created_at  timestamptz not null default now()
);

-- Qué niveles tiene cada miembro
create table public.member_access (
  user_id          uuid not null references public.profiles (id) on delete cascade,
  access_level_id  uuid not null references public.access_levels (id) on delete cascade,
  primary key (user_id, access_level_id)
);

-- ---------------------------------------------------------------------
-- 2. CLASSROOM: cursos > módulos > lecciones
-- ---------------------------------------------------------------------
create table public.courses (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  cover_url    text,
  position     int not null default 0,
  published    boolean not null default false,
  show_locked  boolean not null default true,  -- mostrar con candado a quien no tiene acceso
  created_at   timestamptz not null default now()
);

-- Si un curso NO tiene filas aquí => lo ven todos los miembros activos.
create table public.course_access (
  course_id        uuid not null references public.courses (id) on delete cascade,
  access_level_id  uuid not null references public.access_levels (id) on delete cascade,
  primary key (course_id, access_level_id)
);

create table public.modules (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses (id) on delete cascade,
  title       text not null,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);

create table public.lessons (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses (id) on delete cascade,
  module_id   uuid not null references public.modules (id) on delete cascade,
  title       text not null,
  content     text,          -- texto en formato Markdown
  video_url   text,          -- YouTube, Vimeo, Loom, Google Drive o enlace .mp4
  video_path  text,          -- vídeo subido a Storage (bucket course-files)
  position    int not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.lesson_files (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid not null references public.lessons (id) on delete cascade,
  course_id   uuid not null references public.courses (id) on delete cascade,
  name        text not null,
  path        text not null,
  size        bigint,
  created_at  timestamptz not null default now()
);

create table public.lesson_progress (
  user_id       uuid not null references public.profiles (id) on delete cascade,
  lesson_id     uuid not null references public.lessons (id) on delete cascade,
  course_id     uuid not null references public.courses (id) on delete cascade,
  completed_at  timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index on public.modules (course_id, position);
create index on public.lessons (module_id, position);
create index on public.lessons (course_id);
create index on public.lesson_files (lesson_id);
create index on public.lesson_progress (course_id);

-- ---------------------------------------------------------------------
-- 3. CALENDARIO
-- ---------------------------------------------------------------------
create table public.events (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  description       text,
  starts_at         timestamptz not null,
  duration_minutes  int not null default 60 check (duration_minutes > 0),
  meeting_url       text,
  location          text,
  recurrence        text not null default 'none' check (recurrence in ('none', 'weekly', 'biweekly', 'monthly')),
  recurrence_until  date,
  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now()
);

-- Si un evento no tiene niveles NI miembros asignados => lo ven todos.
create table public.event_access (
  event_id         uuid not null references public.events (id) on delete cascade,
  access_level_id  uuid not null references public.access_levels (id) on delete cascade,
  primary key (event_id, access_level_id)
);

-- Para sesiones 1:1: el evento solo lo ven los miembros asignados.
create table public.event_members (
  event_id  uuid not null references public.events (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  primary key (event_id, user_id)
);

create index on public.events (starts_at);

-- ---------------------------------------------------------------------
-- 4. COMUNIDAD
-- ---------------------------------------------------------------------
create table public.posts (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles (id) on delete cascade,
  title       text not null,
  body        text not null default '',
  category    text not null default 'general',
  pinned      boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts (id) on delete cascade,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);

create table public.post_likes (
  post_id  uuid not null references public.posts (id) on delete cascade,
  user_id  uuid not null references public.profiles (id) on delete cascade,
  primary key (post_id, user_id)
);

create index on public.posts (pinned desc, created_at desc);
create index on public.comments (post_id, created_at);

-- ---------------------------------------------------------------------
-- 5. AJUSTES DE LA ACADEMIA (una sola fila)
-- ---------------------------------------------------------------------
create table public.settings (
  id               int primary key default 1 check (id = 1),
  academy_name     text not null default 'Mi Academia',
  tagline          text default 'Mentoría 1 a 1',
  primary_color    text not null default '#4f46e5',
  logo_url         text,
  welcome_message  text default '¡Bienvenido/a a la academia! Empieza por el Classroom y revisa el calendario de sesiones.',
  allow_signup     boolean not null default true,   -- mostrar «Crear cuenta» en el login
  auto_approve     boolean not null default false   -- dar acceso sin aprobación manual
);
insert into public.settings (id) values (1);

-- =====================================================================
-- FUNCIONES DE AYUDA (security definer = evitan recursión en RLS)
-- =====================================================================
create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create or replace function public.is_active()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active)
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() = 'admin', false)
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() in ('admin', 'coach'), false)
$$;

-- ¿Puede el usuario actual ver el CONTENIDO de un curso?
create or replace function public.can_view_course(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff() or (
    public.is_active()
    and exists (select 1 from public.courses c where c.id = cid and c.published)
    and (
      not exists (select 1 from public.course_access ca where ca.course_id = cid)
      or exists (
        select 1
        from public.course_access ca
        join public.member_access ma on ma.access_level_id = ca.access_level_id
        where ca.course_id = cid and ma.user_id = auth.uid()
      )
    )
  )
$$;

-- ¿Puede el usuario actual ver un evento del calendario?
create or replace function public.can_view_event(eid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff() or (
    public.is_active()
    and (
      (
        not exists (select 1 from public.event_access ea where ea.event_id = eid)
        and not exists (select 1 from public.event_members em where em.event_id = eid)
      )
      or exists (select 1 from public.event_members em where em.event_id = eid and em.user_id = auth.uid())
      or exists (
        select 1
        from public.event_access ea
        join public.member_access ma on ma.access_level_id = ea.access_level_id
        where ea.event_id = eid and ma.user_id = auth.uid()
      )
    )
  )
$$;

-- Archivos privados: la ruta empieza por el id del curso  =>  {course_id}/{lesson_id}/archivo
create or replace function public.can_read_course_file(object_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff() or exists (
    select 1 from public.courses c
    where c.id::text = split_part(object_name, '/', 1)
      and public.can_view_course(c.id)
  )
$$;

-- =====================================================================
-- TRIGGERS
-- =====================================================================

-- Al crear un usuario en Auth (registro con email, Google o alta desde el panel) se crea su perfil.
-- El PRIMER usuario de la academia se convierte en admin automáticamente.
-- El resto queda PENDIENTE de aprobación (salvo que actives la aprobación automática en Ajustes).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_first boolean;
  approve boolean;
begin
  select not exists (select 1 from public.profiles) into is_first;
  select coalesce((select auto_approve from public.settings where id = 1), false) into approve;
  insert into public.profiles (id, email, full_name, avatar_url, role, active, pending)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    case when is_first then 'admin' else 'member' end,
    is_first or approve,
    not (is_first or approve)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Un miembro puede editar su nombre/foto/bio, pero NO su rol, estado ni email.
create or replace function public.protect_profile_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    new.role   := old.role;
    new.active := old.active;
    new.email  := old.email;
    new.pending := old.pending;
  end if;
  return new;
end;
$$;

create trigger protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- Solo admin/coach pueden fijar publicaciones.
create or replace function public.protect_post_pin()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_staff() then
    if tg_op = 'INSERT' then
      new.pinned := false;
    else
      new.pinned := old.pinned;
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_post_pin
  before insert or update on public.posts
  for each row execute function public.protect_post_pin();

-- =====================================================================
-- SEGURIDAD A NIVEL DE FILA (RLS)
-- =====================================================================
alter table public.profiles         enable row level security;
alter table public.access_levels    enable row level security;
alter table public.member_access    enable row level security;
alter table public.courses          enable row level security;
alter table public.course_access    enable row level security;
alter table public.modules          enable row level security;
alter table public.lessons          enable row level security;
alter table public.lesson_files     enable row level security;
alter table public.lesson_progress  enable row level security;
alter table public.events           enable row level security;
alter table public.event_access     enable row level security;
alter table public.event_members    enable row level security;
alter table public.posts            enable row level security;
alter table public.comments         enable row level security;
alter table public.post_likes       enable row level security;
alter table public.settings         enable row level security;

-- PERFILES
create policy "perfil: leer propio o si estás activo" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_active());
create policy "perfil: editar propio o admin" on public.profiles
  for update to authenticated using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
create policy "perfil: admin borra" on public.profiles
  for delete to authenticated using (public.is_admin());

-- NIVELES DE ACCESO
create policy "niveles: leer activos" on public.access_levels
  for select to authenticated using (public.is_active());
create policy "niveles: admin gestiona" on public.access_levels
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "accesos miembro: leer propios o staff" on public.member_access
  for select to authenticated using (user_id = auth.uid() or public.is_staff());
create policy "accesos miembro: admin gestiona" on public.member_access
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- CURSOS (la ficha del curso se ve con candado si show_locked = true)
create policy "cursos: leer" on public.courses
  for select to authenticated using (
    public.is_staff() or (public.is_active() and published and (show_locked or public.can_view_course(id)))
  );
create policy "cursos: staff gestiona" on public.courses
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "acceso curso: leer activos" on public.course_access
  for select to authenticated using (public.is_active());
create policy "acceso curso: staff gestiona" on public.course_access
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- MÓDULOS Y LECCIONES (solo con acceso al curso)
create policy "módulos: leer con acceso" on public.modules
  for select to authenticated using (public.can_view_course(course_id));
create policy "módulos: staff gestiona" on public.modules
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "lecciones: leer con acceso" on public.lessons
  for select to authenticated using (public.is_staff() or (published and public.can_view_course(course_id)));
create policy "lecciones: staff gestiona" on public.lessons
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "archivos: leer con acceso" on public.lesson_files
  for select to authenticated using (public.can_view_course(course_id));
create policy "archivos: staff gestiona" on public.lesson_files
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- PROGRESO
create policy "progreso: leer propio o staff" on public.lesson_progress
  for select to authenticated using (user_id = auth.uid() or public.is_staff());
create policy "progreso: marcar propio" on public.lesson_progress
  for insert to authenticated with check (
    user_id = auth.uid()
    and public.can_view_course(course_id)
    and exists (select 1 from public.lessons l where l.id = lesson_id and l.course_id = lesson_progress.course_id)
  );
create policy "progreso: desmarcar propio" on public.lesson_progress
  for delete to authenticated using (user_id = auth.uid());

-- EVENTOS
create policy "eventos: leer si tienes acceso" on public.events
  for select to authenticated using (public.can_view_event(id));
create policy "eventos: staff gestiona" on public.events
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "acceso evento: leer" on public.event_access
  for select to authenticated using (public.can_view_event(event_id));
create policy "acceso evento: staff gestiona" on public.event_access
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "miembros evento: leer" on public.event_members
  for select to authenticated using (public.is_staff() or user_id = auth.uid());
create policy "miembros evento: staff gestiona" on public.event_members
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- COMUNIDAD
create policy "posts: leer activos" on public.posts
  for select to authenticated using (public.is_active());
create policy "posts: crear propio" on public.posts
  for insert to authenticated with check (public.is_active() and author_id = auth.uid());
create policy "posts: editar autor o staff" on public.posts
  for update to authenticated using (author_id = auth.uid() or public.is_staff())
  with check (author_id = auth.uid() or public.is_staff());
create policy "posts: borrar autor o staff" on public.posts
  for delete to authenticated using (author_id = auth.uid() or public.is_staff());

create policy "comentarios: leer activos" on public.comments
  for select to authenticated using (public.is_active());
create policy "comentarios: crear propio" on public.comments
  for insert to authenticated with check (public.is_active() and author_id = auth.uid());
create policy "comentarios: borrar autor o staff" on public.comments
  for delete to authenticated using (author_id = auth.uid() or public.is_staff());

create policy "likes: leer activos" on public.post_likes
  for select to authenticated using (public.is_active());
create policy "likes: dar propio" on public.post_likes
  for insert to authenticated with check (public.is_active() and user_id = auth.uid());
create policy "likes: quitar propio" on public.post_likes
  for delete to authenticated using (user_id = auth.uid());

-- AJUSTES (el nombre/logo se muestra también en la pantalla de login)
create policy "ajustes: leer todos" on public.settings
  for select to anon, authenticated using (true);
create policy "ajustes: admin edita" on public.settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- PERMISOS DE LA API
--   Se conceden explícitamente (por si tu proyecto no expone tablas nuevas
--   automáticamente). La seguridad real la ponen las políticas RLS de arriba.
--   El EMAIL de los perfiles solo lo ve el servidor (privacidad entre miembros).
-- =====================================================================
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;
revoke all on all tables in schema public from anon;
grant select on public.settings to anon;

revoke select on public.profiles from authenticated;
grant select (id, full_name, avatar_url, bio, role, active, pending, created_at) on public.profiles to authenticated;

-- =====================================================================
-- STORAGE (archivos)
--   public-assets : imágenes (portadas, fotos de perfil, logo, imágenes de lecciones y posts). Máx. 10 MB
--   course-files  : vídeos y recursos de las lecciones (PRIVADO)
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('public-assets', 'public-assets', true, 10485760, array['image/*'])
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('course-files', 'course-files', false)
  on conflict (id) do nothing;

-- public-assets: cada usuario sube su foto en avatars/{su_id}/ y las imágenes de sus posts en posts/{su_id}/;
-- el staff puede subir en cualquier carpeta.
create or replace function public.can_write_public_asset(object_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff() or (
    public.is_active()
    and split_part(object_name, '/', 1) in ('avatars', 'posts')
    and split_part(object_name, '/', 2) = auth.uid()::text
  )
$$;

create policy "assets: subir" on storage.objects
  for insert to authenticated with check (bucket_id = 'public-assets' and public.can_write_public_asset(name));
create policy "assets: actualizar" on storage.objects
  for update to authenticated using (bucket_id = 'public-assets' and public.can_write_public_asset(name));
create policy "assets: borrar" on storage.objects
  for delete to authenticated using (bucket_id = 'public-assets' and public.can_write_public_asset(name));

-- course-files: solo lo leen quienes tienen acceso al curso; solo el staff sube/borra.
create policy "course-files: leer con acceso" on storage.objects
  for select to authenticated using (
    bucket_id = 'course-files' and public.can_read_course_file(name)
  );
create policy "course-files: staff sube" on storage.objects
  for insert to authenticated with check (bucket_id = 'course-files' and public.is_staff());
create policy "course-files: staff actualiza" on storage.objects
  for update to authenticated using (bucket_id = 'course-files' and public.is_staff());
create policy "course-files: staff borra" on storage.objects
  for delete to authenticated using (bucket_id = 'course-files' and public.is_staff());


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

-- Texto personalizado del botón de una herramienta
alter table public.benefits add column if not exists claim_label text check (char_length(claim_label) <= 60);
