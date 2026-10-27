import "server-only";
import { headers } from "next/headers";

/** URL pública de la academia (para enlaces de email, Google y mensajes de bienvenida). */
export async function getOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}
