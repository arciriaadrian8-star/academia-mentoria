"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { whatsappLink } from "@/lib/makedrop";

/**
 * Final del pago: guarda el correo de Skool (para el panel del admin) y lleva al alumno al WhatsApp
 * de Adrián con el mensaje ya escrito para que lo invite a la comunidad privada en Skool.
 */
export function NextSteps({ skoolUrl, whatsapp, name, savedEmail, checkoutToken = null, autoRedirect = false }: {
  skoolUrl: string; whatsapp: string; name: string; savedEmail: string | null; checkoutToken?: string | null; autoRedirect?: boolean;
}) {
  const supabase = useRef(createClient()).current;
  const email = savedEmail ?? "";
  const link = whatsappLink(
    whatsapp,
    `Hola Adrián 👋 Ya pagué MakeDrop IA. Mi nombre es ${name} y mi correo de Skool es: ${email || "____"}`,
  );
  const [seconds, setSeconds] = useState(autoRedirect ? 5 : 0);

  // Guarda el correo como correo de Skool para que aparezca en el panel del admin.
  useEffect(() => {
    if (email) void supabase.functions.invoke("nequi-suscripcion", { body: { action: "skool_email", email, checkout_token: checkoutToken } });
  }, [email, checkoutToken, supabase]);

  // Cuenta regresiva y redirección automática a WhatsApp.
  useEffect(() => {
    if (!autoRedirect) return;
    if (seconds <= 0) { window.location.href = link; return; }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, autoRedirect, link]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-zinc-50 p-4 text-sm">
        <p className="font-semibold">Último paso: envíame tu correo por WhatsApp</p>
        <p className="mt-1 text-zinc-600">
          Con ese correo te invito a la comunidad privada de MakeDrop IA en Skool. Si aún no tienes cuenta en Skool,{" "}
          <a href={skoolUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:underline">
            créala aquí <ExternalLink className="inline size-3" />
          </a>{" "}
          con ese mismo correo.
        </p>
      </div>
      <a href={link} className="btn btn-primary w-full">
        <MessageCircle className="size-4" /> Ir a WhatsApp{autoRedirect && seconds > 0 ? ` (${seconds})` : ""}
      </a>
    </div>
  );
}
