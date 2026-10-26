import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-6 py-24 text-center">
      <p className="text-5xl font-bold text-brand">404</p>
      <h1 className="mt-4 text-xl font-semibold">No encontramos esta página</h1>
      <p className="mt-2 text-sm text-zinc-500">Puede que no exista o que no tengas acceso a este contenido.</p>
      <Link href="/" className="btn btn-primary mt-6">
        Volver al inicio
      </Link>
    </main>
  );
}
