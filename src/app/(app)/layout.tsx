import { getSettings, requireActive } from "@/lib/auth";
import { Header } from "@/components/Header";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile, isStaff, isAdmin } = await requireActive();
  const settings = await getSettings();
  const pendingCount = isAdmin
    ? ((await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("pending", true)).count ?? 0)
    : 0;

  return (
    <div className="min-h-screen">
      <Header settings={settings} profile={profile} isStaff={isStaff} isAdmin={isAdmin} pendingCount={pendingCount} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
