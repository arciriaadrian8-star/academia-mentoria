"use client";

/** Si la academia se actualizó mientras la página estaba abierta, el botón ya no encuentra su acción: hay que recargar. */
const isStaleDeploy = (error: Error) => /server action|older or newer deployment|failed to fetch|chunk/i.test(error?.message ?? "");

export default function AppError({ error }: { error: Error; reset: () => void }) {
  const stale = isStaleDeploy(error);
  return (
    <div className="card mx-auto max-w-md p-8 text-center">
      <h2 className="text-lg font-semibold">{stale ? "Hay una versión nueva de la academia" : "Algo salió mal"}</h2>
      <p className="mt-2 text-sm text-zinc-500">
        {stale ? "Recarga la página para seguir. Si estabas llenando un formulario, vuelve a llenarlo." : "No se pudo completar la acción. Recarga la página e inténtalo de nuevo."}
      </p>
      <button onClick={() => window.location.reload()} className="btn btn-primary mt-6">
        Recargar página
      </button>
    </div>
  );
}
