/** MakeDrop Landing: tipos, plantilla HTML de la descripción y archivo de importación para Shopify. */

export const LANDING_TOOL_NAME = "MakeDrop Landing";
/**
 * Modelo de las 2 fotos con personas y costo aproximado de cada landing (3 fotos con IA + texto).
 * La foto del producto solo siempre usa el modelo económico.
 */
export const IMAGE_MODELS = [
  { id: "gemini-3.1-flash-image-preview", label: "Nano Banana 2 · mejor calidad", costUsd: 0.15, costCop: 575 },
  { id: "gemini-2.5-flash-image", label: "Nano Banana · más económico", costUsd: 0.1, costCop: 400 },
] as const;
export const landingCost = (model: string) => IMAGE_MODELS.find((m) => m.id === model)?.costUsd ?? IMAGE_MODELS[0].costUsd;
export const landingCostCop = (model: string) => IMAGE_MODELS.find((m) => m.id === model)?.costCop ?? IMAGE_MODELS[0].costCop;

type BudgetSettings = {
  landing_limit_mode: string;
  landing_monthly_kit: number;
  landing_monthly_member: number;
  landing_budget_pct: number;
  landing_image_model: string;
  landing_default_usd_kit: number;
  landing_default_usd_member: number;
};

/**
 * Cuántas landings puede crear un alumno cada 30 días. Modo «fijo»: un número por tipo de alumno
 * (academia = rol kit, mentoría 1 a 1 = rol member). Modo «porcentaje»: el % de lo que paga al mes
 * dividido por lo que cuesta cada landing. Admin y coaches no tienen límite (limit = null).
 */
export function landingAllowance(role: string, monthlyUsd: number | null | undefined, s: BudgetSettings) {
  const cost = landingCost(s.landing_image_model);
  if (role === "admin" || role === "coach") return { limit: null, monthlyUsd: null, budget: null, cost };
  if (s.landing_limit_mode !== "porcentaje") {
    return { limit: Number(role === "kit" ? s.landing_monthly_kit : s.landing_monthly_member) || 0, monthlyUsd: null, budget: null, cost };
  }
  const usd = Number(monthlyUsd ?? (role === "kit" ? s.landing_default_usd_kit : s.landing_default_usd_member)) || 0;
  const budget = (usd * Number(s.landing_budget_pct)) / 100;
  return { limit: Math.floor(budget / cost + 1e-9), monthlyUsd: usd, budget, cost };
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
};

/** Las 6 imágenes finales (en este orden en la galería de Shopify) + el GIF opcional. */
export const FINAL_IMAGES = [
  { n: 1, slot: "principal", label: "Principal" },
  { n: 2, slot: "beneficios", label: "Beneficios" },
  { n: 3, slot: "uso_1", label: "En uso" },
  { n: 4, slot: "producto", label: "Producto" },
  { n: 5, slot: "uso_2", label: "Producto real" },
  { n: 6, slot: "confianza", label: "Compra verificada" },
] as const;
export type FinalSlot = (typeof FINAL_IMAGES)[number]["slot"];

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
export function buildDescriptionHtml(r: LandingResult, src: (n: number | "gif") => string, opts: { hasGif: boolean; color?: string | null }) {
  const b = r.bloques;
  const accent = readable(isHexColor(opts.color) ? opts.color : DEFAULT_COLOR);
  const out: string[] = [];
  out.push(h1(b.dolor.emoji, b.dolor.titulo), p(b.dolor.texto), img(src(opts.hasGif ? "gif" : 3), r.nombre_marca));
  out.push(h1(b.promesa.emoji, b.promesa.titulo), p(b.promesa.texto), img(src(4), r.nombre_marca));
  out.push(h1(b.formula.emoji, b.formula.titulo));
  for (const x of b.formula.beneficios.slice(0, 3)) out.push(`<p ${C}>➡️ <strong>${esc(x.nombre)}:</strong> ${esc(x.texto)}</p>`);
  out.push(img(src(2), `Beneficios de ${r.nombre_marca}`));
  out.push(h1(b.habito.emoji, b.habito.titulo), p(b.habito.texto), img(src(5), r.nombre_marca));
  out.push(h1(b.uso.emoji, b.uso.titulo));
  b.uso.pasos.slice(0, 3).forEach((paso, i) => out.push(p(`${["1️⃣", "2️⃣", "3️⃣"][i]} ${paso}`)));
  out.push(img(src(opts.hasGif ? 3 : 1), r.nombre_marca));
  out.push(h1(b.cierre.emoji, b.cierre.titulo), p(b.cierre.texto), `<p ${C}><strong style="color: ${accent};">${esc(b.cierre.llamado)}</strong></p>`, img(src(6), "Compra verificada"));

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
