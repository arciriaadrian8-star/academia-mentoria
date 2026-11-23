import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Settings } from "@/lib/types";

/** Columnas visibles para los usuarios (el email solo lo lee el servidor). */
export const PROFILE_COLUMNS = "id, full_name, avatar_url, bio, role, active, pending, created_at, welcome_seen_at, access_until";

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

/** ¿Es una cuenta «Solo Kit» cuyo acceso ya venció? */
export function isKitExpired(profile: Pick<Profile, "role" | "access_until">) {
  return profile.role === "kit" && Boolean(profile.access_until) && new Date(profile.access_until!).getTime() <= Date.now();
}

/**
 * Usuario con acceso a las herramientas del Kit COD: miembros de la academia
 * y cuentas «Solo Kit» con el acceso vigente.
 */
export async function requireKit() {
  const { supabase, user, profile } = await getSession();
  if (!user || !profile) redirect("/login");
  if (!profile.active) redirect("/pendiente");
  const isKitOnly = profile.role === "kit";
  if (isKitOnly && isKitExpired(profile)) redirect("/acceso-vencido");
  const isStaff = profile.role === "admin" || profile.role === "coach";
  return { supabase, user, profile, isStaff, isAdmin: profile.role === "admin", isKitOnly };
}

/** Usuario con sesión y acceso a la academia completa. Las cuentas «Solo Kit» se mandan al Kit. */
export async function requireActive() {
  const session = await requireKit();
  if (session.isKitOnly) redirect("/kit");
  return session;
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
  allow_signup: true,
  auto_approve: false,
  landing_budget_pct: 3,
  landing_image_model: "gemini-3.1-flash-image-preview",
  landing_default_usd_kit: 14,
  landing_default_usd_member: 14,
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
