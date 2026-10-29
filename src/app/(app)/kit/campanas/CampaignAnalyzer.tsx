"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, CircleHelp, Flame, Rocket, Wrench, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { type CurrencyCode, loadLocal, moneyFormatter, pct, saveLocal, toNum } from "@/lib/kit";
import { CurrencySelect, NumField, Stat, type Tone } from "@/components/kit/KitUI";

type Values = Record<string, string>;
type Platform = "meta" | "tiktok";

const DEFAULTS: Values = {
  days: "3",
  budget: "60000",
  spend: "180000",
  impressions: "25000",
  reach: "15000",
  views3s: "6500",
  thruplay: "1400",
  clicks: "380",
  lpv: "300",
  checkouts: "28",
  purchases: "10",
  price: "89900",
  cost: "25000",
  ship: "15000",
  returnShip: "15000",
  delivery: "70",
  maxCpa: "",
};

const KEY = "academia-analizador-v1";

type Finding = { area: string; tone: Tone; title: string; detail: string; actions: string[]; priority: number };

/** Rangos orientativos para contraentrega en LATAM. Siempre compara con tus propios datos. */
const BENCH = {
  meta: { ctr: [0.008, 0.015], hook: [0.2, 0.3], hold: [0.15, 0.25] },
  tiktok: { ctr: [0.006, 0.012], hook: [0.2, 0.3], hold: [0.12, 0.2] },
};

function level(value: number, [bad, good]: number[]): Tone {
  if (!Number.isFinite(value)) return undefined;
  return value < bad ? "bad" : value < good ? "warn" : "good";
}

export function CampaignAnalyzer() {
  const [v, setV] = useState<Values>(DEFAULTS);
  const [platform, setPlatform] = useState<Platform>("meta");
  const [currency, setCurrency] = useState<CurrencyCode>("COP");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = loadLocal<{ v: Values; platform: Platform; currency: CurrencyCode }>(KEY);
    if (saved) {
      setV({ ...DEFAULTS, ...saved.v });
      setPlatform(saved.platform ?? "meta");
      setCurrency(saved.currency ?? "COP");
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) saveLocal(KEY, { v, platform, currency });
  }, [v, platform, currency, loaded]);

  const set = (k: string, value: string) => setV((s) => ({ ...s, [k]: value }));
  const money = useMemo(() => moneyFormatter(currency), [currency]);

  const r = useMemo(() => analyze(v, platform), [v, platform]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl bg-zinc-100 p-1">
          {(["meta", "tiktok"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(p)}
              className={cn("rounded-lg px-3 py-2 text-sm font-medium", platform === p ? "bg-white shadow-sm" : "text-zinc-500 hover:text-zinc-900")}
            >
              {p === "meta" ? "Meta Ads (Facebook / Instagram)" : "TikTok Ads"}
            </button>
          ))}
        </div>
        <CurrencySelect value={currency} onChange={setCurrency} />
        <button type="button" onClick={() => setV(DEFAULTS)} className="text-xs font-semibold text-brand hover:underline">
          Cargar ejemplo
        </button>
        <button type="button" onClick={() => setV(Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, ""])))} className="text-xs font-semibold text-zinc-500 hover:underline">
          Limpiar
        </button>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="space-y-4">
          <section className="card p-5">
            <h2 className="font-semibold">1. Datos de la campaña</h2>
            <p className="mt-1 text-xs text-zinc-500">Cópialos del administrador de anuncios (columna del conjunto o del anuncio que quieres analizar).</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <NumField v={v} set={set} k="days" label="Días corriendo" />
              <NumField v={v} set={set} k="budget" label="Presupuesto diario" />
              <NumField v={v} set={set} k="spend" label="Importe gastado" />
              <NumField v={v} set={set} k="impressions" label="Impresiones" />
              <NumField v={v} set={set} k="reach" label="Alcance" hint="Opcional · para la frecuencia" />
              <NumField v={v} set={set} k="views3s" label="Reproducciones de 3 s" hint={platform === "meta" ? "Opcional · mide el gancho" : "Opcional · vistas de 2 s / 6 s"} />
              <NumField v={v} set={set} k="thruplay" label={platform === "meta" ? "ThruPlays" : "Vistas completas / 6 s"} hint="Opcional · mide si retiene" />
              <NumField v={v} set={set} k="clicks" label="Clics en el enlace" />
              <NumField v={v} set={set} k="lpv" label="Visitas a la página de destino" hint="Opcional" />
              <NumField v={v} set={set} k="checkouts" label="Formularios abiertos / pagos iniciados" hint="Opcional" />
              <NumField v={v} set={set} k="purchases" label="Compras (pedidos)" />
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-semibold">2. Datos del producto</h2>
            <p className="mt-1 text-xs text-zinc-500">Con esto calculo tu CPA máximo: lo más que puedes pagar por pedido sin perder.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <NumField v={v} set={set} k="price" label="Precio de venta" />
              <NumField v={v} set={set} k="cost" label="Costo del producto" />
              <NumField v={v} set={set} k="ship" label="Flete de envío" />
              <NumField v={v} set={set} k="returnShip" label="Flete de devolución" />
              <NumField v={v} set={set} k="delivery" label="Efectividad de entrega" suffix="%" />
              <NumField v={v} set={set} k="maxCpa" label="CPA máximo (si ya lo sabes)" hint="Si lo dejas vacío lo calculo yo" />
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <Verdict r={r} money={money} />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="CPA (costo por pedido)" value={money(r.cpa)} tone={r.cpaTone} big />
            <Stat label="CPA máximo" value={money(r.maxCpa)} note="Punto de equilibrio" />
            <Stat label="Costo por pedido ENTREGADO" value={money(r.cpaDelivered)} note="CPA ÷ efectividad" />
            <Stat label="ROAS" value={Number.isFinite(r.roas) ? `${r.roas.toFixed(2)}x` : "—"} />
            <Stat label="CTR enlace" value={pct(r.ctr, 2)} tone={level(r.ctr, BENCH[platform].ctr)} />
            <Stat label="CPC" value={money(r.cpc)} />
            <Stat label="CPM" value={money(r.cpm)} />
            <Stat label="Gancho (hook rate)" value={pct(r.hook)} tone={level(r.hook, BENCH[platform].hook)} />
            <Stat label="Retención (hold rate)" value={pct(r.hold)} tone={level(r.hold, BENCH[platform].hold)} />
            <Stat label="Frecuencia" value={Number.isFinite(r.freq) ? r.freq.toFixed(2) : "—"} tone={r.freqTone} />
            <Stat label="Llegan a la página" value={pct(r.lpvRate)} tone={level(r.lpvRate, [0.6, 0.75])} />
            <Stat label="Conversión de la página" value={pct(r.conv, 2)} tone={level(r.conv, [0.015, 0.03])} />
          </div>

          <section className="space-y-3">
            <h2 className="font-semibold">Diagnóstico paso a paso</h2>
            {r.findings.length === 0 && <p className="card p-4 text-sm text-zinc-500">Llena los datos para ver el diagnóstico.</p>}
            {r.findings.map((f, i) => (
              <FindingCard key={i} f={f} />
            ))}
          </section>

          <section className="card p-5">
            <h2 className="flex items-center gap-2 font-semibold"><Flame className="size-4 text-orange-500" /> Tu plan para las próximas 48 horas</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-700">
              {r.plan.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ol>
            <p className="mt-4 text-xs text-zinc-500">
              ¿Necesitas creativos nuevos? Usa el <Link href="/kit/prompts" className="font-semibold text-brand hover:underline">Generador de prompts y guiones</Link>. ¿Dudas del producto? Pásalo por el{" "}
              <Link href="/kit/producto" className="font-semibold text-brand hover:underline">Evaluador de producto</Link>.
            </p>
          </section>

          <p className="text-xs text-zinc-500">
            Los rangos (verde, amarillo, rojo) son referencias orientativas del mercado contra entrega en LATAM. Lo que manda es tu CPA frente a tu CPA máximo. Tus datos se guardan solo en este navegador.
          </p>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- lógica */

type Analysis = ReturnType<typeof analyze>;

function analyze(v: Values, platform: Platform) {
  const n = (k: string) => toNum(v[k]);
  const days = n("days");
  const spend = n("spend");
  const impressions = n("impressions");
  const reach = n("reach");
  const views3s = n("views3s");
  const thruplay = n("thruplay");
  const clicks = n("clicks");
  const lpv = n("lpv");
  const checkouts = n("checkouts");
  const purchases = n("purchases");
  const price = n("price");
  const budget = n("budget");

  const e = Math.min(Math.max(n("delivery"), 0), 100) / 100;
  const beforeAds = e * (price - n("cost") - n("ship")) - (1 - e) * n("returnShip");
  const maxCpa = n("maxCpa") > 0 ? n("maxCpa") : beforeAds;

  const div = (a: number, b: number) => (b > 0 ? a / b : NaN);
  const cpa = div(spend, purchases);
  const cpm = div(spend, impressions) * 1000;
  const ctr = div(clicks, impressions);
  const cpc = div(spend, clicks);
  const hook = views3s > 0 ? div(views3s, impressions) : NaN;
  const hold = thruplay > 0 ? div(thruplay, views3s) : NaN;
  const freq = reach > 0 ? div(impressions, reach) : NaN;
  const lpvRate = lpv > 0 ? div(lpv, clicks) : NaN;
  const base = lpv > 0 ? lpv : clicks;
  const conv = div(purchases, base);
  const formRate = checkouts > 0 ? div(checkouts, base) : NaN;
  const formClose = checkouts > 0 ? div(purchases, checkouts) : NaN;
  const roas = div(purchases * price, spend);
  const cpaDelivered = e > 0 ? cpa / e : NaN;
  const ratio = maxCpa > 0 ? cpa / maxCpa : NaN;
  const B = BENCH[platform];

  const findings: Finding[] = [];
  const add = (f: Finding) => findings.push(f);

  // Rentabilidad base
  if (!(maxCpa > 0)) {
    add({
      area: "Producto",
      tone: "bad",
      priority: 0,
      title: "Con estos números el producto no deja margen",
      detail: "Aun sin pagar publicidad, cada pedido te deja en cero o en pérdida (precio muy bajo, costo alto o mucha devolución).",
      actions: [
        "Sube el precio de venta o negocia mejor costo con el proveedor.",
        "Arma una oferta 2x1 o 3x2 para subir el valor de cada pedido.",
        "Mejora la confirmación por WhatsApp para subir la efectividad de entrega.",
        "Revisa la Calculadora de precio ideal antes de seguir pautando.",
      ],
    });
  }

  // Datos suficientes
  const lowData = impressions < 1000 || (maxCpa > 0 && spend < maxCpa * 0.5 && purchases === 0);
  if (lowData && spend > 0) {
    add({
      area: "Datos",
      tone: "warn",
      priority: 1,
      title: "Todavía hay pocos datos",
      detail: "Con tan poco gasto el algoritmo aún está aprendiendo y cualquier decisión es adivinar.",
      actions: [
        "No toques la campaña: deja correr al menos 24–48 h.",
        maxCpa > 0 ? `Espera a gastar al menos ${Math.round(maxCpa)} (1 CPA máximo) antes de decidir.` : "Espera a gastar al menos un CPA máximo antes de decidir.",
        "Revisa solo que el anuncio esté entregando y que el enlace abra bien.",
      ],
    });
  }

  // Gancho
  const hookTone = level(hook, B.hook);
  if (hookTone === "bad" || hookTone === "warn") {
    add({
      area: "Creativo · gancho",
      tone: hookTone,
      priority: hookTone === "bad" ? 2 : 6,
      title: hookTone === "bad" ? "El video no detiene el scroll" : "El gancho es aceptable, pero se puede mejorar",
      detail: `Solo ${pct(hook)} de quienes ven el anuncio se quedan 3 segundos (lo ideal es más de ${pct(B.hook[1], 0)}).`,
      actions: [
        "Cambia los primeros 3 segundos: muestra el problema o el resultado de inmediato, sin logos ni introducciones.",
        "Pon un texto grande en pantalla con la promesa o una pregunta directa (\"¿Te duele la espalda al despertar?\").",
        "Prueba 3 ganchos distintos con el mismo cuerpo del video para ver cuál retiene más.",
        "Empieza con movimiento: una mano usando el producto, un antes y después o una reacción.",
      ],
    });
  }

  // Retención
  const holdTone = level(hold, B.hold);
  if (holdTone === "bad" || holdTone === "warn") {
    add({
      area: "Creativo · retención",
      tone: holdTone,
      priority: holdTone === "bad" ? 4 : 7,
      title: "La gente se va antes de ver el beneficio",
      detail: `Solo ${pct(hold)} de los que pasan el gancho siguen viendo el video.`,
      actions: [
        "Acorta el video a 15–25 segundos y elimina pausas y silencios.",
        "Muestra la demostración del producto antes del segundo 5.",
        "Agrega subtítulos grandes y cambios de plano cada 2–3 segundos.",
        "Cierra con la oferta (envío gratis + pago contra entrega + descuento) y un llamado claro.",
      ],
    });
  }

  // CTR
  const ctrTone = level(ctr, B.ctr);
  if (impressions >= 1000 && (ctrTone === "bad" || ctrTone === "warn")) {
    add({
      area: "Anuncio · clics",
      tone: ctrTone,
      priority: ctrTone === "bad" ? 2 : 5,
      title: ctrTone === "bad" ? "Casi nadie hace clic" : "El CTR está justo",
      detail: `Tu CTR de enlace es ${pct(ctr, 2)} (referencia: más de ${pct(B.ctr[1], 1)}).`,
      actions: [
        "Prueba un ángulo de venta distinto (dolor, miedo al futuro, transformación, comodidad, identidad o prueba social).",
        "Muestra la oferta dentro del creativo: precio tachado, 2x1, envío gratis y pago al recibir.",
        "Escribe un texto principal corto con el beneficio en la primera línea y un llamado claro (\"Pídelo hoy y paga al recibir\").",
        "Si el CTR sigue bajo con 3 creativos diferentes, el problema puede ser el producto: pásalo por el Evaluador.",
      ],
    });
  }

  // Frecuencia
  const freqTone: Tone = !Number.isFinite(freq) ? undefined : freq > 3.5 ? "bad" : freq > 2.5 ? "warn" : "good";
  if (freqTone === "bad" || freqTone === "warn") {
    add({
      area: "Público · fatiga",
      tone: freqTone,
      priority: freqTone === "bad" ? 3 : 8,
      title: "El mismo público ya vio tu anuncio varias veces",
      detail: `Frecuencia de ${freq.toFixed(2)}: cada persona vio el anuncio casi ${Math.round(freq)} veces.`,
      actions: [
        "Sube creativos nuevos al mismo conjunto (mínimo 2–3) para refrescar.",
        "Abre la segmentación: público amplio (sin intereses) o rango de edad mayor.",
        "Si el CPA subió junto con la frecuencia, es fatiga: renueva el creativo antes de subir presupuesto.",
      ],
    });
  }

  // Llegada a la página
  const lpvTone = level(lpvRate, [0.6, 0.75]);
  if (lpvTone === "bad" || lpvTone === "warn") {
    add({
      area: "Página · velocidad",
      tone: lpvTone,
      priority: lpvTone === "bad" ? 3 : 8,
      title: "Se pierden clics antes de que cargue la página",
      detail: `Solo ${pct(lpvRate)} de los clics llegan a ver tu tienda.`,
      actions: [
        "Comprime las imágenes (menos de 300 KB) y quita apps de Shopify que no uses.",
        "Usa un tema rápido (como el tema premium del módulo Tienda IA).",
        "Verifica que el enlace del anuncio vaya directo a la página del producto, no al inicio.",
        "Prueba la página desde tu celular con datos móviles, no con wifi.",
      ],
    });
  }

  // Página / formulario
  const formTone = level(formRate, [0.05, 0.1]);
  const closeTone = level(formClose, [0.3, 0.5]);
  if (formTone === "bad" || formTone === "warn") {
    add({
      area: "Página · producto",
      tone: formTone,
      priority: formTone === "bad" ? 3 : 7,
      title: "Visitan la página, pero no abren el formulario",
      detail: `Solo ${pct(formRate)} de las visitas abren el formulario de compra.`,
      actions: [
        "Revisa que la primera imagen y el título digan claro qué es y qué resuelve.",
        "Sube la oferta y la urgencia arriba: descuento, 2x1, envío gratis y pago al recibir.",
        "Agrega reseñas con foto, una tabla de comparación y preguntas frecuentes.",
        "Pon el botón de compra visible sin hacer scroll y repítelo más abajo.",
      ],
    });
  }
  if (closeTone === "bad" || closeTone === "warn") {
    add({
      area: "Formulario · cierre",
      tone: closeTone,
      priority: closeTone === "bad" ? 3 : 7,
      title: "Abren el formulario, pero no terminan el pedido",
      detail: `Solo ${pct(formClose)} de los que abren el formulario completan la compra.`,
      actions: [
        "Deja solo los campos necesarios en Releasit: nombre, celular, departamento, ciudad y dirección.",
        "Muestra el total final con envío gratis dentro del formulario (sin sorpresas).",
        "Agrega ofertas por cantidad (2x1 / 3x2) y un texto de confianza: \"Paga cuando lo recibas\".",
        "Prueba el formulario tú mismo desde el celular para encontrar errores.",
      ],
    });
  }

  // Conversión global (si no hay datos de formulario)
  const convTone = level(conv, [0.015, 0.03]);
  if (!Number.isFinite(formRate) && base >= 100 && (convTone === "bad" || convTone === "warn")) {
    add({
      area: "Página · conversión",
      tone: convTone,
      priority: convTone === "bad" ? 3 : 7,
      title: "La página convierte poco",
      detail: `Solo ${pct(conv, 2)} de las visitas compran (referencia en COD: 2–5%).`,
      actions: [
        "Fortalece la oferta: precio tachado, 2x1, envío gratis y pago contra entrega.",
        "Revisa precio frente a la competencia en la Biblioteca de anuncios.",
        "Agrega reseñas reales, garantía y un video de demostración en la página.",
      ],
    });
  }

  // Buen desempeño por etapa
  if (ctrTone === "good" && (hookTone === "good" || hookTone === undefined)) {
    add({
      area: "Creativo",
      tone: "good",
      priority: 20,
      title: "El creativo está funcionando",
      detail: "El anuncio engancha y genera clics por encima de la referencia.",
      actions: ["Crea 2–3 variaciones de este creativo (otros ganchos, mismo cuerpo) para tener reemplazos cuando se fatigue."],
    });
  }

  findings.sort((a, b) => a.priority - b.priority);

  // Veredicto
  let verdict: { tone: Tone; label: string; icon: "rocket" | "wrench" | "x" | "wait" | "alert"; text: string };
  if (!(maxCpa > 0)) {
    verdict = { tone: "bad", label: "Revisa el producto primero", icon: "alert", text: "El producto no deja margen con esos números. Ajusta precio, costo u oferta antes de seguir invirtiendo." };
  } else if (purchases === 0 && spend >= maxCpa * 2) {
    verdict = { tone: "bad", label: "Apagar", icon: "x", text: `Gastaste más de 2 CPA máximos (${Math.round(spend)}) sin ventas. Apaga este anuncio y prueba otro creativo o ángulo.` };
  } else if (purchases === 0 && spend >= maxCpa) {
    verdict =
      ctrTone === "bad"
        ? { tone: "bad", label: "Apagar el creativo", icon: "x", text: "Ya gastaste un CPA máximo sin ventas y casi nadie hace clic. Cambia el creativo." }
        : { tone: "warn", label: "Alerta: dale un poco más", icon: "alert", text: "Ya gastaste un CPA máximo sin ventas, pero hay clics. Dale hasta 2 CPA máximos y revisa la página." };
  } else if (purchases === 0) {
    verdict = { tone: undefined, label: "Esperar datos", icon: "wait", text: "Aún no hay ventas ni gasto suficiente para decidir. No toques la campaña." };
  } else if (ratio <= 0.7 && purchases >= 3) {
    verdict = { tone: "good", label: "Escalar", icon: "rocket", text: "Tu CPA está muy por debajo del máximo y ya hay ventas suficientes. Es momento de escalar con cuidado." };
  } else if (ratio <= 0.7) {
    verdict = { tone: "good", label: "Prometedor: espera un poco", icon: "wait", text: "El CPA es muy bueno, pero aún con pocas ventas. Espera 3 o más compras antes de escalar." };
  } else if (ratio <= 1) {
    verdict = { tone: "warn", label: "Optimizar", icon: "wrench", text: "Ganas dinero, pero con poco margen. Mejora el creativo o la página antes de subir presupuesto." };
  } else if (ratio <= 1.3 && days < 3) {
    verdict = { tone: "warn", label: "Esperar (aprendizaje)", icon: "wait", text: "El CPA está un poco alto, pero la campaña es nueva. Dale hasta 3 días sin tocarla." };
  } else {
    verdict = { tone: "bad", label: "Apagar o cambiar", icon: "x", text: "Cada pedido te cuesta más de lo que ganas. Apaga y prueba otro creativo, ángulo u oferta." };
  }

  // Plan
  const plan: string[] = [];
  if (verdict.label === "Escalar") {
    plan.push(`Sube el presupuesto un 20–30% (de ${Math.round(budget)} a unos ${Math.round(budget * 1.25)}) y no lo vuelvas a tocar en 48 h.`);
    plan.push("Duplica el conjunto ganador en una campaña nueva (CBO) con un presupuesto un poco mayor, sin apagar el original.");
    plan.push("Prepara 2–3 variaciones del creativo ganador para cuando suba la frecuencia.");
    plan.push("Asegura la operación: confirma cada pedido por WhatsApp el mismo día y revisa novedades a diario.");
    plan.push("Repite cada 48 h mientras el CPA se mantenga por debajo del máximo.");
  } else {
    findings
      .filter((f) => f.tone === "bad" || f.tone === "warn")
      .slice(0, 3)
      .forEach((f) => plan.push(`${f.title}: ${f.actions[0]}`));
    if (verdict.label.startsWith("Apagar")) plan.unshift("Apaga el anuncio o conjunto que no está vendiendo. No borres la campaña: duplica y prueba.");
    if (verdict.icon === "wait") plan.unshift("No cambies nada durante las próximas 24–48 h para no reiniciar el aprendizaje.");
    if (plan.length === 0) plan.push("Sigue monitoreando CPA, CTR y frecuencia cada 24 h.");
    plan.push("Vuelve a cargar los datos aquí en 48 h para ver si mejoró.");
  }

  const cpaTone: Tone = !Number.isFinite(ratio) ? undefined : ratio <= 0.7 ? "good" : ratio <= 1 ? "warn" : "bad";

  return { cpa, maxCpa, cpaDelivered, roas, ctr, cpc, cpm, hook, hold, freq, freqTone, lpvRate, conv, cpaTone, findings, verdict, plan };
}

/* ---------------------------------------------------------------- vistas */

function Verdict({ r, money }: { r: Analysis; money: (n: number) => string }) {
  const Icon = { rocket: Rocket, wrench: Wrench, x: XCircle, wait: CircleHelp, alert: AlertTriangle }[r.verdict.icon];
  return (
    <div
      className={cn(
        "rounded-2xl border-2 p-5",
        r.verdict.tone === "good" && "border-emerald-300 bg-emerald-50",
        r.verdict.tone === "warn" && "border-amber-300 bg-amber-50",
        r.verdict.tone === "bad" && "border-red-300 bg-red-50",
        !r.verdict.tone && "border-zinc-200 bg-white",
      )}
    >
      <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Veredicto</p>
      <p className="mt-1 flex items-center gap-2 text-2xl font-bold">
        <Icon className="size-6" /> {r.verdict.label}
      </p>
      <p className="mt-2 text-sm text-zinc-700">{r.verdict.text}</p>
      {Number.isFinite(r.cpa) && r.maxCpa > 0 && (
        <p className="mt-2 text-xs text-zinc-500">
          CPA {money(r.cpa)} frente a un máximo de {money(r.maxCpa)} ({Math.round((r.cpa / r.maxCpa) * 100)}% del máximo).
        </p>
      )}
    </div>
  );
}

function FindingCard({ f }: { f: Finding }) {
  const Icon = f.tone === "good" ? CheckCircle2 : f.tone === "bad" ? XCircle : AlertTriangle;
  return (
    <div
      className={cn(
        "card border-l-4 p-4",
        f.tone === "good" && "border-l-emerald-400",
        f.tone === "warn" && "border-l-amber-400",
        f.tone === "bad" && "border-l-red-400",
      )}
    >
      <p className="text-xs font-semibold text-zinc-500">{f.area}</p>
      <p className="mt-0.5 flex items-center gap-1.5 font-semibold">
        <Icon className={cn("size-4", f.tone === "good" ? "text-emerald-600" : f.tone === "bad" ? "text-red-600" : "text-amber-600")} /> {f.title}
      </p>
      <p className="mt-1 text-sm text-zinc-600">{f.detail}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
        {f.actions.map((a, i) => (
          <li key={i}>{a}</li>
        ))}
      </ul>
    </div>
  );
}
