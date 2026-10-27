# 🎓 Academia de Mentoría

Plataforma privada tipo **Skool** para los miembros de tu mentoría 1 a 1: cada alumno inicia sesión con su cuenta y ve **solo el contenido que le corresponde**.

![Classroom](docs/classroom.png)

## ¿Qué incluye?

| Sección | Qué puedes hacer |
|---|---|
| **Classroom** | Cursos → módulos → lecciones. Cada lección tiene vídeo (YouTube, Vimeo, Loom, Google Drive o subido), texto con formato e **imágenes** (botón, pegar o arrastrar) y archivos descargables (PDF, plantillas…). Los alumnos marcan lecciones como completadas y ven su % de progreso. |
| **Calendario** | Eventos en vista mensual, repetitivos (semanal, quincenal, mensual), con enlace de Zoom/Meet y botón «Añadir a Google Calendar». Puedes crear **sesiones 1:1 privadas** que solo ve ese miembro. Cada persona ve las horas en su zona horaria. |
| **Comunidad** | Publicaciones con imágenes, categorías, comentarios, «me gusta» y anuncios fijados. |
| **Acceso** | Los alumnos se **registran con email y contraseña o con Google**, y tú les **das acceso** desde Miembros → Solicitudes (o activas la aprobación automática). También puedes crear tú la cuenta y enviar la contraseña por WhatsApp con un clic. |
| **Miembros** | Ves el progreso de cada alumno, le cambias el nivel, le quitas el acceso o le generas una contraseña nueva. |
| **Niveles de acceso** | Crea niveles como «Básico», «Premium» o «VIP 1:1» y decide qué cursos y eventos ve cada nivel. |
| **Ajustes** | Nombre de la academia, logo, color de marca y mensaje de bienvenida. |

### Roles

| Rol | Permisos |
|---|---|
| **Admin** (tú) | Todo: contenido, calendario, miembros, niveles y ajustes. |
| **Coach** | Crea y edita cursos, lecciones y eventos, y modera la comunidad. No gestiona miembros ni ajustes. |
| **Miembro** | Ve los cursos y eventos de sus niveles (más los que son para todos), participa en la comunidad y edita su perfil. |

> Un curso o evento **sin niveles** lo ven todos los miembros. Uno **con niveles** solo lo ven los miembros que tengan alguno de esos niveles. Los cursos bloqueados pueden mostrarse con un candado 🔒 para que sepan que existen (o esconderse del todo).

---

## 🚀 Puesta en marcha (sin programar)

Todo funciona con planes **gratuitos**: [Supabase](https://supabase.com) (base de datos, usuarios y archivos) y [Netlify](https://www.netlify.com) (donde se publica la web). El plan gratis de Netlify permite proyectos comerciales.

### 1. Crea el proyecto en Supabase

1. Entra en [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**. Elige un nombre, una contraseña para la base de datos y la región más cercana a tus alumnos.
2. Cuando esté listo, ve a **SQL Editor → New query**.
3. Abre el archivo [`supabase/schema.sql`](supabase/schema.sql) de este repositorio, **copia todo su contenido**, pégalo y pulsa **Run**. Debe terminar con «Success. No rows returned».

### 2. Copia tus claves

En **Project Settings → API Keys** (y **Data API** para la URL) copia:

| Variable | Dónde está |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (`https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | *Publishable key* (`sb_publishable_…`) — o la antigua *anon key* |
| `SUPABASE_SECRET_KEY` | *Secret key* (`sb_secret_…`) — o la antigua *service_role key*. **Nunca la compartas.** |
| `NEXT_PUBLIC_SITE_URL` | La URL pública de tu academia, ej. `https://tu-academia.netlify.app` |

### 3. Publica la web en Netlify

1. Sube este repositorio a tu GitHub.
2. En [app.netlify.com](https://app.netlify.com) → **Add new project → Import an existing project** → GitHub → elige el repositorio. Netlify detecta Next.js solo (la configuración está en `netlify.toml`).
3. En **Environment variables** añade las 4 variables del paso 2 (marca `SUPABASE_SECRET_KEY` como secreta) y pulsa **Deploy**.
4. Cada vez que se actualice el código en GitHub, Netlify publica la nueva versión automáticamente.

### 4. Configura el acceso en Supabase (Authentication)

1. **URL Configuration**:
   - **Site URL**: `https://tu-academia.netlify.app` (o tu dominio).
   - **Redirect URLs**: añade `https://tu-academia.netlify.app/**`.
2. **Sign In / Providers → Email**: desactiva **«Confirm email»** mientras no tengas un servidor de correo propio (ver «Emails» más abajo). Tus alumnos igualmente necesitan que tú les des acceso, así que no es un riesgo.

### 5. Crea tu cuenta de administrador

Abre la URL de tu academia. La primera vez verás la pantalla **«¡Bienvenido/a!»**: escribe el nombre de la academia, tu nombre, email y contraseña. Esa cuenta será la de **Admin**. Esta pantalla desaparece para siempre en cuanto existe el primer usuario.

### 6. (Opcional) Activa «Continuar con Google»

1. En [Google Cloud Console](https://console.cloud.google.com) crea un proyecto → **APIs & Services → OAuth consent screen**: tipo *External*, nombre de la academia y tu email. En **Audience**, pulsa **Publish app** para que cualquier persona pueda entrar.
2. **Credentials → Create credentials → OAuth client ID** → *Web application*. En **Authorized redirect URIs** pon `https://<tu-proyecto>.supabase.co/auth/v1/callback` (el que aparece en Supabase al abrir el proveedor Google).
3. Copia el **Client ID** y el **Client secret** en Supabase → **Authentication → Sign In / Providers → Google** → activa y guarda.

El botón «Continuar con Google» aparece solo en el login y el registro en cuanto lo activas.

¡Listo! 🎉

---

## 📚 Uso diario

### Dar acceso a un alumno
1. **Miembros → Niveles de acceso**: crea tus niveles (ej. «Premium», «VIP 1:1»). Solo la primera vez.
2. Comparte el **enlace de registro** (lo tienes en **Ajustes**, ej. `https://tu-academia.netlify.app/registro`). El alumno se registra con email o Google.
3. Te llega a **Miembros → Solicitudes de acceso** (la pestaña muestra un aviso con el número). Marca sus niveles y pulsa **Dar acceso**, o **Rechazar**.

También puedes crear tú la cuenta: **Miembros → Nuevo miembro** → **Crear acceso** → **Enviar por WhatsApp** (incluye enlace, email y contraseña temporal). En **Ajustes** puedes activar la aprobación automática o cerrar el registro.

¿Un alumno olvidó su contraseña? Entra en su ficha → **Nueva contraseña** y envíasela. ¿Terminó la mentoría? Desmarca **Cuenta activa** y pierde el acceso sin borrar su historial.

### Subir un módulo al Classroom
1. **Classroom → Nuevo curso** → título y descripción.
2. En el editor del curso: **Añadir módulo** (ej. «Módulo 1 · Bienvenida») y dentro **+ Lección**.
3. En cada lección: pega el enlace del vídeo **o** súbelo, escribe las notas, añade imágenes (botón **Imagen**, o pégalas / arrástralas) y archivos descargables → **Guardar lección**.
4. En **Ajustes del curso** (columna derecha): sube una portada, elige **quién tiene acceso** y marca **Publicado**.

Puedes reordenar módulos y lecciones con las flechas ↑ ↓ y guardar lecciones como **borrador** mientras las preparas.

![Editor de curso](docs/editor-curso.png)

### Agendar sesiones
- **Calendario → Nuevo evento**. Para una llamada de grupo semanal elige «Cada semana».
- Para una **sesión 1:1**, entra en la ficha del miembro → **Agendar sesión 1:1** (el evento solo lo verá esa persona).

![Calendario](docs/calendario.png)

### Comunidad y marca
- Publica anuncios en la categoría **📢 Anuncios** y fíjalos arriba (📌 Fijar).
- En **Ajustes** cambia el nombre, el logo, el color principal y el mensaje de bienvenida.

| Comunidad | Miembros |
|---|---|
| ![Comunidad](docs/comunidad.png) | ![Miembros](docs/miembros.png) |

---

## 💡 Recomendaciones importantes

**Vídeos.** El plan gratuito de Supabase admite archivos de hasta 50 MB y 1 GB en total. Para vídeos de lecciones lo más cómodo es subirlos a **YouTube como «Oculto»**, **Vimeo** (en sus planes de pago puedes limitar la reproducción a tu dominio) o **Loom**, y pegar el enlace. La subida directa está pensada para vídeos cortos o si amplías tu plan de Supabase.

**Emails.** El correo que trae Supabase de serie es solo para pruebas: envía muy pocos emails por hora y solo a las direcciones de tu equipo en Supabase. Para que los alumnos reciban los emails de confirmación y de «¿Olvidaste tu contraseña?», configura un SMTP propio en **Authentication → Emails → SMTP Settings** (por ejemplo [Brevo](https://www.brevo.com) o [Resend](https://resend.com), con plan gratuito) y vuelve a activar «Confirm email». Mientras tanto puedes generar contraseñas nuevas desde **Miembros**, que no necesita email.

**Dominio propio.** En Netlify → **Domain management → Add a domain** añade `academia.tudominio.com` (Netlify te da el certificado HTTPS gratis). Después actualiza `NEXT_PUBLIC_SITE_URL` en Netlify, la **Site URL** y **Redirect URLs** en Supabase y, si usas Google, nada más (Google usa la URL de Supabase).

### 💶 Costes

| Servicio | Gratis | Si superas el límite del plan gratis | Plan de pago |
|---|---|---|---|
| **Netlify** | 0 $ · 300 créditos/mes | No te cobran: la web se **pausa** hasta el mes siguiente (avisos al 50 %, 75 % y 100 %) | Personal **9 $/mes** (1.000 créditos) · Pro **20 $/mes** (3.000). Créditos extra: 500 por 5 $ (Personal) |
| **Supabase** | 0 $ · 500 MB de base de datos · 1 GB de archivos · 5 GB de tráfico · 50.000 usuarios/mes | No te cobran: te avisan, hay un periodo de gracia y luego se **restringe** el servicio. Se pausa si nadie entra en 1 semana | Pro **25 $/mes**: 8 GB de base de datos, 100 GB de archivos, 250 GB de tráfico, 100.000 usuarios. Extra: 0,021 $/GB de archivos, 0,09 $/GB de tráfico |
| **Dominio** | — | — | Un `.com` suele costar entre 10 y 15 $ al año |

En Netlify cada **publicación de una versión nueva del código cuesta 15 créditos**; subir cursos, lecciones o eventos desde el panel **no** cuenta. Los vídeos de YouTube/Vimeo no consumen tráfico ni de Netlify ni de Supabase.

---

## 🔒 Seguridad

- Los permisos se aplican **en la base de datos** (Row Level Security de Postgres), no solo en la web: aunque alguien manipule la página, un miembro no puede leer cursos, lecciones, archivos o eventos que no le corresponden.
- Los vídeos y archivos subidos son **privados** y se sirven con enlaces temporales solo a quien tiene acceso.
- Los emails de los miembros solo los ve el administrador (los demás miembros no pueden obtenerlos).
- Un miembro no puede cambiarse el rol ni reactivarse a sí mismo.

---

## 🛠️ Para desarrolladores

Stack: **Next.js 16** (App Router, Server Actions) · **Supabase** (Auth, Postgres + RLS, Storage) · **Tailwind CSS 4** · TypeScript.

```bash
npm install
cp .env.example .env.local   # rellena las variables
npm run dev                  # http://localhost:3000
```

Con la [CLI de Supabase](https://supabase.com/docs/guides/local-development) puedes levantar todo en local (`supabase start`) y aplicar el esquema con `psql "$DB_URL" -f supabase/schema.sql`.

```
supabase/schema.sql          Tablas, funciones, políticas RLS y buckets de Storage
src/proxy.ts                 Refresca la sesión y protege las rutas privadas
src/lib/                     Clientes de Supabase, sesión/roles, tipos, vídeo, recurrencias
src/components/              Componentes de interfaz compartidos
src/app/(app)/comunidad      Feed, publicaciones y comentarios
src/app/(app)/classroom      Cursos, lecciones, editor y progreso
src/app/(app)/calendario     Calendario, eventos y sesiones 1:1
src/app/(app)/miembros       Alta de miembros, niveles de acceso y progreso
src/app/(app)/ajustes        Marca de la academia
src/app/login, registro, ... Login (email y Google), registro, configuración inicial y recuperación de contraseña
```
