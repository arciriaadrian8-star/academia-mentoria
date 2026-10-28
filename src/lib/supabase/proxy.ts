import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL, isConfigured } from "@/lib/env";

const PUBLIC_PATHS = ["/login", "/registro", "/recuperar", "/auth", "/setup"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isConfigured()) return response;

  // Si Supabase devolvió el enlace del email a la página principal (o al login) en vez de a
  // /auth/confirm, lo reenviamos para completar el cambio de contraseña.
  const { pathname, searchParams } = request.nextUrl;
  if ((pathname === "/" || pathname === "/login") && (searchParams.has("code") || searchParams.has("token_hash"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/confirm";
    if (!url.searchParams.has("next")) url.searchParams.set("next", "/nueva-contrasena");
    return NextResponse.redirect(url);
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Refresca la sesión. No pongas código entre createServerClient y getClaims.
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims);

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  if (!isLoggedIn && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}
