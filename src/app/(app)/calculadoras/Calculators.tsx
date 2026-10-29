"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Calculator, PackageCheck, Tag, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const CURRENCIES = [
  { code: "COP", label: "🇨🇴 Peso colombiano (COP)", decimals: 0 },
  { code: "MXN", label: "🇲🇽 Peso mexicano (MXN)", decimals: 0 },
  { code: "USD", label: "🇺🇸 Dólar (USD) · Ecuador, Panamá", decimals: 2 },
  { code: "PEN", label: "🇵🇪 Sol peruano (PEN)", decimals: 2 },
  { code: "CLP", label: "🇨🇱 Peso chileno (CLP)", decimals: 0 },
  { code: "GTQ", label: "🇬🇹 Quetzal (GTQ)", decimals: 2 },
  { code: "ARS", label: "🇦🇷 Peso argentino (ARS)", decimals: 0 },
  { code: "PYG", label: "🇵🇾 Guaraní (PYG)", decimals: 0 },
] as const;

type CurrencyCode = (typeof CURRENCIES)[number]["code"];
type Values = Record<string, string>;

const TABS = [
  { id: "rentabilidad", label: "Rentabilidad COD", icon: Calculator },
  { id: "precio", label: "Precio ideal", icon: Tag },
  { id: "anuncios", label: "Métricas de anuncios", icon: BarChart3 },
  { id: "logistica", label: "Efectividad logística", icon: PackageCheck },
  { id: "flujo", label: "Flujo de caja", icon: Wallet },
] as const;
type TabId = (typeof TABS)[number]["id"];

const DEFAULTS: Record<TabId, Values> = {
  rentabilidad: { price: "89900", cost: "25000", ship: "15000", returnShip: "15000", fee: "0", other: "0", cpa: "18000", delivery: "70", daily: "20" },
  precio: { cost: "25000", ship: "15000", returnShip: "15000", fee: "0", other: "0", cpa: "18000", delivery: "70", margin: "20" },
  anuncios: { spend: "300000", impressions: "60000", clicks: "1200", orders: "20", revenue: "1798000", maxCpa: "" },
  logistica: { generated: "100", confirmed: "85", shipped: "80", delivered: "62", returned: "14" },
  flujo: { orders: "20", cpa: "18000", price: "89900", cost: "25000", ship: "15000", returnShip: "15000", delivery: "70", payout: "12", days: "30" },
};

const STORAGE_KEY = "academia-calculadoras-v1";

function load(): { currency: CurrencyCode; values: Record<TabId, Values> } | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function Calculators() {
  const [tab, setTab] = useState<TabId>("rentabilidad");
  const [currency, setCurrency] = useState<CurrencyCode>("COP");
  const [values, setValues] = useState<Record<TabId, Values>>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = load();
    if (saved) {
      setCurrency(saved.currency ?? "COP");
      setValues({ ...DEFAULTS, ...saved.values, flujo: { ...DEFAULTS.flujo, ...(saved.values?.flujo ?? {}) } });
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ currency, values }));
    } catch {
      // sin almacenamiento disponible: no pasa nada
    }
  }, [currency, values, loaded]);

  const meta = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0];
  const money = useMemo(() => {
    const f = new Intl.NumberFormat("es", { style: "currency", currency, maximumFractionDigits: meta.decimals, minimumFractionDigits: 0 });
    return (n: number) => (Number.isFinite(n) ? f.format(n) : "—");
  }, [currency, meta.decimals]);

  const current = values[tab];
  const set = (key: string, value: string) => setValues((v) => ({ ...v, [tab]: { ...v[tab], [key]: value } }));
  const reset = () => setValues((v) => ({ ...v, [tab]: DEFAULTS[tab] }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-zinc-100 p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap",
                tab === id ? "bg-white shadow-sm" : "text-zinc-500 hover:text-zinc-900",
              )}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
        <select value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)} className="input w-auto py-1.5" aria-label="Moneda">
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
      </div>

      {tab === "rentabilidad" && <Profitability v={current} set={set} money={money} />}
      {tab === "precio" && <PriceFinder v={current} set={set} money={money} decimals={meta.decimals} />}
      {tab === "anuncios" && <AdMetrics v={current} set={set} money={money} />}
      {tab === "logistica" && <Logistics v={current} set={set} />}
      {tab === "flujo" && <CashFlow v={current} set={set} money={money} />}

      <p className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        Tus datos se guardan solo en este navegador.
        <button type="button" onClick={reset} className="font-semibold text-brand hover:underline">
          Restablecer valores de ejemplo
        </button>
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------- piezas */

const num = (v: Values, k: string) => {
  const n = parseFloat((v[k] ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const pct = (n: number, digits = 1) => (Number.isFinite(n) ? `${(n * 100).toFixed(digits)}%` : "—");

type Props = { v: Values; set: (k: string, value: string) => void };

function Field({ v, set, k, label, hint, suffix }: Props & { k: string; label: string; hint?: string; suffix?: string }) {
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

function Result({ label, value, tone, big, note }: { label: string; value: string; tone?: "good" | "bad" | "warn"; big?: boolean; note?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        tone === "good" && "border-emerald-200 bg-emerald-50",
        tone === "bad" && "border-red-200 bg-red-50",
        tone === "warn" && "border-amber-200 bg-amber-50",
        !tone && "border-zinc-200 bg-zinc-50",
      )}
    >
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p
        className={cn(
          "mt-1 font-bold tabular-nums",
          big ? "text-2xl" : "text-lg",
          tone === "good" && "text-emerald-700",
          tone === "bad" && "text-red-700",
          tone === "warn" && "text-amber-800",
        )}
      >
        {value}
      </p>
      {note && <p className="mt-1 text-xs text-zinc-500">{note}</p>}
    </div>
  );
}

function Layout({ inputs, results, explain }: { inputs: React.ReactNode; results: React.ReactNode; explain: React.ReactNode }) {
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[1fr_1fr]">
      <div className="card grid gap-4 p-5 sm:grid-cols-2">{inputs}</div>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">{results}</div>
        <div className="card p-4 text-sm text-zinc-600">{explain}</div>
      </div>
    </div>
  );
}

/** Utilidad por pedido GENERADO en contraentrega (la publicidad se paga por todos, el producto solo de los entregados). */
function codProfit(v: Values, price: number) {
  const e = Math.min(Math.max(num(v, "delivery"), 0), 100) / 100;
  const cost = num(v, "cost");
  const ship = num(v, "ship");
  const returnShip = num(v, "returnShip");
  const fee = num(v, "fee") / 100;
  const other = num(v, "other");
  const cpa = num(v, "cpa");
  const beforeAds = e * (price - cost - ship - price * fee) - (1 - e) * returnShip - other;
  return { e, beforeAds, profit: beforeAds - cpa, cpa };
}

function Profitability({ v, set, money }: Props & { money: (n: number) => string }) {
  const price = num(v, "price");
  const { e, beforeAds, profit, cpa } = codProfit(v, price);
  const perDelivered = e > 0 ? profit / e : NaN;
  const margin = e * price > 0 ? profit / (e * price) : NaN;
  const breakEvenRoas = beforeAds > 0 ? price / beforeAds : NaN;
  const roas = cpa > 0 ? price / cpa : NaN;
  const daily = num(v, "daily") * profit;
  const tone = profit > 0 ? "good" : "bad";

  return (
    <Layout
      inputs={
        <>
          <Field v={v} set={set} k="price" label="Precio de venta" />
          <Field v={v} set={set} k="cost" label="Costo del producto" hint="Lo que te cobra el proveedor" />
          <Field v={v} set={set} k="ship" label="Flete de envío" />
          <Field v={v} set={set} k="returnShip" label="Flete de devolución" hint="Lo que pagas si el pedido no se entrega" />
          <Field v={v} set={set} k="cpa" label="Costo por pedido en publicidad (CPA)" hint="Gasto en anuncios ÷ pedidos generados" />
          <Field v={v} set={set} k="delivery" label="Efectividad de entrega" suffix="%" hint="De cada 100 pedidos, cuántos se entregan" />
          <Field v={v} set={set} k="fee" label="Comisión de recaudo / pasarela" suffix="%" />
          <Field v={v} set={set} k="other" label="Otros costos por pedido" hint="Empaque, confirmación, call center..." />
          <Field v={v} set={set} k="daily" label="Pedidos al día" hint="Para proyectar tu utilidad" />
        </>
      }
      results={
        <>
          <Result big label="Utilidad por pedido generado" value={money(profit)} tone={tone} />
          <Result label="Utilidad por pedido entregado" value={money(perDelivered)} tone={tone} />
          <Result label="Margen neto sobre lo entregado" value={pct(margin)} tone={tone} />
          <Result
            label="CPA máximo (punto de equilibrio)"
            value={money(beforeAds)}
            tone={cpa <= beforeAds ? "good" : "bad"}
            note="Si pagas más que esto por pedido, pierdes"
          />
          <Result label="ROAS actual" value={Number.isFinite(roas) ? `${roas.toFixed(2)}x` : "—"} />
          <Result label="ROAS mínimo para no perder" value={Number.isFinite(breakEvenRoas) ? `${breakEvenRoas.toFixed(2)}x` : "—"} />
          <Result label="Utilidad diaria estimada" value={money(daily)} tone={tone} />
          <Result label="Utilidad mensual (30 días)" value={money(daily * 30)} tone={tone} />
        </>
      }
      explain={
        <>
          <p className="font-semibold text-zinc-800">¿Cómo se calcula?</p>
          <p className="mt-1">
            En contraentrega la publicidad la pagas por <strong>todos</strong> los pedidos, pero solo cobras los que se{" "}
            <strong>entregan</strong>. Por cada pedido generado: ingreso × efectividad − costo y flete de los entregados − flete de las
            devoluciones − comisión − otros − CPA.
          </p>
        </>
      }
    />
  );
}

function PriceFinder({ v, set, money, decimals }: Props & { money: (n: number) => string; decimals: number }) {
  const e = Math.min(Math.max(num(v, "delivery"), 0), 100) / 100;
  const fee = num(v, "fee") / 100;
  const margin = num(v, "margin") / 100;
  const fixed = e * (num(v, "cost") + num(v, "ship")) + (1 - e) * num(v, "returnShip") + num(v, "cpa") + num(v, "other");
  const denom = e * (1 - fee - margin);
  const price = denom > 0 ? fixed / denom : NaN;
  const pretty = Number.isFinite(price)
    ? decimals === 0
      ? Math.ceil(price / 1000) * 1000 - 100
      : Math.ceil(price) - 0.01
    : NaN;
  const breakEven = e * (1 - fee) > 0 ? fixed / (e * (1 - fee)) : NaN;
  const check = Number.isFinite(pretty) ? codProfit(v, pretty) : null;

  return (
    <Layout
      inputs={
        <>
          <Field v={v} set={set} k="cost" label="Costo del producto" />
          <Field v={v} set={set} k="ship" label="Flete de envío" />
          <Field v={v} set={set} k="returnShip" label="Flete de devolución" />
          <Field v={v} set={set} k="cpa" label="CPA esperado" hint="Si no lo sabes, empieza con el de un producto parecido" />
          <Field v={v} set={set} k="delivery" label="Efectividad de entrega" suffix="%" />
          <Field v={v} set={set} k="fee" label="Comisión de recaudo / pasarela" suffix="%" />
          <Field v={v} set={set} k="other" label="Otros costos por pedido" />
          <Field v={v} set={set} k="margin" label="Margen que quieres ganar" suffix="%" hint="Sobre lo que cobras de los pedidos entregados" />
        </>
      }
      results={
        <>
          <Result big label="Precio de venta recomendado" value={money(price)} tone={Number.isFinite(price) ? "good" : "bad"} />
          <Result label="Precio psicológico sugerido" value={money(pretty)} note="Redondeado para que se vea mejor en el anuncio" />
          <Result label="Precio mínimo (sin ganar nada)" value={money(breakEven)} tone="warn" />
          <Result
            label="Utilidad por pedido con el precio sugerido"
            value={check ? money(check.profit) : "—"}
            tone={check && check.profit > 0 ? "good" : "bad"}
          />
        </>
      }
      explain={
        <>
          <p className="font-semibold text-zinc-800">Consejo</p>
          <p className="mt-1">
            En COD un precio de 3 a 4 veces el costo del producto suele dar espacio para la publicidad y las devoluciones. Si el precio
            recomendado queda muy por encima de lo que cobra la competencia, busca mejor costo con el proveedor o un producto con más
            margen.
          </p>
          {!Number.isFinite(price) && <p className="mt-2 font-medium text-red-600">Con ese margen y comisión no hay precio posible: baja el margen deseado.</p>}
        </>
      }
    />
  );
}

function AdMetrics({ v, set, money }: Props & { money: (n: number) => string }) {
  const spend = num(v, "spend");
  const impressions = num(v, "impressions");
  const clicks = num(v, "clicks");
  const orders = num(v, "orders");
  const revenue = num(v, "revenue");
  const maxCpa = num(v, "maxCpa");
  const cpa = orders > 0 ? spend / orders : NaN;
  const verdict =
    !maxCpa || !Number.isFinite(cpa)
      ? null
      : cpa <= maxCpa * 0.7
        ? { tone: "good" as const, text: "🚀 Escalar", note: "Tu CPA está muy por debajo del máximo: sube presupuesto poco a poco (20–30%)." }
        : cpa <= maxCpa
          ? { tone: "warn" as const, text: "🛠️ Optimizar", note: "Ganas, pero con poco margen: prueba nuevos creativos, ángulos o públicos." }
          : { tone: "bad" as const, text: "⛔ Apagar o cambiar", note: "Cada pedido te cuesta más de lo que ganas: pausa y cambia creativo, oferta o producto." };

  return (
    <Layout
      inputs={
        <>
          <Field v={v} set={set} k="spend" label="Gasto en publicidad" />
          <Field v={v} set={set} k="impressions" label="Impresiones" />
          <Field v={v} set={set} k="clicks" label="Clics en el enlace" />
          <Field v={v} set={set} k="orders" label="Pedidos (compras)" />
          <Field v={v} set={set} k="revenue" label="Ventas generadas" hint="Valor total de los pedidos" />
          <Field v={v} set={set} k="maxCpa" label="Tu CPA máximo (opcional)" hint="Sale de la calculadora de rentabilidad" />
        </>
      }
      results={
        <>
          <Result big label="Costo por pedido (CPA)" value={money(cpa)} tone={verdict?.tone} />
          <Result big label="ROAS" value={spend > 0 ? `${(revenue / spend).toFixed(2)}x` : "—"} />
          <Result label="CTR (clics ÷ impresiones)" value={impressions > 0 ? pct(clicks / impressions, 2) : "—"} />
          <Result label="CPC (costo por clic)" value={clicks > 0 ? money(spend / clicks) : "—"} />
          <Result label="CPM (costo por 1.000 impresiones)" value={impressions > 0 ? money((spend / impressions) * 1000) : "—"} />
          <Result label="Conversión (pedidos ÷ clics)" value={clicks > 0 ? pct(orders / clicks, 2) : "—"} />
          {verdict && <Result label="¿Qué hacer con la campaña?" value={verdict.text} tone={verdict.tone} note={verdict.note} />}
        </>
      }
      explain={
        <>
          <p className="font-semibold text-zinc-800">Guía rápida</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li><strong>CTR bajo</strong> → el creativo no engancha: cambia el gancho de los primeros 3 segundos.</li>
            <li><strong>CTR bueno pero pocas compras</strong> → revisa la página: precio, oferta, fotos y confianza.</li>
            <li><strong>CPM muy alto</strong> → público pequeño o mucha competencia: abre la segmentación.</li>
          </ul>
        </>
      }
    />
  );
}

function Logistics({ v, set }: Props) {
  const generated = num(v, "generated");
  const confirmed = num(v, "confirmed");
  const shipped = num(v, "shipped");
  const delivered = num(v, "delivered");
  const returned = num(v, "returned");
  const real = generated > 0 ? delivered / generated : NaN;
  const tone = !Number.isFinite(real) ? undefined : real >= 0.7 ? "good" : real >= 0.55 ? "warn" : "bad";
  const inTransit = Math.max(shipped - delivered - returned, 0);

  return (
    <Layout
      inputs={
        <>
          <Field v={v} set={set} k="generated" label="Pedidos generados" />
          <Field v={v} set={set} k="confirmed" label="Pedidos confirmados" />
          <Field v={v} set={set} k="shipped" label="Pedidos despachados" />
          <Field v={v} set={set} k="delivered" label="Pedidos entregados" />
          <Field v={v} set={set} k="returned" label="Pedidos devueltos" />
        </>
      }
      results={
        <>
          <Result big label="Efectividad real (entregados ÷ generados)" value={pct(real)} tone={tone} />
          <Result label="Tasa de confirmación" value={generated > 0 ? pct(confirmed / generated) : "—"} />
          <Result label="Entrega sobre despachados" value={shipped > 0 ? pct(delivered / shipped) : "—"} />
          <Result label="Tasa de devolución" value={shipped > 0 ? pct(returned / shipped) : "—"} tone={shipped > 0 && returned / shipped > 0.25 ? "bad" : undefined} />
          <Result label="En tránsito / sin cerrar" value={String(inTransit)} />
          <Result label="Cancelados antes de despachar" value={String(Math.max(generated - shipped, 0))} />
        </>
      }
      explain={
        <>
          <p className="font-semibold text-zinc-800">¿Cómo mejorar la efectividad?</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>Confirma cada pedido por WhatsApp en menos de 1 hora.</li>
            <li>Haz seguimiento a las novedades de la transportadora el mismo día.</li>
            <li>Evita prometer en el anuncio lo que el producto no cumple: dispara las devoluciones.</li>
          </ul>
        </>
      }
    />
  );
}

function CashFlow({ v, set, money }: Props & { money: (n: number) => string }) {
  const orders = num(v, "orders");
  const cpa = num(v, "cpa");
  const e = Math.min(Math.max(num(v, "delivery"), 0), 100) / 100;
  const perDelivered = num(v, "price") - num(v, "cost") - num(v, "ship");
  const returnShip = num(v, "returnShip");
  const payout = Math.max(Math.round(num(v, "payout")), 0);
  const days = Math.min(Math.max(Math.round(num(v, "days")), 1), 120);

  const dailyOut = orders * cpa;
  const dailyIn = orders * (e * perDelivered - (1 - e) * returnShip);
  let balance = 0;
  let lowest = 0;
  let lowestDay = 0;
  let positiveDay = -1;
  const series: number[] = [];
  for (let d = 1; d <= days; d++) {
    balance -= dailyOut;
    if (d > payout) balance += dailyIn;
    series.push(balance);
    if (balance < lowest) {
      lowest = balance;
      lowestDay = d;
    }
    if (positiveDay < 0 && d > payout && balance >= 0) positiveDay = d;
  }
  const dailyProfit = dailyIn - dailyOut;
  const maxAbs = Math.max(...series.map((x) => Math.abs(x)), 1);

  return (
    <Layout
      inputs={
        <>
          <Field v={v} set={set} k="orders" label="Pedidos al día" />
          <Field v={v} set={set} k="cpa" label="Costo por pedido en publicidad (CPA)" hint="La publicidad se paga de una vez" />
          <Field v={v} set={set} k="price" label="Precio de venta" />
          <Field v={v} set={set} k="cost" label="Costo del producto" />
          <Field v={v} set={set} k="ship" label="Flete de envío" />
          <Field v={v} set={set} k="returnShip" label="Flete de devolución" />
          <Field v={v} set={set} k="delivery" label="Efectividad de entrega" suffix="%" />
          <Field v={v} set={set} k="payout" label="Días hasta que te pagan" hint="Desde el pedido hasta que llega a tu wallet" />
          <Field v={v} set={set} k="days" label="Días a proyectar" />
        </>
      }
      results={
        <>
          <Result big label="Capital que necesitas para aguantar" value={money(-lowest)} tone="warn" note={`El punto más bajo llega el día ${lowestDay}`} />
          <Result label="Gasto diario en publicidad" value={money(dailyOut)} />
          <Result label="Ganancia diaria cuando ya te pagan" value={money(dailyProfit)} tone={dailyProfit > 0 ? "good" : "bad"} />
          <Result
            label="Día en que recuperas lo invertido"
            value={positiveDay > 0 ? `Día ${positiveDay}` : dailyProfit > 0 ? `Después del día ${days}` : "Nunca"}
            tone={positiveDay > 0 ? "good" : dailyProfit > 0 ? "warn" : "bad"}
          />
          <Result label={`Saldo al día ${days}`} value={money(balance)} tone={balance >= 0 ? "good" : "bad"} />
          <div className="rounded-xl border border-zinc-200 bg-white p-3 sm:col-span-2">
            <p className="text-xs font-medium text-zinc-500">Tu caja día a día</p>
            <div className="mt-2 flex h-24 items-center gap-px">
              {series.map((x, i) => (
                <div key={i} className="flex h-full flex-1 flex-col" title={`Día ${i + 1}: ${money(x)}`}>
                  <div className="flex flex-1 items-end border-b border-zinc-200">
                    {x >= 0 && <div className="w-full rounded-t-sm bg-emerald-400" style={{ height: `${(Math.abs(x) / maxAbs) * 100}%` }} />}
                  </div>
                  <div className="flex flex-1 items-start">
                    {x < 0 && <div className="w-full rounded-b-sm bg-red-400" style={{ height: `${(Math.abs(x) / maxAbs) * 100}%` }} />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      }
      explain={
        <>
          <p className="font-semibold text-zinc-800">¿Por qué importa?</p>
          <p className="mt-1">
            En contra entrega pagas la publicidad hoy, pero el dinero de los pedidos llega días después. Muchas tiendas rentables quiebran por quedarse
            sin caja al escalar. Antes de subir el presupuesto, asegúrate de tener el capital que te marca esta calculadora.
          </p>
        </>
      }
    />
  );
}
