import "server-only";
import { headers } from "next/headers";

/** URL pública de la academia (para enlaces de email, Google y mensajes de bienvenida). */
/**
 * Dominio desde el que el usuario está navegando ahora mismo. Se usa en los enlaces de
 * inicio de sesión / recuperar contraseña para que el enlace vuelva al MISMO dominio
 * (si no, el navegador no encuentra la sesión y el enlace "no lleva a nada").
 */
export async function getRequestOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return getOrigin();
  return `${h.get("x-forwarded-proto") ?? "https"}://${host}`;
}

export async function getOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}
