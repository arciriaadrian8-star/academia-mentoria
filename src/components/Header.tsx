import { MAKEDROP } from "@/lib/makedrop";
import Link from "next/link";
import { ROLE_LABELS } from "@/lib/constants";
import type { Profile, Settings } from "@/lib/types";
import { NavTabs } from "./NavTabs";
import { UserMenu } from "./UserMenu";

export function Header({
  settings,
  profile,
  isStaff,
  isAdmin,
  isKitOnly = false,
  pendingCount = 0,
}: {
  settings: Settings;
  profile: Profile;
  isStaff: boolean;
  isAdmin: boolean;
  /** Cuenta «Solo Kit»: solo ve las herramientas del Kit COD. */
  isKitOnly?: boolean;
  pendingCount?: number;
}) {
  const tabs = isKitOnly ? [{ href: "/kit", label: "Kit COD" }, { href: "/calculadoras", label: "Calculadoras" }] : [
    { href: "/inicio", label: "Inicio" },
    { href: "/comunidad", label: "Comunidad" },
    { href: "/classroom", label: "Classroom" },
    { href: "/kit", label: "Kit COD" },
    { href: "/calendario", label: "Calendario" },
    { href: "/sesiones", label: "Sesiones" },
    { href: "/resultados", label: "Resultados" },
    { href: "/ranking", label: "Ranking" },
    { href: "/herramientas", label: "Herramientas" },
    ...(isAdmin ? [{ href: "/miembros", label: "Miembros", badge: pendingCount }, { href: "/ajustes", label: "Ajustes" }] : []),
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 pt-3">
        <Link href={isKitOnly ? "/kit" : "/"} className="flex min-w-0 items-center gap-3">
          {isKitOnly ? (
            // Las cuentas «Solo Kit» son de MakeDrop IA: ven esa marca, no la de la academia.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={MAKEDROP.logo} alt="" className="size-9 rounded-lg object-cover" />
          ) : settings.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logo_url} alt="" className="size-9 rounded-lg object-cover" />
          ) : (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand font-bold text-white">
              {settings.academy_name.charAt(0)}
            </span>
          )}
          <span className="truncate text-lg font-bold tracking-tight">{isKitOnly ? MAKEDROP.fullName : settings.academy_name}</span>
        </Link>

        <UserMenu
          name={profile.full_name}
          email={profile.email}
          avatarUrl={profile.avatar_url}
          roleLabel={isStaff || isKitOnly ? ROLE_LABELS[profile.role] : undefined}
          showProfile={!isKitOnly}
        />
      </div>
      <div className="mx-auto max-w-6xl px-4">
        <NavTabs tabs={tabs} />
      </div>
    </header>
  );
}
