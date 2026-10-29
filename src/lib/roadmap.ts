/** Ruta de 30 días: de cero a la primera venta en contra entrega. */
export type RoadmapTask = { key: string; title: string; detail: string; href?: string };
export type RoadmapWeek = { title: string; goal: string; tasks: RoadmapTask[] };

export const ROADMAP: RoadmapWeek[] = [
  {
    title: "Semana 1 · Bases y cuentas",
    goal: "Tener todo creado y entender el modelo contra entrega.",
    tasks: [
      { key: "w1-induccion", title: "Ver el video de inducción y el curso Mentalidad", detail: "Entiende cómo funciona la mentoría y el modelo de negocio.", href: "/inicio" },
      { key: "w1-dropi", title: "Registrarte en Dropi con el enlace de la mentoría", detail: "0% de comisión y sin recargar saldo para el primer pedido.", href: "/herramientas" },
      { key: "w1-dropi-curso", title: "Terminar el curso DROPI", detail: "Proveedores, productos de calidad, pedidos, ganancias y devoluciones.", href: "/classroom" },
      { key: "w1-shopify", title: "Crear tu tienda en Shopify", detail: "Plan de prueba y dominio con el nombre de tu marca." },
      { key: "w1-facebook", title: "Tener una cuenta de Facebook real y con antigüedad", detail: "Nombre y foto reales; mejor si tiene más de 2–3 meses." },
      { key: "w1-whatsapp", title: "Crear tu WhatsApp Business para la tienda", detail: "Con foto, horario y respuestas rápidas.", href: "/kit/whatsapp" },
    ],
  },
  {
    title: "Semana 2 · Producto y tienda",
    goal: "Elegir un producto con potencial y dejar la tienda lista para vender.",
    tasks: [
      { key: "w2-productos", title: "Terminar el curso Productos Ganadores", detail: "Las 4 variables y los ángulos de venta.", href: "/classroom" },
      { key: "w2-espiar", title: "Encontrar 5 productos con anuncios activos de 7+ días", detail: "Usa la Biblioteca de anuncios de Meta y DropKiller." },
      { key: "w2-evaluar", title: "Pasar tus 5 productos por el Evaluador", detail: "Quédate con el que tenga mayor puntaje sin fallas críticas.", href: "/kit/producto" },
      { key: "w2-numeros", title: "Calcular precio, CPA máximo y flujo de caja", detail: "Que el precio sea al menos 3 veces el costo.", href: "/calculadoras" },
      { key: "w2-tienda", title: "Montar la tienda con el tema premium (curso Tienda IA)", detail: "Home, menús, políticas y página de producto.", href: "/classroom" },
      { key: "w2-releasit", title: "Instalar Releasit (120 pedidos gratis) y configurar ofertas", detail: "Botón contra entrega, 2x1 / 3x2 y upsells.", href: "/herramientas" },
    ],
  },
  {
    title: "Semana 3 · Creativos y lanzamiento",
    goal: "Tener mínimo 3 creativos y lanzar tu primera campaña.",
    tasks: [
      { key: "w3-creativos", title: "Terminar Creativos Ganadores y Creativos IA", detail: "Estructura: gancho, pico, desarrollo, prueba y CTA.", href: "/classroom" },
      { key: "w3-prompts", title: "Crear 3 creativos con 3 ángulos distintos", detail: "Usa el Generador de prompts y guiones.", href: "/kit/prompts" },
      { key: "w3-pixel", title: "Crear portafolio, cuenta publicitaria y conectar el píxel", detail: "Curso Meta Ads.", href: "/classroom" },
      { key: "w3-lanzar", title: "Lanzar la campaña de testeo", detail: "Un presupuesto que puedas sostener al menos 3 días sin tocar." },
      { key: "w3-revision", title: "Pedir revisión de tu tienda", detail: "Te damos feedback antes de invertir más.", href: "/kit/revision" },
    ],
  },
  {
    title: "Semana 4 · Optimizar y operar",
    goal: "Tomar decisiones con datos y entregar la mayor cantidad de pedidos.",
    tasks: [
      { key: "w4-analizar", title: "Analizar la campaña cada 48 h", detail: "Escalar, optimizar o apagar según el Analizador.", href: "/kit/campanas" },
      { key: "w4-confirmar", title: "Confirmar cada pedido por WhatsApp en menos de 1 hora", detail: "Y avisar la guía cuando se despache.", href: "/kit/whatsapp" },
      { key: "w4-novedades", title: "Revisar novedades en Dropi todos los días", detail: "Cada novedad resuelta es un pedido que no pierdes.", href: "/classroom" },
      { key: "w4-finanzas", title: "Terminar Finanzas & Contabilidad", detail: "Costos reales, punto de equilibrio y flujo de caja.", href: "/classroom" },
      { key: "w4-reporte", title: "Subir tu primer reporte semanal", detail: "Pedidos, entregados, ventas, publicidad y utilidad.", href: "/kit/progreso" },
      { key: "w4-resultado", title: "Compartir tu primera venta en el Muro de resultados", detail: "¡Celebra y motiva a los demás!", href: "/resultados" },
    ],
  },
];

export const ROADMAP_KEYS = ROADMAP.flatMap((w) => w.tasks.map((t) => t.key));
