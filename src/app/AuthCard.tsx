import type { Settings } from "@/lib/types";

export function AuthCard({ settings, title, subtitle, children }: {
  settings: Settings;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          {settings.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logo_url} alt="" className="mb-4 size-14 rounded-2xl object-cover" />
          ) : (
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-brand text-2xl font-bold text-white">
              {settings.academy_name.charAt(0)}
            </div>
          )}
          <p className="text-sm font-semibold text-zinc-500">{settings.academy_name}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-zinc-500">{subtitle}</p>}
        </div>
        <div className="card p-6">{children}</div>
      </div>
    </main>
  );
}
