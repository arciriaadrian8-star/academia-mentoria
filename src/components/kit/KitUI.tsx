"use client";

import { cn } from "@/lib/utils";
import { CURRENCIES, type CurrencyCode } from "@/lib/kit";

type Values = Record<string, string>;

export function NumField({
  v,
  set,
  k,
  label,
  hint,
  suffix,
  placeholder,
}: {
  v: Values;
  set: (k: string, value: string) => void;
  k: string;
  label: string;
  hint?: string;
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={k}>{label}</label>
      <div className="relative">
        <input
          id={k}
          type="number"
          inputMode="decimal"
          step="any"
          min={0}
          placeholder={placeholder}
          value={v[k] ?? ""}
          onChange={(e) => set(k, e.target.value)}
          className={cn("input", suffix && "pr-10")}
        />
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-zinc-400">{suffix}</span>}
      </div>
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export function TextField({
  v,
  set,
  k,
  label,
  hint,
  placeholder,
  textarea,
}: {
  v: Values;
  set: (k: string, value: string) => void;
  k: string;
  label: string;
  hint?: string;
  placeholder?: string;
  textarea?: boolean;
}) {
  return (
    <div>
      <label className="label" htmlFor={k}>{label}</label>
      {textarea ? (
        <textarea id={k} rows={2} placeholder={placeholder} value={v[k] ?? ""} onChange={(e) => set(k, e.target.value)} className="input" />
      ) : (
        <input id={k} placeholder={placeholder} value={v[k] ?? ""} onChange={(e) => set(k, e.target.value)} className="input" />
      )}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export type Tone = "good" | "bad" | "warn" | undefined;

export function Stat({ label, value, tone, note, big }: { label: string; value: string; tone?: Tone; note?: string; big?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        tone === "good" && "border-emerald-200 bg-emerald-50",
        tone === "bad" && "border-red-200 bg-red-50",
        tone === "warn" && "border-amber-200 bg-amber-50",
        !tone && "border-zinc-200 bg-zinc-50",
      )}
    >
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p
        className={cn(
          "mt-0.5 font-bold tabular-nums",
          big ? "text-2xl" : "text-lg",
          tone === "good" && "text-emerald-700",
          tone === "bad" && "text-red-700",
          tone === "warn" && "text-amber-800",
        )}
      >
        {value}
      </p>
      {note && <p className="mt-0.5 text-xs text-zinc-500">{note}</p>}
    </div>
  );
}

export function CurrencySelect({ value, onChange }: { value: CurrencyCode; onChange: (c: CurrencyCode) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as CurrencyCode)} className="input w-auto py-1.5" aria-label="Moneda">
      {CURRENCIES.map((c) => (
        <option key={c.code} value={c.code}>{c.label}</option>
      ))}
    </select>
  );
}
