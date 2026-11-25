import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Calculator,
  Check,
  ChevronDown,
  Clapperboard,
  GraduationCap,
  LayoutTemplate,
  ListChecks,
  Megaphone,
  MessageCircle,
  PenLine,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Wand2,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { MAKEDROP, SUCCESS_CASES, whatsappLink } from "@/lib/makedrop";

/** Colores de MakeDrop IA (los del logo): azul marino, azul y blanco. */
const NAVY = "#0F1E4A";
const BLUE = "#0A76F2";

/** Imágenes de ejemplo hechas con MakeDrop Landing (producto de prueba). */
const EXAMPLES = [
  { src: "/makedrop/ejemplo-principal.jpg", label: "Principal" },
  { src: "/makedrop/ejemplo-oferta.jpg", label: "Oferta" },
  { src: "/makedrop/ejemplo-beneficios.jpg", label: "Beneficios" },
  { src: "/makedrop/ejemplo-antes-despues.jpg", label: "Antes y después" },
  { src: "/makedrop/ejemplo-usos.jpg", label: "Usos" },
  { src: "/makedrop/ejemplo-comparacion.jpg", label: "Comparación" },
];

type Tool = { icon: LucideIcon; title: string; text: string };

/** El camino del dropshipping contra entrega, con las herramientas de cada paso. */
const STAGES: { icon: LucideIcon; step: string; title: string; text: string; tools: string[] }[] = [
  { icon: Search, step: "1", title: "Encuentra tu producto", text: "Valida antes de invertir: gancho, dolor, margen y logística.", tools: ["Evaluador de producto", "Calculadoras COD"] },
  { icon: LayoutTemplate, step: "2", title: "Crea tu landing", text: "Título, descripción e imágenes vendedoras listas para Shopify.", tools: ["MakeDrop Landing"] },
  { icon: Megaphone, step: "3", title: "Lanza tus anuncios", text: "Guiones y prompts para tus videos a partir de lo que ya vende.", tools: ["Guion IA", "Prompts y guiones"] },
  { icon: TrendingUp, step: "4", title: "Vende y escala", text: "Lee tus métricas, confirma pedidos y controla tu rentabilidad.", tools: ["Analizador de campañas", "WhatsApp", "Calculadoras"] },
];

const TOOLS: Tool[] = [
  { icon: Wand2, title: "MakeDrop Landing", text: "Tu landing ganadora para Shopify con IA: textos, imágenes vendedoras y archivo para importar." },
  { icon: Clapperboard, title: "Guion IA desde un video ganador", text: "Sube un anuncio que vende: la IA te explica por qué funciona y te escribe tu guion." },
  { icon: BarChart3, title: "Analizador de campañas", text: "Pega tus métricas de Meta o TikTok y sabe si escalar, optimizar o apagar." },
  { icon: Target, title: "Evaluador de producto ganador", text: "12 preguntas antes de invertir: gancho, dolor, margen y logística." },
  { icon: PenLine, title: "Prompts y guiones", text: "Ganchos, textos e ideas de video IA: UGC, historia animada y más." },
  { icon: Calculator, title: "Calculadoras COD", text: "Rentabilidad, precio ideal, efectividad de entrega y flujo de caja." },
  { icon: MessageCircle, title: "Mensajes de WhatsApp", text: "Confirmación, guía, novedades, entrega y recompra listos para enviar." },
  { icon: ListChecks, title: "Ruta de 30 días", text: "El paso a paso de cero a tu primera venta, con tareas que vas marcando." },
  { icon: Store, title: "Revisión de tienda", text: "Envía tu tienda y tu anuncio y recibe feedback del equipo." },
  { icon: Trophy, title: "Muro de resultados", text: "Comparte tus ventas y mira los resultados de otros alumnos." },
];

const HERO_TILES: { icon: LucideIcon; label: string }[] = [
  { icon: Wand2, label: "Landing IA" },
  { icon: Clapperboard, label: "Guion IA" },
  { icon: BarChart3, label: "Campañas" },
  { icon: Target, label: "Producto" },
  { icon: Calculator, label: "Calculadoras" },
  { icon: MessageCircle, label: "WhatsApp" },
];

const FAQ = [
  {
    q: "¿Qué es MakeDrop IA?",
    a: "Es la plataforma de dropshipping de la Academia: herramientas con IA para cada paso de vender en contra entrega, desde elegir el producto y crear tu landing hasta lanzar anuncios y controlar tus números.",
  },
  {
    q: "¿Cuál es la diferencia entre ser miembro y la suscripción a la plataforma?",
    a: "Los miembros de la Academia tienen todo incluido: la plataforma más los cursos, la comunidad y el acompañamiento. La suscripción mensual te da las herramientas de MakeDrop IA por aparte, sin entrar a la Academia.",
  },
  {
    q: "¿Necesito experiencia en dropshipping?",
    a: "No. La Ruta de 30 días te lleva paso a paso hasta tu primera venta, y las herramientas te dicen qué hacer en cada etapa.",
  },
  {
    q: "¿Sirve para mi país?",
    a: "Sí. Está pensada para contra entrega en Latinoamérica: los textos salen en el español de tu país, con tu moneda, envío gratis y pago al recibir.",
  },
  {
    q: "¿Cómo llega mi landing a Shopify?",
    a: "Descargas un archivo y lo subes en Productos → Importar. El producto se crea en borrador con título, precio, imágenes y toda la descripción; solo activas tu botón de compra.",
  },
  {
    q: "¿La IA inventa reseñas o promesas?",
    a: "No. La imagen de reseñas solo se arma con reseñas reales de tus clientes, y la IA no inventa descuentos, garantías ni características que tu producto no tiene.",
  },
];

function SectionTitle({ kicker, title, text }: { kicker: string; title: string; text?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-bold tracking-widest uppercase" style={{ color: BLUE }}>{kicker}</p>
      <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-5xl" style={{ color: NAVY }}>{title}</h2>
      {text && <p className="mt-4 text-slate-600">{text}</p>}
    </div>
  );
}

export function MakeDropHome({ logo }: { logo?: string | null }) {
  const logoSrc = logo || MAKEDROP.logo;
  const wa = whatsappLink(MAKEDROP.whatsapp, "Hola, quiero saber más de MakeDrop IA");
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Barra de anuncio */}
      <Link href="/registro" className="block px-4 py-2 text-center text-xs font-semibold text-white sm:text-sm" style={{ background: NAVY }}>
        <Sparkles className="mr-1 inline size-3.5" style={{ color: "#7DB8FF" }} /> Nuevo: tu landing ganadora para Shopify en 40 segundos con MakeDrop Landing{" "}
        <span className="underline" style={{ color: "#7DB8FF" }}>Pruébalo</span>
      </Link>

      {/* Menú */}
      <nav className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt="" className="size-10 rounded-xl object-cover" />
            <span className="text-lg font-extrabold tracking-tight" style={{ color: NAVY }}>
              MakeDrop <span style={{ color: BLUE }}>IA</span>
            </span>
          </Link>
          <div className="hidden items-center gap-1 text-sm font-medium text-slate-600 lg:flex">
            {[
              ["#como-funciona", "Cómo funciona"],
              ["#herramientas", "Herramientas"],
              ["#acceso", "Formas de entrar"],
              ["#resultados", "Resultados"],
              ["#preguntas", "Preguntas"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="rounded-lg px-3 py-2 transition hover:bg-slate-50 hover:text-slate-900">
                {label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:block">
              Iniciar sesión
            </Link>
            <Link href="/registro" className="rounded-lg px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-110" style={{ background: BLUE }}>
              Crear cuenta
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(60rem 30rem at 85% -10%, ${BLUE}22, transparent 60%), radial-gradient(40rem 24rem at 0% 20%, ${NAVY}10, transparent 60%)`,
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "linear-gradient(to bottom, black, transparent 85%)",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-20 lg:pb-24">
          <div>
            <span
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
              style={{ borderColor: `${BLUE}40`, background: `${BLUE}0F`, color: BLUE }}
            >
              <Zap className="size-3.5" /> Dropshipping contra entrega en Latinoamérica
            </span>
            <h1 className="mt-5 text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-6xl" style={{ color: NAVY }}>
              La plataforma de dropshipping <span style={{ color: BLUE }}>con IA</span> para vender en contra entrega
            </h1>
            <p className="mt-5 max-w-xl text-base text-slate-600 sm:text-lg">
              Encuentra tu producto, crea tu landing, lanza tus anuncios y controla tus números. Todas las herramientas que usamos en la Academia, en un solo
              lugar.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/registro"
                className="inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-base font-bold text-white shadow-lg transition hover:brightness-110"
                style={{ background: BLUE, boxShadow: `0 12px 30px -10px ${BLUE}99` }}
              >
                Crear mi cuenta <ArrowRight className="size-4" />
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 font-semibold text-slate-800 hover:bg-slate-50"
              >
                Ver cómo funciona
              </a>
            </div>
            <p className="mt-4 flex items-start gap-2 text-sm text-slate-500">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" style={{ color: BLUE }} />
              Entra como miembro de la Academia o con tu suscripción mensual a la plataforma.
            </p>
          </div>

          {/* Vista de la plataforma */}
          <div className="relative">
            <div className="rounded-3xl border border-slate-200 bg-white p-3" style={{ boxShadow: `0 30px 60px -20px ${NAVY}40` }}>
              <div className="flex items-center gap-1.5 px-2 pb-3">
                <span className="size-2.5 rounded-full bg-slate-200" />
                <span className="size-2.5 rounded-full bg-slate-200" />
                <span className="size-2.5 rounded-full bg-slate-200" />
                <span className="ml-3 rounded-md bg-slate-100 px-3 py-0.5 text-[11px] text-slate-500">makedrop · Kit COD</span>
              </div>
              <div className="grid gap-3 rounded-2xl p-3" style={{ background: "#F3F8FF" }}>
                <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm">
                  <div>
                    <p className="text-xs text-slate-500">Hola 👋</p>
                    <p className="text-sm font-bold" style={{ color: NAVY }}>¿Qué vamos a vender hoy?</p>
                  </div>
                  <span className="rounded-full px-2.5 py-1 text-[11px] font-bold text-white" style={{ background: BLUE }}>Ruta de 30 días</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {HERO_TILES.map((t) => {
                    const Icon = t.icon;
                    return (
                      <div key={t.label} className="flex flex-col items-center gap-1.5 rounded-xl bg-white p-3 text-center shadow-sm">
                        <span className="flex size-9 items-center justify-center rounded-lg" style={{ background: `${BLUE}14`, color: BLUE }}>
                          <Icon className="size-5" />
                        </span>
                        <span className="text-[11px] font-semibold text-slate-700">{t.label}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {EXAMPLES.slice(0, 3).map((im) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={im.src} src={im.src} alt={im.label} className="aspect-square w-full rounded-xl object-cover shadow-sm" />
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-3 hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl sm:flex">
              <span className="flex size-9 items-center justify-center rounded-full text-white" style={{ background: BLUE }}>
                <Zap className="size-4" />
              </span>
              <div>
                <p className="text-xs text-slate-500">MakeDrop Landing</p>
                <p className="text-sm font-bold" style={{ color: NAVY }}>Lista en 40 segundos</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Datos */}
      <section style={{ background: NAVY }}>
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 text-center text-white sm:grid-cols-4 sm:px-6">
          {[
            ["+10", "Herramientas con IA"],
            ["40 s", "Para tu landing"],
            ["30 días", "Ruta a tu primera venta"],
            ["LATAM", "Hecho para contra entrega"],
          ].map(([v, l]) => (
            <div key={l}>
              <p className="text-3xl font-extrabold sm:text-4xl" style={{ color: "#7DB8FF" }}>{v}</p>
              <p className="mt-1 text-sm text-white/70">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24">
        <SectionTitle
          kicker="Cómo funciona"
          title="Todo el camino del dropshipping, con IA"
          text="Cada paso tiene su herramienta. Tú decides qué vender; MakeDrop IA te ayuda a hacerlo rápido y bien."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STAGES.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="relative rounded-3xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-2xl text-white" style={{ background: BLUE }}>
                    <Icon className="size-5" />
                  </span>
                  <span className="text-4xl font-extrabold text-slate-100">{s.step}</span>
                </div>
                <p className="mt-4 text-lg font-bold" style={{ color: NAVY }}>{s.title}</p>
                <p className="mt-1 text-sm text-slate-600">{s.text}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {s.tools.map((t) => (
                    <span key={t} className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: `${BLUE}12`, color: BLUE }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* MakeDrop Landing destacado */}
      <section style={{ background: "#F3F8FF" }}>
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2">
          <div>
            <span className="rounded-full px-3 py-1 text-xs font-bold text-white" style={{ background: BLUE }}>Destacado</span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ color: NAVY }}>
              MakeDrop Landing: de una foto a una landing que vende
            </h2>
            <p className="mt-3 text-slate-600">
              Sube la foto de tu producto y tu oferta. La IA escribe el título ganador, la descripción y las preguntas frecuentes, y arma tus imágenes vendedoras
              con tus colores.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm text-slate-700">
              {[
                "Landing completa con fotos de IA o landing rápida en 40 segundos",
                "Prompts para hacer tus fotos gratis en Gemini",
                "Bloque de precio y «Compra segura» para tu tema de Shopify",
                "Archivo para importar a Shopify en borrador",
              ].map((x) => (
                <li key={x} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0" style={{ color: BLUE }} /> {x}
                </li>
              ))}
            </ul>
            <Link href="/registro" className="mt-7 inline-flex items-center gap-2 rounded-xl px-6 py-3 font-bold text-white hover:brightness-110" style={{ background: NAVY }}>
              Crear mi primera landing <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {EXAMPLES.map((im) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={im.src} src={im.src} alt={im.label} loading="lazy" className="aspect-square w-full rounded-2xl object-cover shadow-md ring-1 ring-white" />
            ))}
          </div>
        </div>
      </section>

      {/* Herramientas */}
      <section id="herramientas" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24">
        <SectionTitle kicker="Herramientas" title="Todo para vender en contra entrega" text="Las herramientas que usamos en la mentoría, listas para que las uses tú." />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.title} className="flex gap-4 rounded-2xl border border-slate-200 p-5 transition hover:border-blue-200 hover:shadow-md">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl" style={{ background: `${BLUE}12`, color: BLUE }}>
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="font-bold" style={{ color: NAVY }}>{t.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{t.text}</p>
                </div>
              </div>
            );
          })}
          <div className="flex gap-4 rounded-2xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${NAVY}, ${BLUE})` }}>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <Rocket className="size-5" />
            </span>
            <div>
              <p className="font-bold">
                MakeDrop Tienda <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px]">Próximamente</span>
              </p>
              <p className="mt-1 text-sm text-white/80">Elige tu nicho y recibe tu tienda armada con logo, colores y productos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Formas de entrar */}
      <section id="acceso" className="scroll-mt-20" style={{ background: "#F3F8FF" }}>
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
          <SectionTitle
            kicker="Formas de entrar"
            title="Elige cómo quieres entrar"
            text="La página es abierta, pero para usar todas las herramientas necesitas una de estas dos opciones."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div className="relative flex flex-col rounded-3xl border-2 bg-white p-7 shadow-lg" style={{ borderColor: BLUE }}>
              <span className="absolute -top-3 left-7 rounded-full px-3 py-1 text-xs font-bold text-white" style={{ background: BLUE }}>Todo incluido</span>
              <GraduationCap className="size-8" style={{ color: BLUE }} />
              <p className="mt-3 text-xl font-extrabold" style={{ color: NAVY }}>Miembro de la Academia</p>
              <p className="mt-1 text-sm text-slate-600">La plataforma completa más los cursos, la comunidad y el acompañamiento de la Academia.</p>
              <ul className="mt-5 space-y-2 text-sm text-slate-700">
                {(
                  [
                    [BookOpen, "Cursos y Ruta de 30 días"],
                    [Users, "Comunidad y acompañamiento"],
                    [Wand2, "Todas las herramientas de MakeDrop IA"],
                  ] as [LucideIcon, string][]
                ).map(([Icon, x]) => (
                  <li key={x} className="flex gap-2">
                    <Icon className="mt-0.5 size-4 shrink-0" style={{ color: BLUE }} /> {x}
                  </li>
                ))}
              </ul>
              <p className="mt-5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Crea tu cuenta, marca «Sí, soy miembro» y tu mentor te da acceso.</p>
              <Link
                href="/registro?miembro=si"
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-bold text-white hover:brightness-110"
                style={{ background: BLUE }}
              >
                Soy miembro: crear mi cuenta
              </Link>
            </div>
            <div className="flex flex-col rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
              <Rocket className="size-8" style={{ color: NAVY }} />
              <p className="mt-3 text-xl font-extrabold" style={{ color: NAVY }}>Suscripción a la plataforma</p>
              <p className="mt-1 text-sm text-slate-600">Las herramientas de MakeDrop IA con un pago mensual, por aparte de la Academia.</p>
              <ul className="mt-5 space-y-2 text-sm text-slate-700">
                {["MakeDrop Landing y Guion IA", "Analizador de campañas y evaluador de producto", "Calculadoras y mensajes de WhatsApp"].map((x) => (
                  <li key={x} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0" style={{ color: BLUE }} /> {x}
                  </li>
                ))}
              </ul>
              <p className="mt-5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Crea tu cuenta, marca «No, solo la plataforma» y activa tu suscripción mensual.</p>
              <Link
                href="/registro?miembro=no"
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border-2 px-5 py-3 font-bold transition hover:bg-slate-50"
                style={{ borderColor: NAVY, color: NAVY }}
              >
                Quiero la plataforma
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Resultados */}
      <section id="resultados" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24">
        <SectionTitle kicker="Resultados reales" title="Estudiantes que ya venden" />
        <div className="mt-10 columns-1 gap-4 sm:columns-2 lg:columns-3">
          {SUCCESS_CASES.map((c) => (
            <div key={c.title} className="mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {c.img && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.img} alt={`Caso de éxito: ${c.title}`} loading="lazy" className="w-full bg-slate-100 object-cover" />
              )}
              <div className="p-4">
                <p className="font-bold" style={{ color: NAVY }}>{c.title}</p>
                <p className="mt-1 text-sm text-slate-600">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Preguntas */}
      <section id="preguntas" className="scroll-mt-20 bg-slate-50 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ color: NAVY }}>Preguntas frecuentes</h2>
          <div className="mt-8 space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-slate-200 bg-white">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-semibold" style={{ color: NAVY }}>
                  {f.q}
                  <ChevronDown className="size-5 shrink-0 text-slate-400 transition group-open:rotate-180" />
                </summary>
                <p className="px-5 pb-5 text-sm leading-relaxed text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Llamado final */}
      <section className="px-4 py-16 sm:py-20">
        <div
          className="mx-auto max-w-5xl overflow-hidden rounded-3xl px-6 py-14 text-center text-white sm:px-12"
          style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #12307A 55%, ${BLUE} 100%)` }}
        >
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl">Empieza a vender con MakeDrop IA</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">Crea tu cuenta y elige cómo entrar: como miembro de la Academia o con tu suscripción a la plataforma.</p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/registro" className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-base font-bold shadow-lg hover:bg-white/90" style={{ color: NAVY }}>
              Crear mi cuenta <ArrowRight className="size-4" />
            </Link>
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-6 py-3.5 font-semibold text-white hover:bg-white/10"
            >
              <MessageCircle className="size-4" /> Hablar por WhatsApp
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt="" className="size-8 rounded-lg object-cover" />
            <span className="font-semibold" style={{ color: NAVY }}>{MAKEDROP.fullName}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/login" className="hover:text-slate-900">Iniciar sesión</Link>
            <Link href="/registro" className="hover:text-slate-900">Crear cuenta</Link>
            <a href={MAKEDROP.skoolUrl} target="_blank" rel="noopener noreferrer" className="hover:text-slate-900">Comunidad</a>
            <a href={wa} target="_blank" rel="noopener noreferrer" className="hover:text-slate-900">WhatsApp</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
