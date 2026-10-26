import type { AccessLevel } from "@/lib/types";

export function LevelChip({ level }: { level: AccessLevel }) {
  return (
    <span className="chip" style={{ backgroundColor: `${level.color}1f`, color: level.color }}>
      <span className="size-1.5 rounded-full" style={{ backgroundColor: level.color }} />
      {level.name}
    </span>
  );
}

export function LevelChips({ levels, emptyText }: { levels: AccessLevel[]; emptyText?: string }) {
  if (levels.length === 0) {
    return emptyText ? <span className="chip bg-zinc-100 text-zinc-600">{emptyText}</span> : null;
  }
  return (
    <span className="flex flex-wrap gap-1">
      {levels.map((level) => (
        <LevelChip key={level.id} level={level} />
      ))}
    </span>
  );
}
