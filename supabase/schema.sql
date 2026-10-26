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
  welcome_message  text default '¡Bienvenido/a a la academia! Empieza por el Classroom y revisa el calendario de sesiones.'
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

-- Al crear un usuario en Auth se crea su perfil.
-- El PRIMER usuario de la academia se convierte en admin automáticamente.
-- El resto queda inactivo hasta que el admin lo active (o lo cree desde el panel).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_first boolean;
begin
  select not exists (select 1 from public.profiles) into is_first;
  insert into public.profiles (id, email, full_name, role, active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when is_first then 'admin' else 'member' end,
    is_first
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
grant select (id, full_name, avatar_url, bio, role, active, created_at) on public.profiles to authenticated;

-- =====================================================================
-- STORAGE (archivos)
--   public-assets : portadas de cursos, fotos de perfil, logo (público)
--   course-files  : vídeos y recursos de las lecciones (PRIVADO)
-- =====================================================================
insert into storage.buckets (id, name, public) values ('public-assets', 'public-assets', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('course-files', 'course-files', false)
  on conflict (id) do nothing;

-- public-assets: cada usuario sube su avatar en avatars/{su_id}/...; el staff sube el resto.
create policy "assets: subir" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'public-assets' and (
      public.is_staff()
      or (split_part(name, '/', 1) = 'avatars' and split_part(name, '/', 2) = auth.uid()::text)
    )
  );
create policy "assets: actualizar" on storage.objects
  for update to authenticated using (
    bucket_id = 'public-assets' and (
      public.is_staff()
      or (split_part(name, '/', 1) = 'avatars' and split_part(name, '/', 2) = auth.uid()::text)
    )
  );
create policy "assets: borrar" on storage.objects
  for delete to authenticated using (
    bucket_id = 'public-assets' and (
      public.is_staff()
      or (split_part(name, '/', 1) = 'avatars' and split_part(name, '/', 2) = auth.uid()::text)
    )
  );

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
