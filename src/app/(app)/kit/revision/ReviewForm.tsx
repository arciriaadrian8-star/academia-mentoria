"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { requestReview, type ReviewState } from "../actions";

export function ReviewForm() {
  const [state, action] = useActionState<ReviewState, FormData>(requestReview, null);
  return (
    <form action={action} className="card space-y-4 p-5">
      <h2 className="font-semibold">Pedir una revisión</h2>
      <div>
        <label className="label" htmlFor="store_url">Enlace de tu tienda o página de producto</label>
        <input id="store_url" name="store_url" type="url" required className="input" placeholder="https://tutienda.com/products/..." />
      </div>
      <div>
        <label className="label" htmlFor="product">Producto</label>
        <input id="product" name="product" maxLength={200} className="input" placeholder="Ej: Corrector de postura" />
      </div>
      <div>
        <label className="label" htmlFor="ad_url">Enlace del anuncio (opcional)</label>
        <input id="ad_url" name="ad_url" type="url" className="input" placeholder="Enlace de la Biblioteca de anuncios o del video" />
      </div>
      <div>
        <label className="label" htmlFor="question">¿Qué quieres que revisemos?</label>
        <textarea
          id="question"
          name="question"
          rows={4}
          maxLength={3000}
          className="input"
          placeholder="Ej: tengo clics pero no compras. CPA de $25.000, CTR 1,8%..."
        />
        <p className="hint">Mientras más datos des (CPA, CTR, efectividad), mejor será el feedback.</p>
      </div>
      <FormMessage error={state?.error} />
      <div className="flex justify-end">
        <SubmitButton pendingText="Enviando...">Enviar a revisión</SubmitButton>
      </div>
    </form>
  );
}
