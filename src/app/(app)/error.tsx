"use client";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card mx-auto max-w-md p-8 text-center">
      <h2 className="text-lg font-semibold">Algo salió mal</h2>
      <p className="mt-2 text-sm text-zinc-500">No se pudo completar la acción. Inténtalo de nuevo en unos segundos.</p>
      <button onClick={reset} className="btn btn-primary mt-6">
        Reintentar
      </button>
    </div>
  );
}
