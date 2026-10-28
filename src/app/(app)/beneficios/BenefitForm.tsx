import Link from "next/link";
import type { Benefit } from "@/lib/types";
import { ImageUpload } from "@/components/ImageUpload";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { SubmitButton } from "@/components/SubmitButton";

export function BenefitForm({ action, benefit }: { action: (formData: FormData) => Promise<void>; benefit?: Benefit }) {
  return (
    <form action={action} className="card space-y-5 p-6">
      {benefit && <input type="hidden" name="id" value={benefit.id} />}
      <div>
        <label className="label" htmlFor="title">Nombre del beneficio</label>
        <input id="title" name="title" required defaultValue={benefit?.title} className="input" placeholder="Ej: Google AI Pro · 18 meses" />
      </div>
      <div>
        <label className="label" htmlFor="description">Descripción e instrucciones</label>
        <MarkdownEditor id="description" name="description" folder="benefits" rows={7} defaultValue={benefit?.description ?? ""} />
      </div>
      <div>
        <span className="label">Imagen (opcional)</span>
        <ImageUpload name="image_url" folder="benefits" defaultUrl={benefit?.image_url} />
      </div>
      <div>
        <label className="label" htmlFor="claim_url">Enlace para activarlo</label>
        <input id="claim_url" name="claim_url" type="url" defaultValue={benefit?.claim_url ?? ""} className="input" placeholder="https://..." />
        <p className="hint">Se muestra al alumno después de reclamarlo.</p>
      </div>

      <fieldset className="space-y-3 rounded-xl border border-zinc-200 p-4">
        <legend className="px-1 text-sm font-semibold">¿Cómo se entrega?</legend>
        <label className="flex items-start gap-2 text-sm">
          <input type="radio" name="delivery" value="link" defaultChecked={(benefit?.delivery ?? "link") === "link"} className="mt-0.5 accent-brand" />
          <span>
            <span className="font-medium">Solo el enlace</span>
            <span className="block text-xs text-zinc-500">Todos usan el mismo enlace de activación.</span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="radio" name="delivery" value="code" defaultChecked={benefit?.delivery === "code"} className="mt-0.5 accent-brand" />
          <span>
            <span className="font-medium">Un código único por alumno</span>
            <span className="block text-xs text-zinc-500">Pega tus códigos abajo: cada alumno recibe uno automáticamente al reclamar.</span>
          </span>
        </label>
        <div>
          <label className="label" htmlFor="codes">Añadir códigos (uno por línea)</label>
          <textarea id="codes" name="codes" rows={5} className="input font-mono text-xs" placeholder={"ABCD-1234-EFGH\nIJKL-5678-MNOP"} />
          <p className="hint">Los códigos que ya existen no se duplican.</p>
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={benefit?.active ?? true} className="accent-brand" />
          <span className="font-medium">Visible para los alumnos</span>
        </label>
        <div className="flex items-center gap-2">
          <label className="text-sm text-zinc-600" htmlFor="position">Orden</label>
          <input id="position" name="position" type="number" defaultValue={benefit?.position ?? 0} className="input max-w-24" />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Link href="/beneficios" className="btn btn-secondary">Volver</Link>
        <SubmitButton pendingText="Guardando...">{benefit ? "Guardar cambios" : "Crear beneficio"}</SubmitButton>
      </div>
    </form>
  );
}
