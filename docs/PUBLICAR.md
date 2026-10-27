# Estado de la publicación (para continuar en una sesión nueva)

## Ya hecho
- Código terminado y probado (ver README).
- Proyecto creado en **Netlify** (plan Free, equipo `arciriaadrian8`):
  - Nombre: `academia-mentoria-adrian`
  - Site ID: `428455e6-68a2-4680-9832-2d43f5f24d77`
  - URL: https://academia-mentoria-adrian.netlify.app
  - Variable ya configurada: `NEXT_PUBLIC_SITE_URL=https://academia-mentoria-adrian.netlify.app`

- Código en GitHub: https://github.com/arciriaadrian8-star/academia-mentoria (rama `main`).
- El usuario vincula ese repositorio al proyecto de Netlify (Project configuration → Build & deploy →
  Link repository). Desde entonces **cada push a `main` publica la web** (15 créditos por publicación).

## Requisitos de la sesión
- Conector **Supabase** conectado (claude.ai/customize/connectors).
- Conector **Netlify** conectado.

## Pasos que faltan
1. **Supabase**: crear un proyecto gratuito (región cercana al usuario) y aplicar `supabase/schema.sql` completo como migración.
2. Obtener la **Project URL** y la **Publishable key** y guardarlas en Netlify como
   `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. El usuario copia la **Secret key** (Supabase → Project Settings → API Keys) en Netlify →
   Project configuration → Environment variables → `SUPABASE_SECRET_KEY` (marcada como secreta).
4. Publicar: hacer push a `main` (Netlify compila desde GitHub). Si el repositorio aún no está vinculado,
   pedir al usuario que lo vincule; como alternativa, `deploy-site` del conector de Netlify (requiere que
   la red del entorno permita `api.netlify.com` y `netlify-mcp.netlify.app`).
5. El usuario configura en Supabase → Authentication:
   - URL Configuration → Site URL `https://academia-mentoria-adrian.netlify.app` y Redirect URLs `https://academia-mentoria-adrian.netlify.app/**`.
   - Sign In / Providers → Email → desactivar «Confirm email» (hasta tener SMTP propio).
6. Abrir la web → pantalla de configuración inicial → crear la cuenta de admin.
7. Opcional: activar Google (README, paso 6) y dominio propio.
