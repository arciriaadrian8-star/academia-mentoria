import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Settings } from "@/lib/types";

/** Columnas visibles para los usuarios (el email solo lo lee el servidor). */
export const PROFILE_COLUMNS = "id, full_name, avatar_url, bio, role, active, created_at";

export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };
  const { data } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", user.id).single();
  const profile = data ? ({ ...data, email: user.email ?? "" } as Profile) : null;
  return { supabase, user, profile };
});

/** Usuario con sesión y cuenta activa. */
export async function requireActive() {
  const { supabase, user, profile } = await getSession();
  if (!user || !profile) redirect("/login");
  if (!profile.active) redirect("/pendiente");
  const isStaff = profile.role === "admin" || profile.role === "coach";
  return { supabase, user, profile, isStaff, isAdmin: profile.role === "admin" };
}

/** Admin o coach. */
export async function requireStaff() {
  const session = await requireActive();
  if (!session.isStaff) redirect("/");
  return session;
}

export async function requireAdmin() {
  const session = await requireActive();
  if (!session.isAdmin) redirect("/");
  return session;
}

const DEFAULT_SETTINGS: Settings = {
  academy_name: "Mi Academia",
  tagline: "Mentoría 1 a 1",
  primary_color: "#4f46e5",
  logo_url: null,
  welcome_message: null,
};

export const getSettings = cache(async (): Promise<Settings> => {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle();
    return { ...DEFAULT_SETTINGS, ...(data ?? {}) };
  } catch {
    return DEFAULT_SETTINGS;
  }
});
