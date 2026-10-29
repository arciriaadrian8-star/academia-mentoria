"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CURRENCIES } from "@/lib/kit";
import { FormMessage } from "@/components/FormMessage";
import { ImageUpload } from "@/components/ImageUpload";
import { SubmitButton } from "@/components/SubmitButton";
import { postResult, type ResultState } from "./actions";

export function ResultForm({ userId }: { userId: string }) {
  const [state, action] = useActionState<ResultState, FormData>(postResult, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [formKey, setFormKey] = useState(0);
  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setFormKey((k) => k + 1);
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="card space-y-4 p-5" key={formKey}>
      <h2 className="font-semibold">Comparte un resultado</h2>
      <div>
        <label className="label" htmlFor="title">Título</label>
        <input id="title" name="title" required maxLength={120} className="input" placeholder="Ej: ¡Mis primeros 10 pedidos en un día!" />
      </div>
      <div>
        <span className="label">Captura (Dropi, Shopify o Ads)</span>
        <ImageUpload name="image_url" folder={`results/${userId}`} />
        <p className="hint">Tapa datos personales de tus clientes antes de subirla.</p>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div>
          <label className="label" htmlFor="amount">Monto (opcional)</label>
          <input id="amount" name="amount" type="number" min={0} step="any" className="input" placeholder="Ventas o utilidad" />
        </div>
        <div>
          <label className="label" htmlFor="currency">Moneda</label>
          <select id="currency" name="currency" className="input" defaultValue="COP">
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.code}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="body">Cuéntanos cómo lo lograste</label>
        <textarea id="body" name="body" rows={3} maxLength={3000} className="input" placeholder="Producto, ángulo, oferta, qué cambiaste…" />
      </div>
      <FormMessage error={state?.error} success={state?.ok ? "¡Publicado! El equipo lo verificará pronto." : undefined} />
      <div className="flex justify-end">
        <SubmitButton pendingText="Publicando...">Publicar</SubmitButton>
      </div>
    </form>
  );
}
