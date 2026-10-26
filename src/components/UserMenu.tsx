"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { signOut } from "@/app/actions";
import { Avatar } from "./Avatar";

export function UserMenu({
  name,
  email,
  avatarUrl,
  roleLabel,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
  roleLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="rounded-full p-0.5 hover:bg-zinc-100" aria-label="Menú de usuario">
        <Avatar name={name || email} url={avatarUrl} size={36} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
          <div className="border-b border-zinc-100 px-4 py-3">
            <p className="truncate text-sm font-semibold">{name || "Sin nombre"}</p>
            <p className="truncate text-xs text-zinc-500">{email}</p>
            {roleLabel && <span className="chip mt-2 bg-brand/10 text-brand">{roleLabel}</span>}
          </div>
          <Link href="/perfil" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-zinc-50">
            <UserRound className="size-4" /> Mi perfil
          </Link>
          <form action={signOut}>
            <button className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50">
              <LogOut className="size-4" /> Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
