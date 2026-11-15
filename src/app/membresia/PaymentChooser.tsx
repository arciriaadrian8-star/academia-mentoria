"use client";

import { useState } from "react";
import { CreditCard, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { CardCheckout } from "./CardCheckout";
import { NequiCheckout } from "./NequiCheckout";

export function PaymentChooser({ planId, resumePending }: { planId: string; resumePending: boolean }) {
  const [method, setMethod] = useState<"nequi" | "card">("nequi");
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 text-sm font-semibold">
        {([
          { id: "nequi", label: "Nequi", icon: Smartphone },
          { id: "card", label: "Tarjeta", icon: CreditCard },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMethod(id)}
            className={cn("flex items-center justify-center gap-1.5 rounded-lg py-2 transition", method === id ? "bg-white shadow-sm" : "text-zinc-500")}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>
      {method === "nequi" ? <NequiCheckout planId={planId} resumePending={resumePending} /> : <CardCheckout planId={planId} />}
    </div>
  );
}
