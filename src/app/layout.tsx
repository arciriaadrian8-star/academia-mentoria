import type { Metadata } from "next";
import { getSettings } from "@/lib/auth";
import { isConfigured } from "@/lib/env";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  if (!isConfigured()) return { title: "Academia" };
  const settings = await getSettings();
  return { title: settings.academy_name, description: settings.tagline ?? undefined };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  if (!isConfigured()) {
    return (
      <html lang="es">
        <body className="antialiased">
          <NotConfigured />
        </body>
      </html>
    );
  }

  const settings = await getSettings();
  return (
    <html lang="es">
      <body className="antialiased" style={{ "--color-brand": settings.primary_color } as React.CSSProperties}>
        {children}
      </body>
    </html>
  );
}

function NotConfigured() {
  return (
    <main className="mx-auto max-w-xl px-6 py-20">
      <div className="card p-8">
        <h1 className="text-xl font-bold">Falta conectar Supabase</h1>
        <p className="mt-3 text-sm text-zinc-600">
          Añade estas variables de entorno (en <code>.env.local</code> o en Vercel) y vuelve a desplegar:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-zinc-900 p-4 text-xs text-zinc-100">
          {`NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...
NEXT_PUBLIC_SITE_URL=https://tu-academia.com`}
        </pre>
        <p className="mt-4 text-sm text-zinc-600">Consulta el README del repositorio para la guía paso a paso.</p>
      </div>
    </main>
  );
}
