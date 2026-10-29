import Link from "next/link";
import {
  BarChart3,
  Calculator,
  ClipboardCheck,
  LayoutGrid,
  LineChart,
  MessageCircle,
  Route,
  ScanSearch,
  Sparkles,
  Wand2,
  Trophy,
} from "lucide-react";
import { requireActive } from "@/lib/auth";
import { ROADMAP_KEYS } from "@/lib/roadmap";
import { PageHeader } from "@/components/PageHeader";

const TOOLS = [
  {
    href: "/kit/video-ia",
    title: "Guion IA desde un video ganador",
    text: "Sube un anuncio que vende: la IA lo ve, te explica por qué funciona y te escribe tu guion con prompts para Flow / Veo.",
    icon: Wand2,
    tag: "IA en vivo",
  },
  {
    href: "/kit/campanas",
    title: "Analizador de campañas",
    text: "Pega tus métricas de Meta o TikTok y te digo si escalar, optimizar o apagar, y qué hacer paso a paso.",
    icon: BarChart3,
    tag: "Anuncios",
  },
  {
    href: "/kit/prompts",
    title: "Generador de prompts y guiones",
    text: "Ganchos, textos, imágenes, página de producto y guiones de video IA: UGC, esqueleto, historia animada y más.",
    icon: Sparkles,
    tag: "Creativos",
  },
  {
    href: "/calculadoras",
    title: "Calculadoras COD",
    text: "Rentabilidad, precio ideal, métricas, efectividad de entrega y flujo de caja.",
    icon: Calculator,
    tag: "Números",
  },
  {
    href: "/kit/producto",
    title: "Evaluador de producto ganador",
    text: "12 preguntas antes de invertir: gancho, dolor, margen y logística.",
    icon: ScanSearch,
    tag: "Producto",
  },
  {
    href: "/kit/whatsapp",
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

export default async function KitPage() {
  const { supabase, user } = await requireActive();
  const { count } = await supabase.from("roadmap_progress").select("task_key", { count: "exact", head: true }).eq("user_id", user.id);
  const progress = Math.round(((count ?? 0) / ROADMAP_KEYS.length) * 100);

  return (
    <>
      <PageHeader title="Kit COD" description="Todas las herramientas para vender en contra entrega en cualquier país de LATAM, en un solo lugar." />

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map(({ href, title, text, icon: Icon, tag }) => (
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
