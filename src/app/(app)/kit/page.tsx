import Link from "next/link";
import {
  BarChart3,
  Calculator,
  ClipboardCheck,
  LayoutTemplate,
  LayoutGrid,
  LineChart,
  MessageCircle,
  Route,
  ScanSearch,
  Sparkles,
  Wand2,
  Trophy,
} from "lucide-react";
import { requireKit } from "@/lib/auth";
import { formatAccessDate } from "@/lib/accessCodes";
import { LANDING_TOOL_NAME } from "@/lib/landing";
import { ROADMAP_KEYS } from "@/lib/roadmap";
import { FormMessage } from "@/components/FormMessage";
import { PageHeader } from "@/components/PageHeader";
import { RenewForm } from "@/app/kit-acceso/RenewForm";

/** Las herramientas con `kitOnly` son las que ven las cuentas «Solo Kit» (acceso con código). */
const TOOLS: { href: string; title: string; text: string; icon: typeof Wand2; tag: string; kitOnly?: boolean }[] = [
  {
    href: "/kit/landing",
    kitOnly: true,
    title: LANDING_TOOL_NAME,
    text: "Sube la foto de tu producto y tu oferta: la IA te arma la landing completa para Shopify con imágenes, descripción ganadora y preguntas frecuentes.",
    icon: LayoutTemplate,
    tag: "IA en vivo",
  },
  {
    href: "/kit/video-ia",
    kitOnly: true,
    title: "Guion IA desde un video ganador",
    text: "Sube un anuncio que vende: la IA lo ve, te explica por qué funciona y te escribe tu guion con prompts para Flow / Veo.",
    icon: Wand2,
    tag: "IA en vivo",
  },
  {
    href: "/kit/campanas",
    kitOnly: true,
    title: "Analizador de campañas",
    text: "Pega tus métricas de Meta o TikTok y te digo si escalar, optimizar o apagar, y qué hacer paso a paso.",
    icon: BarChart3,
    tag: "Anuncios",
  },
  {
    href: "/kit/prompts",
    kitOnly: true,
    title: "Generador de prompts y guiones",
    text: "Ganchos, textos, imágenes, página de producto y guiones de video IA: UGC, esqueleto, historia animada y más.",
    icon: Sparkles,
    tag: "Creativos",
  },
  {
    href: "/calculadoras",
    kitOnly: true,
    title: "Calculadoras COD",
    text: "Rentabilidad, precio ideal, métricas, efectividad de entrega y flujo de caja.",
    icon: Calculator,
    tag: "Números",
  },
  {
    href: "/kit/producto",
    kitOnly: true,
    title: "Evaluador de producto ganador",
    text: "12 preguntas antes de invertir: gancho, dolor, margen y logística.",
    icon: ScanSearch,
    tag: "Producto",
  },
  {
    href: "/kit/whatsapp",
    kitOnly: true,
    title: "Mensajes de WhatsApp",
    text: "Confirmación, guía, novedades, reparto, entrega y recompra listos para enviar.",
    icon: MessageCircle,
    tag: "Logística",
  },
  {
    href: "/kit/ruta",
    title: "Ruta de 30 días",
    text: "El paso a paso de cero a tu primera venta, con tareas que vas marcando.",
    icon: Route,
    tag: "Plan",
  },
  {
    href: "/kit/progreso",
    title: "Mi progreso",
    text: "Sube tus números cada semana y mira tu evolución.",
    icon: LineChart,
    tag: "Seguimiento",
  },
  {
    href: "/kit/revision",
    title: "Revisión de tienda",
    text: "Envía tu tienda y tu anuncio y recibe feedback del equipo.",
    icon: ClipboardCheck,
    tag: "Acompañamiento",
  },
  {
    href: "/resultados",
    title: "Muro de resultados",
    text: "Comparte tus ventas y mira los resultados verificados de otros alumnos.",
    icon: Trophy,
    tag: "Comunidad",
  },
  {
    href: "/plataformas",
    title: "Plataformas",
    text: "Dropi, Shopify, herramientas de IA y todo lo que usamos en la mentoría.",
    icon: LayoutGrid,
    tag: "Directorio",
  },
];

export default async function KitPage({ searchParams }: { searchParams: Promise<{ bienvenido?: string; renovado?: string }> }) {
  const { bienvenido, renovado } = await searchParams;
  const { supabase, user, profile, isKitOnly } = await requireKit();
  const tools = isKitOnly ? TOOLS.filter((t) => t.kitOnly) : TOOLS;
  let progress = 0;
  if (!isKitOnly) {
    const { count } = await supabase.from("roadmap_progress").select("task_key", { count: "exact", head: true }).eq("user_id", user.id);
    progress = Math.round(((count ?? 0) / ROADMAP_KEYS.length) * 100);
  }

  return (
    <>
      <PageHeader title="Kit COD" description="Todas las herramientas para vender en contra entrega en cualquier país de LATAM, en un solo lugar." />

      {(bienvenido || renovado) && (
        <div className="mb-6">
          <FormMessage success={bienvenido ? "¡Listo! Tu acceso al Kit COD está activo." : "¡Código activado! Tu acceso se renovó."} />
        </div>
      )}

      {isKitOnly ? (
        <section className="card mb-6 flex flex-wrap items-center gap-4 p-5">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Tu acceso al Kit COD</p>
            <p className="text-sm text-zinc-600">
              {profile.access_until ? `Activo hasta el ${formatAccessDate(profile.access_until)}.` : "Activo sin fecha de vencimiento."}
            </p>
          </div>
          <details className="w-full sm:w-auto sm:min-w-80">
            <summary className="cursor-pointer text-sm font-semibold text-brand">¿Tienes un código nuevo? Renueva aquí</summary>
            <div className="mt-3">
              <RenewForm compact />
            </div>
          </details>
        </section>
      ) : (
        <Link href="/kit/ruta" className="card mb-6 flex flex-wrap items-center gap-4 p-5 transition hover:shadow-md">
          <Route className="size-8 text-brand" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Tu Ruta de 30 días</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
              <div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <span className="text-sm font-bold tabular-nums">{progress}%</span>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map(({ href, title, text, icon: Icon, tag }) => (
          <Link key={href} href={href} className="card flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <Icon className="size-5" />
              </span>
              <span className="chip bg-zinc-100 text-zinc-600">{tag}</span>
            </div>
            <h2 className="mt-3 font-bold">{title}</h2>
            <p className="mt-1 text-sm text-zinc-600">{text}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
