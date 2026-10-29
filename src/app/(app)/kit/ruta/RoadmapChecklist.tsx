"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROADMAP } from "@/lib/roadmap";
import { toggleRoadmapTask } from "../actions";

export function RoadmapChecklist({ done }: { done: string[] }) {
  const [, start] = useTransition();
  const [state, setState] = useOptimistic(new Set(done), (s: Set<string>, action: { key: string; on: boolean }) => {
    const next = new Set(s);
    if (action.on) next.add(action.key);
    else next.delete(action.key);
    return next;
  });
  const total = ROADMAP.reduce((s, w) => s + w.tasks.length, 0);
  const progress = Math.round((state.size / total) * 100);

  const toggle = (key: string) => {
    const on = !state.has(key);
    start(async () => {
      setState({ key, on });
      await toggleRoadmapTask(key, on);
    });
  };

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">Tu avance</span>
          <span className="font-bold tabular-nums">
            {state.size}/{total} · {progress}%
          </span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-zinc-100">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {ROADMAP.map((week) => {
        const weekDone = week.tasks.filter((t) => state.has(t.key)).length;
        return (
          <section key={week.title} className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 bg-zinc-50 px-5 py-3">
              <div>
                <h2 className="font-bold">{week.title}</h2>
                <p className="text-xs text-zinc-500">🎯 {week.goal}</p>
              </div>
              <span className={cn("chip", weekDone === week.tasks.length ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-700")}>
                {weekDone}/{week.tasks.length}
              </span>
            </div>
            <ul className="divide-y divide-zinc-100">
              {week.tasks.map((t) => {
                const on = state.has(t.key);
                return (
                  <li key={t.key} className="flex items-start gap-3 px-5 py-3">
                    <button
                      type="button"
                      onClick={() => toggle(t.key)}
                      aria-pressed={on}
                      aria-label={on ? `Desmarcar: ${t.title}` : `Marcar como hecha: ${t.title}`}
                      className={cn(
                        "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border-2",
                        on ? "border-emerald-500 bg-emerald-500 text-white" : "border-zinc-300 hover:border-brand",
                      )}
                    >
                      {on && <Check className="size-4" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={cn("font-medium", on && "text-zinc-400 line-through")}>{t.title}</p>
                      <p className="text-xs text-zinc-500">{t.detail}</p>
                    </div>
                    {t.href && (
                      <Link href={t.href} className="btn btn-ghost btn-sm shrink-0">
                        Ir <ArrowRight className="size-3.5" />
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
