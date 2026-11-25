import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Calculator,
  Check,
  ChevronDown,
  Clapperboard,
  FileSpreadsheet,
  GraduationCap,
  ImagePlus,
  LayoutTemplate,
  MessageCircle,
  PenLine,
  Rocket,
  ShieldCheck,
  Sparkles,
  Store,
  Target,
  Upload,
  WandSparkles,
  Zap,
} from "lucide-react";
import { LANDING_MODES } from "@/lib/landing";
import { MAKEDROP, SUCCESS_CASES, whatsappLink } from "@/lib/makedrop";

/** Imágenes de ejemplo hechas con MakeDrop Landing (producto de prueba). */
const EXAMPLES = [
  { src: "/makedrop/ejemplo-principal.jpg", label: "Principal" },
  { src: "/makedrop/ejemplo-oferta.jpg", label: "Oferta" },
  { src: "/makedrop/ejemplo-beneficios.jpg", label: "Beneficios" },
  { src: "/makedrop/ejemplo-antes-despues.jpg", label: "Antes y después" },
  { src: "/makedrop/ejemplo-usos.jpg", label: "Usos" },
  { src: "/makedrop/ejemplo-que-llega.jpg", label: "Qué le llega" },
  { src: "/makedrop/ejemplo-mega-oferta.jpg", label: "Mega oferta" },
  { src: "/makedrop/ejemplo-comparacion.jpg", label: "Comparación" },
  { src: "/makedrop/ejemplo-confianza.jpg", label: "Confianza" },
];

const STEPS = [
  { icon: Upload, title: "Sube tu producto", text: "Una foto (la del proveedor sirve), una descripción y tu oferta." },
  { icon: WandSparkles, title: "La IA arma tu landing", text: "Título ganador, descripción, preguntas frecuentes e imágenes vendedoras." },
  { icon: Store, title: "Llévala a Shopify", text: "Descarga el archivo, impórtalo y solo activa tu botón de Releasit." },
];

const FACTS = [
  { value: "40 s", label: "Landing rápida" },
  { value: "10", label: "Imágenes vendedoras" },
  { value: "4", label: "Formatos para elegir" },
  { value: "1 clic", label: "Archivo para Shopify" },
];

const TOOLS = [
  { icon: Clapperboard, title: "Guion IA desde un video ganador", text: "Sube un anuncio que vende: la IA te explica por qué funciona y te escribe tu guion." },
  { icon: BarChart3, title: "Analizador de campañas", text: "Pega tus métricas de Meta o TikTok y sabe si escalar, optimizar o apagar." },
  { icon: Target, title: "Evaluador de producto ganador", text: "12 preguntas antes de invertir: gancho, dolor, margen y logística." },
  { icon: MessageCircle, title: "Mensajes de WhatsApp", text: "Confirmación, guía, novedades y recompra listos para enviar." },
  { icon: Calculator, title: "Calculadoras COD", text: "Rentabilidad, precio ideal, efectividad de entrega y flujo de caja." },
  { icon: PenLine, title: "Prompts y guiones", text: "Ganchos, textos e ideas de video IA: UGC, historia animada y más." },
];

const MODE_ICONS = { completa: Rocket, rapida: Zap, texto: PenLine, prompts: WandSparkles } as const;

const FAQ = [
  {
    q: "¿Necesito saber de diseño o de código?",
    a: "No. Subes la foto de tu producto, escribes qué es y tu oferta, y MakeDrop arma todo. Tú solo revisas y lo importas a Shopify.",
  },
  {
    q: "¿Cómo llega la landing a mi tienda Shopify?",
    a: "Descargas un archivo y lo subes en Productos → Importar. El producto se crea en borrador con título, precio, imágenes y toda la descripción. Luego activas tu botón de compra (por ejemplo Releasit).",
  },
  {
    q: "¿Qué diferencia hay entre la landing completa y la rápida?",
    a: "La completa hace fotos nuevas con IA (tu cliente feliz con el producto, usos y el antes). La rápida arma todo con la foto de tu producto en unos 40 segundos y te da los prompts para que hagas tus fotos gratis en Gemini cuando quieras.",
  },
  {
    q: "¿La IA inventa reseñas?",
    a: "No. La imagen de reseñas solo se arma si pegas reseñas reales de tus clientes. Tampoco inventa descuentos, garantías ni características que tu producto no tiene.",
  },
  {
    q: "¿Sirve para contra entrega en mi país?",
    a: "Sí. Está pensada para contra entrega en Latinoamérica: escribe en el español de tu país, con tu moneda, envío gratis y pago al recibir.",
  },
  {
    q: "Soy miembro de la Academia, ¿cómo entro?",
    a: "Crea tu cuenta y marca «Sí, soy miembro». Tu mentor aprueba tu cuenta y entras con todas las herramientas incluidas.",
  },
];

export function MakeDropHome({ logo }: { logo?: string | null }) {
  const logoSrc = logo || MAKEDROP.logo;
  const wa = whatsappLink(MAKEDROP.whatsapp, "Hola, quiero saber más de MakeDrop IA");
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      {/* Barra de anuncio */}
      <Link
        href="/registro"
        className="block bg-gradient-to-r from-orange-500 via-rose-500 to-fuchsia-600 px-4 py-2 text-center text-xs font-semibold text-white sm:text-sm"
      >
        ⚡ Nuevo: landing rápida en 40 segundos + prompts para hacer tus fotos gratis en Gemini <span className="underline">Pruébalo</span>
      </Link>

      {/* Hero */}
      <header className="relative overflow-hidden bg-[#0d0a24] text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.55),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(249,115,22,0.25),transparent_55%)]" />
        <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt="" className="size-9 rounded-xl object-cover ring-1 ring-white/20" />
            <span className="text-lg font-extrabold tracking-tight">MakeDrop IA</span>
          </Link>
          <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-sm text-white/80 backdrop-blur md:flex">
            {[
              ["#como-funciona", "Cómo funciona"],
              ["#herramientas", "Herramientas"],
              ["#resultados", "Resultados"],
              ["#preguntas", "Preguntas"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="rounded-full px-3 py-1.5 transition hover:bg-white/10 hover:text-white">
                {label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-white/80 hover:text-white sm:block">
              Iniciar sesión
            </Link>
            <Link href="/registro" className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-[#0d0a24] shadow hover:bg-white/90">
              Crear cuenta
            </Link>
          </div>
        </nav>

        <div className="relative z-10 mx-auto max-w-6xl px-4 pt-10 pb-16 text-center sm:px-6 sm:pt-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-400/40 bg-orange-500/15 px-3 py-1 text-xs font-semibold text-orange-200">
            <Sparkles className="size-3.5" /> Hecho para contra entrega en Latinoamérica
          </span>
          <h1 className="mx-auto mt-5 max-w-4xl text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-6xl">
            Tu landing ganadora para Shopify,{" "}
            <span className="bg-gradient-to-r from-orange-300 via-rose-300 to-fuchsia-300 bg-clip-text text-transparent">hecha con IA en 40 segundos</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-white/70 sm:text-lg">
            Sube la foto de tu producto y tu oferta. MakeDrop IA te escribe el título ganador, la descripción, las preguntas frecuentes y te arma las
            imágenes vendedoras, listas para importar a tu tienda.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/registro"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-7 py-3.5 text-base font-bold shadow-lg shadow-fuchsia-500/30 transition hover:brightness-110"
            >
              Crear mi cuenta <ArrowRight className="size-4" />
            </Link>
            <Link href="/login" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3.5 font-semibold text-white/90 hover:bg-white/10">
              Ya tengo cuenta
            </Link>
          </div>
          <p className="mt-3 text-xs text-white/50">¿Eres miembro de la Academia? Tus herramientas ya están incluidas.</p>

          {/* 3 pasos */}
          <ol id="como-funciona" className="mx-auto mt-14 grid max-w-4xl scroll-mt-24 gap-6 text-left sm:grid-cols-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <li key={s.title} className="relative">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full border border-white/15 bg-white/10">
                      <Icon className="size-5 text-orange-300" />
                    </span>
                    <span className="text-xs font-bold tracking-widest text-white/40">PASO {i + 1}</span>
                  </div>
                  <p className="mt-3 font-bold">{s.title}</p>
                  <p className="mt-1 text-sm text-white/60">{s.text}</p>
                </li>
              );
            })}
          </ol>

          {/* Vista del producto */}
          <div className="mx-auto mt-14 max-w-5xl rounded-2xl border border-white/15 bg-white/5 p-2 shadow-2xl shadow-violet-900/50 backdrop-blur">
            <div className="flex items-center gap-1.5 px-3 py-2">
              <span className="size-2.5 rounded-full bg-red-400/80" />
              <span className="size-2.5 rounded-full bg-amber-400/80" />
              <span className="size-2.5 rounded-full bg-emerald-400/80" />
              <span className="ml-3 truncate rounded-md bg-white/10 px-3 py-0.5 text-[11px] text-white/50">makedrop · tu landing lista</span>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-white p-2 sm:grid-cols-5">
              {EXAMPLES.slice(0, 5).map((im, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={im.src} src={im.src} alt={im.label} className={`aspect-square w-full rounded-lg object-cover ${i > 2 ? "hidden sm:block" : ""}`} />
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Datos */}
      <section className="border-b border-zinc-100 bg-gradient-to-b from-violet-50 to-white">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-4 py-10 text-center sm:grid-cols-4 sm:px-6">
          {FACTS.map((f) => (
            <div key={f.label}>
              <p className="text-3xl font-extrabold text-[#2a1a6e] sm:text-4xl">{f.value}</p>
              <p className="mt-1 text-sm text-zinc-500">{f.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* MakeDrop Landing */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold tracking-widest text-violet-600 uppercase">MakeDrop Landing</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#1c1340] sm:text-5xl">De una foto a una landing que vende</h2>
          <p className="mt-4 text-zinc-600">Con la estructura de las landings que más venden en contra entrega, adaptada a tu producto y a tus colores.</p>
        </div>
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-zinc-200 bg-gradient-to-br from-violet-50 to-white p-6 lg:col-span-2">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-violet-600 text-white"><ImagePlus className="size-5" /></span>
            <h3 className="mt-4 text-xl font-bold">10 imágenes vendedoras, armadas solas</h3>
            <p className="mt-1 text-sm text-zinc-600">Principal con sello, oferta, beneficios, antes y después, usos, qué le llega, comparación, confianza y más.</p>
            <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {EXAMPLES.slice(3, 7).concat(EXAMPLES.slice(7, 9)).slice(0, 4).map((im, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={im.src} src={im.src} alt={im.label} loading="lazy" className={`aspect-square w-full rounded-xl object-cover shadow-sm ${i === 3 ? "hidden sm:block" : ""}`} />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex-1 rounded-3xl border border-zinc-200 p-6">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-orange-500 text-white"><LayoutTemplate className="size-5" /></span>
              <h3 className="mt-4 text-lg font-bold">Título y descripción ganadores</h3>
              <p className="mt-1 text-sm text-zinc-600">Dolor, promesa, beneficios, modo de uso, cierre y 4 preguntas frecuentes, en el español de tu país.</p>
            </div>
            <div className="flex-1 rounded-3xl border border-zinc-200 p-6">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-emerald-600 text-white"><FileSpreadsheet className="size-5" /></span>
              <h3 className="mt-4 text-lg font-bold">Lista para Shopify</h3>
              <p className="mt-1 text-sm text-zinc-600">Un archivo que importas en Productos → Importar. El producto queda en borrador para que lo revises.</p>
            </div>
          </div>
        </div>

        {/* Formatos */}
        <div className="mt-16">
          <h3 className="text-center text-2xl font-extrabold tracking-tight text-[#1c1340]">Elige lo que necesitas</h3>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {LANDING_MODES.map((m) => {
              const Icon = MODE_ICONS[m.id];
              return (
                <div key={m.id} className="rounded-2xl border border-zinc-200 p-5 transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <Icon className="size-6 text-violet-600" />
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">{m.time}</span>
                  </div>
                  <p className="mt-3 font-bold">{m.title}</p>
                  <p className="mt-1 text-sm text-zinc-600">{m.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Galería */}
      <section className="overflow-hidden bg-[#0d0a24] py-16 text-white sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Imágenes que ya se ven como las que venden</h2>
          <p className="mt-2 max-w-2xl text-white/60">Ejemplo hecho con MakeDrop Landing para un producto de prueba. Tú eliges colores ganadores o los de tu marca.</p>
        </div>
        <div className="mt-8 flex gap-3 overflow-x-auto px-4 pb-4 sm:px-6 [&::-webkit-scrollbar]:hidden">
          {EXAMPLES.map((im) => (
            <figure key={im.src} className="w-52 shrink-0 sm:w-64">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.src} alt={im.label} loading="lazy" className="aspect-square w-full rounded-2xl object-cover ring-1 ring-white/10" />
              <figcaption className="mt-2 text-sm text-white/60">{im.label}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Herramientas */}
      <section id="herramientas" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold tracking-widest text-violet-600 uppercase">Y mucho más</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#1c1340] sm:text-5xl">Todo para vender en contra entrega</h2>
          <p className="mt-4 text-zinc-600">Las herramientas que usamos en la mentoría, en un solo lugar.</p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.title} className="rounded-2xl border border-zinc-200 p-6">
                <Icon className="size-6 text-violet-600" />
                <p className="mt-3 font-bold">{t.title}</p>
                <p className="mt-1 text-sm text-zinc-600">{t.text}</p>
              </div>
            );
          })}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 p-6 text-white sm:col-span-2 lg:col-span-3">
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold">Próximamente</span>
            <p className="mt-3 text-xl font-extrabold">MakeDrop Tienda</p>
            <p className="mt-1 max-w-xl text-sm text-white/80">Elige tu nicho y recibe tu tienda armada con logo, colores y productos listos para empezar a vender.</p>
          </div>
        </div>
      </section>

      {/* ¿Eres miembro? */}
      <section className="bg-zinc-50 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-[#1c1340] sm:text-4xl">¿Eres miembro de la Academia?</h2>
          <p className="mt-2 text-center text-zinc-600">Al crear tu cuenta te lo preguntamos para darte el acceso correcto.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
              <GraduationCap className="size-7 text-emerald-600" />
              <p className="mt-3 text-lg font-bold">Sí, soy miembro</p>
              <ul className="mt-3 space-y-2 text-sm text-zinc-600">
                {["Crea tu cuenta y marca «Sí, soy miembro».", "Tu mentor aprueba tu cuenta.", "Entras con todas las herramientas incluidas."].map((x) => (
                  <li key={x} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-emerald-600" /> {x}</li>
                ))}
              </ul>
              <Link href="/registro?miembro=si" className="btn btn-secondary mt-5 w-full">Soy miembro: crear mi cuenta</Link>
            </div>
            <div className="rounded-3xl border border-violet-200 bg-white p-6 shadow-sm">
              <Rocket className="size-7 text-violet-600" />
              <p className="mt-3 text-lg font-bold">No, todavía no</p>
              <ul className="mt-3 space-y-2 text-sm text-zinc-600">
                {["Crea tu cuenta y marca «No, todavía no».", "Activa tu acceso a MakeDrop IA.", "Empieza a crear tus landings el mismo día."].map((x) => (
                  <li key={x} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-violet-600" /> {x}</li>
                ))}
              </ul>
              <Link href="/registro?miembro=no" className="btn btn-primary mt-5 w-full">Crear mi cuenta</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Resultados */}
      <section id="resultados" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold tracking-widest text-violet-600 uppercase">Resultados reales</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#1c1340] sm:text-5xl">Estudiantes que ya venden</h2>
        </div>
        <div className="mt-10 columns-1 gap-4 sm:columns-2 lg:columns-3">
          {SUCCESS_CASES.map((c) => (
            <div key={c.title} className="mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {c.img && <img src={c.img} alt={`Caso de éxito: ${c.title}`} loading="lazy" className="w-full bg-zinc-100 object-cover" />}
              <div className="p-4">
                <p className="font-bold">{c.title}</p>
                <p className="mt-1 text-sm text-zinc-600">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Preguntas */}
      <section id="preguntas" className="scroll-mt-20 bg-zinc-50 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-[#1c1340] sm:text-4xl">Preguntas frecuentes</h2>
          <div className="mt-8 space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-zinc-200 bg-white">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-semibold">
                  {f.q}
                  <ChevronDown className="size-5 shrink-0 text-zinc-400 transition group-open:rotate-180" />
                </summary>
                <p className="px-5 pb-5 text-sm leading-relaxed text-zinc-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Llamado final */}
      <section className="relative overflow-hidden bg-[#0d0a24] px-4 py-16 text-center text-white sm:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.4),transparent_60%)]" />
        <div className="relative mx-auto max-w-2xl">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl">Tu próxima landing, lista hoy</h2>
          <p className="mt-3 text-white/70">Crea tu cuenta y arma tu primera landing en minutos.</p>
          <Link
            href="/registro"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-7 py-3.5 text-base font-bold shadow-lg shadow-fuchsia-500/30 hover:brightness-110"
          >
            Crear mi cuenta <ArrowRight className="size-4" />
          </Link>
          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-white/50">
            <ShieldCheck className="size-4" /> Tus fotos y landings son privadas.
          </p>
        </div>
      </section>

      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-zinc-500 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt="" className="size-7 rounded-lg object-cover" />
            <span className="font-semibold text-zinc-700">{MAKEDROP.fullName}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/login" className="hover:text-zinc-900">Iniciar sesión</Link>
            <Link href="/registro" className="hover:text-zinc-900">Crear cuenta</Link>
            <a href={MAKEDROP.skoolUrl} target="_blank" rel="noopener noreferrer" className="hover:text-zinc-900">Comunidad</a>
            <a href={wa} target="_blank" rel="noopener noreferrer" className="hover:text-zinc-900">WhatsApp</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
