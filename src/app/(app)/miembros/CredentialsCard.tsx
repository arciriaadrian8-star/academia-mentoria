"use client";

import { MessageCircle } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import type { Credentials } from "@/lib/types";

export function CredentialsCard({ creds, title }: { creds: Credentials; title: string }) {
  const message = `¡Hola ${creds.name?.split(" ")[0] ?? ""}! 👋

Ya tienes acceso a ${creds.academy} 🎉

🔗 Entra aquí: ${creds.loginUrl}
📧 Email: ${creds.email}
🔑 Contraseña: ${creds.password}

Te recomiendo cambiar la contraseña desde «Mi perfil» al entrar.`;

  return (
    <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
      <p className="font-semibold text-emerald-900">{title}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-emerald-800">Email</dt>
        <dd className="font-mono">{creds.email}</dd>
        <dt className="text-emerald-800">Contraseña</dt>
        <dd className="font-mono">{creds.password}</dd>
      </dl>
      <p className="text-xs text-emerald-800">Guárdala o envíasela ahora: por seguridad no se volverá a mostrar.</p>
      <div className="flex flex-wrap gap-2">
        <CopyButton text={message} label="Copiar mensaje de bienvenida" />
        <a
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-sm bg-[#25D366] text-white hover:brightness-105"
        >
          <MessageCircle className="size-3.5" /> Enviar por WhatsApp
        </a>
      </div>
    </div>
  );
}
