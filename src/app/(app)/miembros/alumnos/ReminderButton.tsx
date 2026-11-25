"use client";

import { useTransition } from "react";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { markReminded } from "./actions";

/** Abre WhatsApp con el mensaje listo y deja constancia del recordatorio en el seguimiento. */
export function ReminderButton({ id, href, label = "Recordar", className }: { id: string; href: string | null; label?: string; className?: string }) {
  const [pending, start] = useTransition();
  if (!href) {
    return (
      <span className="text-xs text-zinc-400" title="Agrega su WhatsApp en la ficha">
        Sin WhatsApp
      </span>
    );
  }
  return (
    <button
      type="button"
      disabled={pending}
      className={cn("btn btn-sm bg-emerald-600 text-white hover:bg-emerald-700", className)}
      onClick={() => {
        window.open(href, "_blank", "noopener");
        start(() => markReminded(id));
      }}
    >
      <MessageCircle className="size-3.5" /> {label}
    </button>
  );
}
