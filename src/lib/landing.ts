/** MakeDrop Landing: tipos, plantilla HTML de la descripción y archivo de importación para Shopify. */

export const LANDING_TOOL_NAME = "MakeDrop Landing";
export const LANDING_MONTHLY_LIMIT = 4;
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
  resenas: { titulo: string; items: { nombre: string; ciudad: string; estrellas: number; titulo?: string; texto: string }[] };
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
  { n: 5, slot: "uso_2", label: "En uso 2" },
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
  return `<span style="color: #f5a623; font-size: 18px; letter-spacing: 2px;">${"★".repeat(v)}</span><span style="color: #d4d4d8; font-size: 18px; letter-spacing: 2px;">${"★".repeat(5 - v)}</span>`;
};

/**
 * Descripción completa del producto (estructura definitiva + reseñas + preguntas frecuentes).
 * `src(n)` devuelve la URL de cada imagen: en Shopify es la ruta del archivo importado; en la vista previa, la imagen local.
 */
export function buildDescriptionHtml(r: LandingResult, src: (n: number | "gif") => string, opts: { hasGif: boolean }) {
  const b = r.bloques;
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
  out.push(h1(b.cierre.emoji, b.cierre.titulo), p(b.cierre.texto), `<p ${C}><strong>${esc(b.cierre.llamado)}</strong></p>`, img(src(6), "Compra verificada"));

  // Reseñas (obligatorias)
  out.push(`<h2 ${C}><strong>${esc(r.resenas.titulo)}</strong></h2>`);
  for (const rv of r.resenas.items.slice(0, 6)) {
    out.push(
      `<div style="max-width: 600px; margin: 12px auto; padding: 16px; border: 1px solid #e4e4e7; border-radius: 12px; text-align: left; background: #ffffff;">` +
        `<p style="margin: 0;">${stars(rv.estrellas)}</p>` +
        (rv.titulo ? `<p style="margin: 6px 0 0;"><strong>${esc(rv.titulo)}</strong></p>` : "") +
        `<p style="margin: 6px 0 0;">${esc(rv.texto)}</p>` +
        `<p style="margin: 8px 0 0; font-size: 14px; color: #71717a;"><strong>${esc(rv.nombre)}</strong> · ${esc(rv.ciudad)}</p>` +
        `</div>`,
    );
  }
  if (!r.resenas_reales) out.push(`<p style="text-align: center; font-size: 12px; color: #a1a1aa;">Reseñas ilustrativas.</p>`);

  // Preguntas frecuentes (siempre al final)
  out.push(`<h2 ${C}><strong>${esc(r.faq.titulo)}</strong></h2>`);
  for (const q of r.faq.items.slice(0, 8)) {
    out.push(
      `<div style="max-width: 600px; margin: 10px auto; padding: 14px 16px; border-radius: 12px; background: #f4f4f5; text-align: left;">` +
        `<p style="margin: 0;"><strong>${esc(q.pregunta)}</strong></p>` +
        `<p style="margin: 6px 0 0;">${esc(q.respuesta)}</p>` +
        `</div>`,
    );
  }
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
  return "﻿" + [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
