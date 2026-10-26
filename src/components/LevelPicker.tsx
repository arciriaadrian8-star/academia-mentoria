import Link from "next/link";
import type { AccessLevel } from "@/lib/types";

/** Casillas para elegir niveles de acceso dentro de un formulario (name="levels"). */
export function LevelPicker({
  levels,
  selected,
  name = "levels",
  emptyHint,
}: {
  levels: AccessLevel[];
  selected: string[];
  name?: string;
  emptyHint?: string;
}) {
  if (levels.length === 0) {
    return (
      <p className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-500">
        Aún no has creado niveles de acceso.{" "}
        <Link href="/miembros/niveles" className="font-medium text-brand underline">
          Crear niveles
        </Link>
      </p>
    );
  }
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {levels.map((level) => (
          <label
            key={level.id}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/5"
          >
            <input type="checkbox" name={name} value={level.id} defaultChecked={selected.includes(level.id)} className="accent-brand" />
            <span className="size-2 rounded-full" style={{ backgroundColor: level.color }} />
            {level.name}
          </label>
        ))}
      </div>
      {emptyHint && <p className="hint">{emptyHint}</p>}
    </div>
  );
}
