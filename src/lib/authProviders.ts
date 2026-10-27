import "server-only";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/env";

/** Lee de Supabase qué métodos de acceso están activados (para no mostrar botones que no funcionan). */
export async function getAuthProviders() {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_KEY },
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { external?: Record<string, boolean>; disable_signup?: boolean };
    return { google: Boolean(data.external?.google), signupDisabled: Boolean(data.disable_signup) };
  } catch {
    return { google: false, signupDisabled: false };
  }
}
