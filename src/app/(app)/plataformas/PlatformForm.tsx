import Link from "next/link";
import { PLATFORM_CATEGORIES } from "@/lib/constants";
import type { Platform } from "@/lib/types";
import { ImageUpload } from "@/components/ImageUpload";
import { SubmitButton } from "@/components/SubmitButton";

export function PlatformForm({ action, platform }: { action: (formData: FormData) => Promise<void>; platform?: Platform }) {
  return (
    <form action={action} className="card space-y-5 p-6">
      {platform && <input type="hidden" name="id" value={platform.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Nombre</label>
          <input id="name" name="name" required defaultValue={platform?.name} className="input" placeholder="Ej: Dropi" />
        </div>
        <div>
          <label className="label" htmlFor="category">Categoría</label>
          <select id="category" name="category" defaultValue={platform?.category ?? "otros"} className="input">
            {PLATFORM_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="url">Enlace de acceso</label>
        <input id="url" name="url" type="url" required defaultValue={platform?.url} className="input" placeholder="https://..." />
        <p className="hint">Puede ser tu enlace de referido o de registro.</p>
      </div>
      <div>
        <label className="label" htmlFor="description">Para qué sirve</label>
        <textarea id="description" name="description" rows={2} defaultValue={platform?.description ?? ""} className="input" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="tutorial_url">Tutorial (opcional)</label>
          <input
            id="tutorial_url"
            name="tutorial_url"
            type="url"
            defaultValue={platform?.tutorial_url ?? ""}
            className="input"
            placeholder="Enlace a una lección o vídeo"
          />
        </div>
        <div>
          <label className="label" htmlFor="perk">Beneficio o nota (opcional)</label>
          <input id="perk" name="perk" defaultValue={platform?.perk ?? ""} className="input" placeholder="Ej: 20% de descuento con el código SOCIETY" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <div>
          <span className="label">Logo (opcional)</span>
          <ImageUpload name="logo_url" folder="platforms" defaultUrl={platform?.logo_url} shape="square" />
        </div>
        <div>
          <label className="label" htmlFor="position">Orden</label>
          <input id="position" name="position" type="number" defaultValue={platform?.position ?? 0} className="input" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Link href="/plataformas" className="btn btn-secondary">Cancelar</Link>
        <SubmitButton pendingText="Guardando...">{platform ? "Guardar cambios" : "Añadir plataforma"}</SubmitButton>
      </div>
    </form>
  );
}
