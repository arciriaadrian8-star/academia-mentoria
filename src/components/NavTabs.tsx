"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavTabs({ tabs }: { tabs: { href: string; label: string; badge?: number }[] }) {
  const pathname = usePathname();
  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto pt-2">
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition",
              active ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-900",
            )}
          >
            {tab.label}
            {Boolean(tab.badge) && (
              <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white">
                {tab.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
