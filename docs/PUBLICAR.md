# Estado de la publicación (para continuar en una sesión nueva)

## Ya hecho
- Código terminado y probado (ver README).
- Proyecto en **Netlify** (plan Free, equipo `arciriaadrian8`), **vinculado a GitHub** y publicado:
  - Nombre: `academia-mentoria-adrian`
  - Site ID: `31b4a630-4e21-4827-a1b7-83ff7c4bf94f`
  - URL: https://academia-mentoria-adrian.netlify.app
  - Variable ya configurada: `NEXT_PUBLIC_SITE_URL=https://academia-mentoria-adrian.netlify.app`
  - Las funciones del servidor corren en `us-east-2` → crear Supabase en **East US (North Virginia)**.
  - Hay un proyecto vacío antiguo, `academia-mentoria-adrian-vacio`, que el usuario puede borrar.
- Código en GitHub: https://github.com/arciriaadrian8-star/academia-mentoria (rama `main`).
  **Cada push a `main` publica la web (15 créditos)**. Para cambios solo de documentación, poner
  `[skip netlify]` en el mensaje del commit.

## Requisitos de la sesión
- Conector **Supabase** conectado (claude.ai/customize/connectors).
- Conector **Netlify** conectado.

## Pasos que faltan
1. **Supabase**: crear un proyecto gratuito (región cercana al usuario) y aplicar `supabase/schema.sql` completo como migración.
2. Obtener la **Project URL** y la **Publishable key** y guardarlas en Netlify como
   `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. El usuario copia la **Secret key** (Supabase → Project Settings → API Keys) en Netlify →
   Project configuration → Environment variables → `SUPABASE_SECRET_KEY` (marcada como secreta).
4. Publicar con las variables nuevas: hacer push a `main` (por ejemplo un commit vacío
   «Publicar con Supabase»). Netlify compila desde GitHub. Las variables `NEXT_PUBLIC_*` solo
   se aplican al compilar, así que hay que publicar después de guardarlas.
5. El usuario configura en Supabase → Authentication:
   - URL Configuration → Site URL `https://academia-mentoria-adrian.netlify.app` y Redirect URLs `https://academia-mentoria-adrian.netlify.app/**`.
   - Sign In / Providers → Email → desactivar «Confirm email» (hasta tener SMTP propio).
6. Abrir la web → pantalla de configuración inicial → crear la cuenta de admin.
7. Opcional: activar Google (README, paso 6) y dominio propio.
