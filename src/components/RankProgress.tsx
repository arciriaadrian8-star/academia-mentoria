import { rankFor } from "@/lib/constants";

/** Rango actual y barra hacia el siguiente. */
export function RankProgress({ points, position }: { points: number; position?: number | null }) {
  const rank = rankFor(points);
  const percent = rank.next ? Math.min(100, Math.round(((points - rank.min) / (rank.next.min - rank.min)) * 100)) : 100;
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Tu rango</p>
          <p className="text-xl font-bold">
            {rank.emoji} {rank.name}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-brand">{points.toLocaleString("es")}</p>
          <p className="text-xs text-zinc-500">puntos{position ? ` · puesto #${position}` : ""}</p>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-zinc-500">
        {rank.next
          ? `Te faltan ${(rank.next.min - points).toLocaleString("es")} puntos para ${rank.next.emoji} ${rank.next.name}`
          : "¡Llegaste al rango más alto!"}
      </p>
    </div>
  );
}
