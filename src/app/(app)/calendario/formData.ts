import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AccessLevel } from "@/lib/types";

/** Llamar solo después de requireStaff(): lee emails con la clave de servidor. */
export async function getAudienceOptions(supabase: SupabaseClient) {
  const [levelsRes, membersRes] = await Promise.all([
    supabase.from("access_levels").select("*").order("name"),
    createAdminClient().from("profiles").select("id, full_name, email").eq("active", true).order("full_name"),
  ]);
  return {
    levels: (levelsRes.data ?? []) as AccessLevel[],
    members: (membersRes.data ?? []) as { id: string; full_name: string; email: string }[],
  };
}
