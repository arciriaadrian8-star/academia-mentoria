/** MakeDrop Landing: tipos, plantilla HTML de la descripción y archivo de importación para Shopify. */

export const LANDING_TOOL_NAME = "MakeDrop Landing";
/** Modelos de fotos con IA y su gasto aproximado por foto (precios públicos de Gemini, dólar a ~COP 3.500). */
export const IMAGE_MODELS = [
  { id: "gemini-3.1-flash-image-preview", label: "Nano Banana 2 · mejor calidad", photoCop: 240 },
  { id: "gemini-2.5-flash-image", label: "Nano Banana · económico", photoCop: 140 },
] as const;
const TEXT_COP = 45;

/**
 * Qué fotos con IA alcanzan con el tope de gasto por landing (misma regla que la función makedrop-landing):
 * primero todas las que quepan en el modelo económico (después → usos → antes) y, si sobra,
 * la del después y la de usos suben a Nano Banana 2. Las que no se hacen con IA salen con la foto del alumno.
 */
export function photosForBudget(maxCop: number) {
  const [best, eco] = IMAGE_MODELS;
  const slots = ["después", "usos", "antes"];
  const count = Math.max(0, Math.min(3, Math.floor((maxCop - TEXT_COP) / eco.photoCop)));
  let left = maxCop - TEXT_COP - count * eco.photoCop;
  const picks = slots.slice(0, count).map((slot) => ({ slot, best: false }));
  for (const pick of picks.slice(0, 2)) {
    if (left >= best.photoCop - eco.photoCop) {
      pick.best = true;
      left -= best.photoCop - eco.photoCop;
    }
  }
  const costCop = TEXT_COP + picks.reduce((sum, pk) => sum + (pk.best ? best.photoCop : eco.photoCop), 0);
  const label = picks.length
    ? picks.map((pk) => `${pk.slot}${pk.best ? " (Nano Banana 2)" : ""}`).join(", ")
    : "ninguna (solo texto; las imágenes salen con la foto del alumno)";
  return { count: picks.length, costCop, label };
}

/** Bolsa de puntos del mes (null = sin límite: admin y coaches). Viene de la función points_balance de la base de datos. */
export type PointsBalance = { allowance: number | null; used: number; balance: number | null };

export async function getPointsBalance(
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> },
  userId: string,
): Promise<PointsBalance> {
  const { data } = await supabase.rpc("points_balance", { p_user: userId });
  const row = (Array.isArray(data) ? data[0] : data) as PointsBalance | undefined;
  return row ?? { allowance: 0, used: 0, balance: 0 };
}

export const LANDING_BUCKET = "makedrop";

export const AUDIENCES = ["Mujeres", "Hombres", "Mujeres y hombres", "Mamás y papás", "Niños", "Adultos mayores", "Mascotas y sus dueños"] as const;

type Block = { emoji: string; titulo: string };
export type LandingResult = {
  titulo: string;
  nombre_marca: string;
  barra_anuncio: string;
  recuadro: { linea1: string; linea2: string };
  beneficios_imagen: string[];
  bloques: {
    dolor: Block & { texto: string };
    promesa: Block & { texto: string };
    formula: Block & { beneficios: { nombre: string; texto: string }[] };
    habito: Block & { texto: string };
    uso: Block & { pasos: string[] };
    cierre: Block & { texto: string; llamado: string };
  };
  resenas?: { titulo: string; items: { nombre: string; ciudad: string; estrellas: number; titulo?: string; texto: string }[] };
  faq: { titulo: string; items: { pregunta: string; respuesta: string }[] };
  seo: { titulo: string; descripcion: string };
  tipo_producto: string;
  etiquetas: string[];
  resenas_reales?: boolean;
  aviso_imagenes?: string | null;
  imagenes?: ImageTexts;
  /** Para las fotos (en inglés): aspecto del producto, persona y una escena por foto. */
  producto_visual?: string;
  persona?: string;
  escenas?: Partial<Record<PhotoSlot, string>>;
};

/** Formatos que el alumno puede elegir. «completa» hace fotos con IA; los demás solo escriben (mucho más barato). */
export type LandingMode = "completa" | "rapida" | "texto" | "prompts";
export const LANDING_MODES: { id: LandingMode; title: string; desc: string; time: string; aiPhotos: boolean }[] = [
  { id: "completa", title: "Landing completa", desc: "Textos + fotos con IA (después, usos y antes) + archivo para Shopify.", time: "~1 min", aiPhotos: true },
  { id: "rapida", title: "Landing rápida", desc: "Todo armado con la foto de tu producto. Luego puedes subir tus fotos de Gemini.", time: "~40 s", aiPhotos: false },
  { id: "texto", title: "Título y descripción", desc: "Título ganador, descripción con preguntas frecuentes y SEO, listos para pegar.", time: "~30 s", aiPhotos: false },
  { id: "prompts", title: "Prompts de imágenes", desc: "Prompts para hacer tus fotos gratis en Gemini y armar tus imágenes ganadoras.", time: "~30 s", aiPhotos: false },
];
export const isLandingMode = (v: string | null | undefined): v is LandingMode => LANDING_MODES.some((m) => m.id === v);
export const modeInfo = (v: string | null | undefined) => LANDING_MODES.find((m) => m.id === v) ?? LANDING_MODES[0];

/** Las 3 fotos de fondo de las imágenes vendedoras (con IA, o hechas por el alumno en Gemini). */
export type PhotoSlot = "despues" | "usos" | "antes";
export const PHOTO_SLOTS: { id: PhotoSlot; title: string; what: string; usedIn: string }[] = [
  { id: "despues", title: "Después", what: "Tu cliente feliz usando el producto", usedIn: "Principal y antes/después" },
  { id: "usos", title: "Usos", what: "Cuadrícula de 4 fotos, una por cada uso", usedIn: "Usos y comparación" },
  { id: "antes", title: "Antes", what: "El problema, sin el producto", usedIn: "Antes/después y comparación" },
];

const PHOTO_SPEC: Record<PhotoSlot, string> = {
  despues: "Square 1:1 photo. Person in the center, face in the middle third of the image, the product clearly visible at its real size. Bright, warm, happy.",
  usos: "Landscape 4:3 image made of a clean 2x2 grid of four equal photos separated by thin white lines. Each panel: one person using the product for one use, product clearly visible at its real size.",
  antes: "Square 1:1 photo of the problem situation, no product anywhere, slightly dull and gloomy light, the problem obvious at first sight.",
};

/** Prompt (en inglés, funciona mejor) para que el alumno haga la foto gratis en Gemini adjuntando la foto de su producto. */
export function photoPrompt(slot: PhotoSlot, r: LandingResult) {
  const usos = r.imagenes?.usos_etiquetas?.length ? ` The four uses, in order (top-left, top-right, bottom-left, bottom-right): ${r.imagenes.usos_etiquetas.join(", ")}.` : "";
  return [
    "Create an ultra realistic commercial advertising photo for a Latin American online store.",
    `Scene: ${r.escenas?.[slot] ?? ""}${slot === "usos" ? usos : ""}`,
    slot !== "antes" ? `Person: ${r.persona ?? "a Latin American adult"}. Natural skin, genuine expression, realistic hands.` : "",
    `Composition: ${PHOTO_SPEC[slot]}`,
    slot !== "antes"
      ? `Product: use EXACTLY the product in the attached photo (same shape, colors, packaging and label). ${r.producto_visual ?? ""} Keep it at its true real-world size.`
      : "The product must NOT appear in this image.",
    "Do NOT add any text, letters, logos, watermarks, stickers or price tags. Professional lighting, sharp focus, natural vibrant colors.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** La descripción en texto simple (para pegar en el editor de Shopify, WhatsApp o donde quieras). */
export function descriptionText(r: LandingResult) {
  const b = r.bloques;
  return [
    `${b.dolor.emoji} ${b.dolor.titulo}\n${b.dolor.texto}`,
    `${b.promesa.emoji} ${b.promesa.titulo}\n${b.promesa.texto}`,
    `${b.formula.emoji} ${b.formula.titulo}\n${b.formula.beneficios.map((x) => `✅ ${x.nombre}: ${x.texto}`).join("\n")}`,
    `${b.habito.emoji} ${b.habito.titulo}\n${b.habito.texto}`,
    `${b.uso.emoji} ${b.uso.titulo}\n${b.uso.pasos.map((x, i) => `${i + 1}. ${x}`).join("\n")}`,
    `${b.cierre.emoji} ${b.cierre.titulo}\n${b.cierre.texto}\n${b.cierre.llamado}`,
    `${r.faq.titulo}\n${r.faq.items.map((f) => `▸ ${f.pregunta}\n${f.respuesta}`).join("\n\n")}`,
  ].join("\n\n");
}

/**
 * Las 10 imágenes finales, en el orden de la galería de Shopify. Mezcla lo mejor de las 2 landings ganadoras:
 * LullaBites (L): foto emocional con sello «SÚPER PROMO», infografía «BENEFICIOS:», producto «MEGA OFERTA».
 * Pidelisto (P): titular grande arriba y precio abajo: oferta, antes/después, usos, qué llega, comparación,
 * reseñas (solo si el alumno pegó reseñas reales) y confianza.
 */
export const FINAL_IMAGES = [
  { n: 1, kind: "principal", label: "Principal" },
  { n: 2, kind: "oferta", label: "Oferta" },
  { n: 3, kind: "beneficios", label: "Beneficios" },
  { n: 4, kind: "antes_despues", label: "Antes y después" },
  { n: 5, kind: "usos", label: "Usos" },
  { n: 6, kind: "que_llega", label: "Qué le llega" },
  { n: 7, kind: "mega_oferta", label: "Mega oferta" },
  { n: 8, kind: "comparacion", label: "Comparación" },
  { n: 9, kind: "resenas", label: "Reseñas" },
  { n: 10, kind: "confianza", label: "Confianza" },
] as const;

export type Review = { nombre: string; ciudad: string; texto: string };

/** Lee las reseñas reales que pegó el alumno: una por línea, «Nombre, Ciudad: texto» (nombre y ciudad opcionales). */
export function parseReviews(raw: string | null | undefined): Review[] {
  return (raw ?? "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 3)
    .slice(0, 4)
    .map((l) => {
      const m = l.match(/^([^:]{2,60}):\s*(.+)$/);
      if (!m) return { nombre: "Cliente", ciudad: "", texto: l.slice(0, 220) };
      const [nombre, ciudad = ""] = m[1].split(",").map((x) => x.trim());
      return { nombre: nombre.slice(0, 30) || "Cliente", ciudad: ciudad.slice(0, 30), texto: m[2].slice(0, 220) };
    });
}
export type FinalKind = (typeof FINAL_IMAGES)[number]["kind"];

export type ImageTexts = {
  nombre_corto: string;
  titulares: { oferta: string; antes_despues: string; que_llega: string; usos: string; comparacion: string; aspiracional: string; confianza: string };
  aspiracional_sub: string;
  usos_etiquetas: string[];
  que_llega_items: string[];
  comparacion: { sin_titulo: string; sin_texto: string; con_titulo: string; con_texto: string };
};

/** Textos de las imágenes; para landings viejas (sin «imagenes») se arman con lo que ya hay. */
export function imageTexts(r: LandingResult): ImageTexts {
  if (r.imagenes) return r.imagenes;
  const name = (r.nombre_marca || r.titulo).replace(/™/g, "").slice(0, 22);
  return {
    nombre_corto: name,
    titulares: {
      oferta: r.recuadro?.linea2?.slice(0, 40) || name,
      antes_despues: "Así cambia su día",
      que_llega: "Esto le llega a su casa",
      usos: "Úselo todos los días",
      comparacion: "La diferencia se nota",
      aspiracional: r.bloques.habito.titulo.slice(0, 40),
      confianza: "Paga cuando lo tenga en sus manos",
    },
    aspiracional_sub: r.bloques.cierre.llamado.slice(0, 40),
    usos_etiquetas: (r.beneficios_imagen ?? []).slice(0, 4).map((b) => b.split(" ").slice(0, 3).join(" ")),
    que_llega_items: [r.nombre_marca, ...(r.bloques.formula.beneficios ?? []).map((b) => b.nombre)].slice(0, 4),
    comparacion: { sin_titulo: "Sin el producto", sin_texto: "El problema sigue", con_titulo: `Con ${name}`.slice(0, 22), con_texto: "Problema resuelto" },
  };
}

/** % de descuento entre el precio de hoy y el de antes (para el sello de la imagen de oferta). */
export function discountPct(price: string, compare: string | null) {
  const now = Number(toShopifyPrice(price));
  const before = Number(toShopifyPrice(compare));
  if (!now || !before || before <= now) return null;
  return Math.round((1 - now / before) * 100);
}

export const fileName = (code: string, n: number | "gif") => (n === "gif" ? `md-${code}-gif.gif` : `md-${code}-${n}.jpg`);

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    // Que nada se interprete como código Liquid si el alumno lo pega en una sección personalizada.
    .replace(/\{\{/g, "{ {")
    .replace(/\{%/g, "{ %");

const C = 'style="text-align: center;"';
const img = (src: string, alt: string) =>
  `<p ${C}><img src="${esc(src)}" alt="${esc(alt)}" style="display: block; margin: 0 auto; width: 100%; max-width: 600px; height: auto; border-radius: 12px;"></p>`;
const h1 = (emoji: string, titulo: string) => `<h1 ${C}>${esc(emoji)} <strong>${esc(titulo)}</strong> ${esc(emoji)}</h1>`;
const p = (text: string) => `<p ${C}>${esc(text)}</p>`;
const stars = (n: number) => {
  const v = Math.max(1, Math.min(5, Math.round(n || 5)));
  return `<span style="color: #f5a623; font-size: 20px; letter-spacing: 2px;">${"★".repeat(v)}${"☆".repeat(5 - v)}</span>`;
};

/** Colores sugeridos para la página (cada alumno elige el suyo). */
export const BRAND_COLORS = ["#F26B1D", "#E11D48", "#7C3AED", "#2563EB", "#0891B2", "#059669", "#CA8A04", "#18181B"] as const;
export const DEFAULT_COLOR = BRAND_COLORS[0];
export const isHexColor = (v: string | null | undefined): v is string => Boolean(v && /^#[0-9a-fA-F]{6}$/.test(v));

/** Si el color es muy claro para leerse sobre blanco, usa casi negro. */
function readable(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.72 ? "#18181b" : hex;
}

/**
 * Descripción completa del producto con el formato ganador: 6 bloques + preguntas frecuentes al final.
 * Todo centrado y sencillo, como la landing de referencia. `src(n)` devuelve la URL de cada imagen
 * (en Shopify, la ruta del archivo importado; en la vista previa, la imagen local).
 */
export function buildDescriptionHtml(r: LandingResult, src: (n: number | "gif") => string, opts: { hasGif: boolean; hasReviews?: boolean; color?: string | null }) {
  const b = r.bloques;
  const accent = readable(isHexColor(opts.color) ? opts.color : DEFAULT_COLOR);
  const out: string[] = [];
  // Imágenes: 4 antes/después · 1 principal · 6 qué llega · 3 beneficios · 8 comparación · 5 usos · 7 mega oferta · 10 confianza · 9 reseñas
  out.push(h1(b.dolor.emoji, b.dolor.titulo), p(b.dolor.texto), img(src(opts.hasGif ? "gif" : 4), r.nombre_marca));
  if (opts.hasGif) out.push(img(src(4), `Antes y después con ${r.nombre_marca}`));
  out.push(h1(b.promesa.emoji, b.promesa.titulo), p(b.promesa.texto), img(src(1), r.nombre_marca), img(src(6), `Qué incluye ${r.nombre_marca}`));
  out.push(h1(b.formula.emoji, b.formula.titulo));
  for (const x of b.formula.beneficios.slice(0, 3)) out.push(`<p ${C}>➡️ <strong>${esc(x.nombre)}:</strong> ${esc(x.texto)}</p>`);
  out.push(img(src(3), `Beneficios de ${r.nombre_marca}`));
  out.push(h1(b.habito.emoji, b.habito.titulo), p(b.habito.texto), img(src(8), `${r.nombre_marca} frente a la alternativa`));
  out.push(h1(b.uso.emoji, b.uso.titulo));
  b.uso.pasos.slice(0, 3).forEach((paso, i) => out.push(p(`${["1️⃣", "2️⃣", "3️⃣"][i]} ${paso}`)));
  out.push(img(src(5), `Usos de ${r.nombre_marca}`));
  out.push(h1(b.cierre.emoji, b.cierre.titulo), p(b.cierre.texto), `<p ${C}><strong style="color: ${accent};">${esc(b.cierre.llamado)}</strong></p>`, img(src(7), r.nombre_marca), img(src(10), "Paga al recibir"));
  if (opts.hasReviews) out.push(img(src(9), "Lo que dicen nuestros clientes"));

  // Las reseñas no van aquí: los alumnos las ponen con su app de reseñas (Judge.me, Loox, etc.).

  // Preguntas frecuentes (al final y cortas): 2 del producto + 2 de compra
  const faq = r.faq.items.length > 4 ? [...r.faq.items.slice(0, 2), ...r.faq.items.slice(-2)] : r.faq.items;
  out.push(`<h1 ${C}><strong>${esc(r.faq.titulo)}</strong></h1>`);
  for (const q of faq) out.push(`<p ${C}><strong style="color: ${accent};">${esc(q.pregunta)}</strong><br>${esc(q.respuesta)}</p>`);
  return out.join("\n");
}

const csvCell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Convierte "$79.900", "79,900.00" o "S/ 85" en un número que Shopify entiende ("79900"). */
export function toShopifyPrice(raw: string | null | undefined) {
  if (!raw) return "";
  const clean = raw.replace(/[^\d.,]/g, "");
  if (!clean) return "";
  const lastSep = Math.max(clean.lastIndexOf("."), clean.lastIndexOf(","));
  const decimals = lastSep >= 0 ? clean.length - lastSep - 1 : 0;
  // Si después del último separador hay 1 o 2 cifras, son decimales; si hay 3, era separador de miles.
  if (lastSep >= 0 && decimals > 0 && decimals <= 2) {
    const int = clean.slice(0, lastSep).replace(/[.,]/g, "");
    return `${int}.${clean.slice(lastSep + 1)}`;
  }
  return clean.replace(/[.,]/g, "");
}

export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/™/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/** Archivo CSV de importación de productos de Shopify (Productos → Importar). Queda como borrador. */
export function buildShopifyCsv(opts: {
  code: string;
  result: LandingResult;
  bodyHtml: string;
  vendor: string;
  price: string;
  comparePrice: string | null;
  images: { url: string; alt: string }[];
}) {
  const { result: r } = opts;
  const header = [
    "Handle", "Title", "Body (HTML)", "Vendor", "Product Category", "Type", "Tags", "Published",
    "Option1 Name", "Option1 Value", "Variant SKU", "Variant Grams", "Variant Inventory Tracker", "Variant Inventory Qty",
    "Variant Inventory Policy", "Variant Fulfillment Service", "Variant Price", "Variant Compare At Price",
    "Variant Requires Shipping", "Variant Taxable", "Image Src", "Image Position", "Image Alt Text", "Gift Card",
    "SEO Title", "SEO Description", "Status",
  ];
  const handle = `${slugify(r.nombre_marca || r.titulo) || "producto"}-${opts.code}`;
  const price = toShopifyPrice(opts.price);
  const compare = toShopifyPrice(opts.comparePrice);
  const rows: string[][] = [];
  opts.images.forEach((im, i) => {
    if (i === 0) {
      rows.push([
        handle, r.titulo, opts.bodyHtml, opts.vendor, "", r.tipo_producto, [...(r.etiquetas ?? []), "makedrop"].join(", "), "TRUE",
        "Title", "Default Title", `MD-${opts.code.toUpperCase()}`, "0", "", "0",
        "continue", "manual", price, compare && Number(compare) > Number(price) ? compare : "",
        "TRUE", "FALSE", im.url, "1", im.alt, "FALSE",
        r.seo?.titulo ?? "", r.seo?.descripcion ?? "", "draft",
      ]);
    } else {
      const row = new Array(header.length).fill("");
      row[0] = handle;
      row[20] = im.url;
      row[21] = String(i + 1);
      row[22] = im.alt;
      rows.push(row);
    }
  });
  // BOM para que Excel y Shopify lean bien las tildes y los emojis.
  return "\uFEFF" + [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

/** Prompt para que el alumno saque la descripción de su producto con ChatGPT o Gemini (solo pone el nombre y el país). */
export function descriptionPrompt(product: string, country: string) {
  const name = product.trim() || "[NOMBRE DEL PRODUCTO]";
  const pais = country.trim() || "Colombia";
  return `Actúa como experto en productos ganadores para tiendas de contra entrega en ${pais}.

Producto: ${name}
Mercado: ${pais}
(Si te adjunto una foto, úsala para identificar el producto exacto).

1. Identifica exactamente qué producto es.
2. Investiga cómo se vende este producto en el mercado de ${pais} (tiendas online, Mercado Libre, Falabella, anuncios en Facebook, Instagram y TikTok).
3. Con eso, escríbeme una descripción CLARA Y REAL del producto para pegarla en un formulario. No es un texto de venta: es la información del producto.

Usa exactamente este formato, una línea por punto:

Qué es:
Problema que resuelve a los compradores en ${pais}:
Para quién es:
Características principales (materiales, ingredientes o tecnología):
Cómo se usa:
Qué incluye:
Medidas, tallas, colores o presentación:
Lo que más valoran los compradores en ${pais}:

Reglas:
- Usa solo información real del producto y de cómo se vende en ${pais}. No inventes ingredientes, materiales, medidas, certificaciones ni resultados.
- Si un dato no lo encuentras, escribe "No especificado".
- Español sencillo de ${pais}, frases cortas, sin emojis y sin exagerar.
- Máximo 1.200 caracteres en total.`;
}
