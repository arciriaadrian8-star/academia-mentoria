import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";

const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export function hasAdminKey() {
  return Boolean(SUPABASE_URL && SECRET_KEY);
}

/** Cliente con permisos totales. Solo para crear/borrar usuarios desde el servidor. */
export function createAdminClient() {
  if (!hasAdminKey()) {
    throw new Error("Falta la variable SUPABASE_SECRET_KEY en el servidor.");
  }
  return createClient(SUPABASE_URL, SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
