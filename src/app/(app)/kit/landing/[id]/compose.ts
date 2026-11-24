/**
 * Dibuja en el navegador las imágenes vendedoras de la landing (1080×1080) mezclando lo mejor de 2 estilos:
 * - «LullaBites»: foto a sangre con sello estrella «SÚPER PROMO», recuadro con el nombre y franja de envío;
 *   infografía «BENEFICIOS:» y el producto premium con «MEGA OFERTA».
 * - «Pidelisto»: franja superior con TITULAR grande · foto en el centro · franja inferior con el PRECIO.
 * Todo el texto lo pone el código (nunca sale con errores) sobre 3 fotos de IA + la foto del alumno.
 */
import type { ImageTexts, Review } from "@/lib/landing";

export const SIZE = 1080;
const HEADER_H = 232;
const FOOTER_H = 150;
const MID_TOP = HEADER_H;
const MID_BOTTOM = SIZE - FOOTER_H;
const MID_H = MID_BOTTOM - MID_TOP;

export type Fonts = { display: string; body: string };
export type Look = "ganador" | "marca";
export type Brand = { color: string; storeName: string; freeShipping: boolean; cod: boolean; look: Look };

export type Pics = {
  despues: ImageBitmap | null;
  usos: ImageBitmap | null;
  antes: ImageBitmap | null;
  photo: ImageBitmap | null;
  delivery: ImageBitmap | null;
};

export type Kind = "principal" | "oferta" | "beneficios" | "antes_despues" | "usos" | "que_llega" | "mega_oferta" | "comparacion" | "resenas" | "confianza";

/** Lo que va escrito en «Beneficios» y «Reseñas». */
export type Extra = { beneficios: string[]; reviews: Review[]; recuadro: { linea1: string; linea2: string } };

export async function loadBitmap(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo cargar la imagen (${res.status})`);
  return createImageBitmap(await res.blob());
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
/** Texto blanco u oscuro según qué tan claro sea el color. */
export function inkFor(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? "#111111" : "#ffffff";
}
function shade(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (amount < 0 ? c * amount : (255 - c) * amount))));
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
}

/** Colores de las franjas: «ganador» = amarillo y rojo (Pidelisto); «marca» = el color del alumno. */
function palette(brand: Brand) {
  if (brand.look === "marca") {
    return { header: brand.color, headerInk: inkFor(brand.color), footer: shade(brand.color, -0.6), footerInk: "#ffffff", tag: "#FFE11B", tagInk: "#111111" };
  }
  return { header: "#FFE11B", headerInk: "#111111", footer: "#D7261E", footerInk: "#ffffff", tag: "#FFE11B", tagInk: "#111111" };
}

function canvas() {
  const c = document.createElement("canvas");
  c.width = SIZE;
  c.height = SIZE;
  return { c, ctx: c.getContext("2d")! };
}

function cover(ctx: CanvasRenderingContext2D, img: ImageBitmap, x: number, y: number, w: number, h: number, zoom = 1, sx0 = 0, sy0 = 0, sw0 = img.width, sh0 = img.height) {
  const s = Math.max(w / sw0, h / sh0) * zoom;
  const sw = w / s;
  const sh = h / s;
  ctx.drawImage(img, sx0 + (sw0 - sw) / 2, sy0 + (sh0 - sh) / 2, sw, sh, x, y, w, h);
}
function contain(ctx: CanvasRenderingContext2D, img: ImageBitmap, x: number, y: number, w: number, h: number) {
  const s = Math.min(w / img.width, h / img.height);
  ctx.drawImage(img, x + (w - img.width * s) / 2, y + (h - img.height * s) / 2, img.width * s, img.height * s);
}
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}
/** Achica la letra hasta que el texto quepa en `maxLines` líneas. */
function fitLines(ctx: CanvasRenderingContext2D, text: string, font: (size: number) => string, maxWidth: number, maxLines: number, start: number, min: number) {
  let size = start;
  let lines: string[] = [];
  while (size >= min) {
    ctx.font = font(size);
    lines = wrap(ctx, text, maxWidth);
    if (lines.length <= maxLines && lines.every((l) => ctx.measureText(l).width <= maxWidth)) break;
    size -= 4;
  }
  ctx.font = font(size);
  return { size, lines: lines.slice(0, maxLines) };
}

/** Color de fondo de la foto del alumno (mirando sus esquinas). */
function photoBackground(img: ImageBitmap) {
  const c = document.createElement("canvas");
  c.width = 24;
  c.height = 24;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, 24, 24);
  let r = 0, g = 0, b = 0;
  for (const [x, y] of [[1, 1], [22, 1], [1, 22], [22, 22]]) {
    const d = ctx.getImageData(x, y, 1, 1).data;
    r += d[0] / 4;
    g += d[1] / 4;
    b += d[2] / 4;
  }
  return { light: (r + g + b) / 3 > 205, color: `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})` };
}

function header(ctx: CanvasRenderingContext2D, title: string, fonts: Fonts, bg: string, ink: string, height = HEADER_H) {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SIZE, height);
  let { size, lines } = fitLines(ctx, title.toUpperCase(), (s) => `400 ${s}px ${fonts.display}`, SIZE - 80, 2, 104, 52);
  // Que las líneas quepan también en alto (Anton es una letra alta).
  while (lines.length * size * 1.04 > height - 34 && size > 44) {
    ({ size, lines } = fitLines(ctx, title.toUpperCase(), (s) => `400 ${s}px ${fonts.display}`, SIZE - 80, 2, size - 4, 44));
  }
  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lh = size * 1.04;
  lines.forEach((l, i) => ctx.fillText(l, SIZE / 2, height / 2 + (i - (lines.length - 1) / 2) * lh + 4));
  ctx.textBaseline = "alphabetic";
}

function footer(ctx: CanvasRenderingContext2D, name: string, price: string, brand: Brand, fonts: Fonts) {
  const p = palette(brand);
  ctx.fillStyle = p.footer;
  ctx.fillRect(0, MID_BOTTOM, SIZE, FOOTER_H);
  // Etiqueta del precio
  ctx.font = `400 74px ${fonts.display}`;
  const tw = Math.min(ctx.measureText(price).width + 56, 470);
  const tx = SIZE - 36 - tw;
  const ty = MID_BOTTOM + 18;
  roundRect(ctx, tx, ty, tw, 88, 14);
  ctx.fillStyle = p.tag;
  ctx.fill();
  ctx.fillStyle = p.tagInk;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(price, tx + tw / 2, ty + 47, tw - 30);
  // Envío gratis · Paga al recibir
  const note = [brand.freeShipping ? "Envío gratis" : "", brand.cod ? "Paga al recibir" : ""].filter(Boolean).join(" · ");
  if (note) {
    ctx.font = `600 24px ${fonts.body}`;
    ctx.fillStyle = p.footerInk;
    ctx.fillText(note, tx + tw / 2, ty + 112);
  }
  // Nombre del producto
  const { lines, size } = fitLines(ctx, name.toUpperCase(), (s) => `400 ${s}px ${fonts.display}`, tx - 70, 2, 72, 36);
  ctx.fillStyle = p.footerInk;
  ctx.textAlign = "left";
  lines.forEach((l, i) => ctx.fillText(l, 36, MID_BOTTOM + FOOTER_H / 2 + (i - (lines.length - 1) / 2) * size * 1.02 + 4));
  ctx.textBaseline = "alphabetic";
}

function pill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, bg: string, fonts: Fonts, size = 34) {
  ctx.font = `800 ${size}px ${fonts.body}`;
  const w = ctx.measureText(text).width + 34;
  const h = size + 22;
  roundRect(ctx, x, y, w, h, 10);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + 17, y + h / 2 + 2);
  ctx.textBaseline = "alphabetic";
  return w;
}

/** Foto del alumno sobre su mismo color de fondo (se ve limpia aunque no sea cuadrada). */
function productOnBackground(ctx: CanvasRenderingContext2D, photo: ImageBitmap | null, x: number, y: number, w: number, h: number, pad = 40) {
  if (!photo) {
    ctx.fillStyle = "#f4f4f5";
    ctx.fillRect(x, y, w, h);
    return;
  }
  const bg = photoBackground(photo);
  ctx.fillStyle = bg.light ? bg.color : "#f4f4f5";
  ctx.fillRect(x, y, w, h);
  contain(ctx, photo, x + pad, y + pad, w - pad * 2, h - pad * 2);
}

/** Si falta una foto de IA, usa la del alumno (en el «antes», apagada en gris). */
function sceneOrPhoto(ctx: CanvasRenderingContext2D, img: ImageBitmap | null, photo: ImageBitmap | null, x: number, y: number, w: number, h: number, dull = false, zoom = 1) {
  if (img) return cover(ctx, img, x, y, w, h, zoom);
  if (!photo) {
    ctx.fillStyle = "#3f3f46";
    ctx.fillRect(x, y, w, h);
    return;
  }
  ctx.save();
  if (dull) ctx.filter = "grayscale(1) brightness(0.75)";
  productOnBackground(ctx, photo, x, y, w, h, 30);
  ctx.restore();
}

function crossMark(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save();
  ctx.strokeStyle = "#E11D2A";
  ctx.lineWidth = r * 0.28;
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(cx - r, cy - r);
  ctx.lineTo(cx + r, cy + r);
  ctx.moveTo(cx + r, cy - r);
  ctx.lineTo(cx - r, cy + r);
  ctx.stroke();
  ctx.restore();
}
function checkMark(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save();
  ctx.strokeStyle = "#16A34A";
  ctx.lineWidth = r * 0.3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx - r * 0.25, cy + r * 0.75);
  ctx.lineTo(cx + r, cy - r * 0.7);
  ctx.stroke();
  ctx.restore();
}

function caption(ctx: CanvasRenderingContext2D, text: string, x: number, w: number, fonts: Fonts) {
  const g = ctx.createLinearGradient(0, MID_BOTTOM - 130, 0, MID_BOTTOM);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.75)");
  ctx.fillStyle = g;
  ctx.fillRect(x, MID_BOTTOM - 130, w, 130);
  const { lines, size } = fitLines(ctx, text, (s) => `700 ${s}px ${fonts.body}`, w - 40, 2, 34, 22);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  lines.forEach((l, i) => ctx.fillText(l, x + w / 2, MID_BOTTOM - 26 - (lines.length - 1 - i) * size * 1.15));
}

/* ---------- Estilo LullaBites ---------- */

/** Color de los sellos y franjas LullaBites: naranja original, o el color del alumno en «Mi color». */
const lbColor = (brand: Brand) => (brand.look === "marca" ? brand.color : "#F26B1D");

/** Sello estrella tipo «SÚPER PROMO». */
function lbBadge(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, lines: string[], color: string, fonts: Fonts) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.14);
  const points = 18;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.86;
    const a = (Math.PI * i) / points;
    ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 7;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  const ink = inkFor(color);
  ctx.textAlign = "center";
  const size = r * 0.48;
  ctx.font = `italic 400 ${size}px ${fonts.display}`;
  lines.forEach((l, i) => {
    const y = (i - (lines.length - 1) / 2) * size * 0.98 + size * 0.36;
    ctx.lineWidth = 8;
    ctx.strokeStyle = shade(color, -0.45);
    ctx.strokeText(l, 0, y);
    ctx.fillStyle = ink;
    ctx.fillText(l, 0, y);
  });
  ctx.restore();
}

/** Franja «🚚 ENVÍO GRATIS / 🏠 PAGO CONTRAENTREGA». */
function lbStrip(ctx: CanvasRenderingContext2D, brand: Brand, fonts: Fonts, align: "left" | "right" = "left") {
  const lines = [brand.freeShipping ? "🚚  ENVÍO GRATIS" : "", brand.cod ? "🏠  PAGO CONTRAENTREGA" : ""].filter(Boolean);
  if (!lines.length) return;
  const color = lbColor(brand);
  ctx.save();
  const size = 40;
  ctx.font = `800 ${size}px ${fonts.body}`;
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 64;
  const h = lines.length * size * 1.25 + 40;
  const x = align === "left" ? 40 : SIZE - 40 - w;
  const y = SIZE - 40 - h;
  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 16;
  roundRect(ctx, x, y, w, h, 14);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.stroke();
  ctx.fillStyle = inkFor(color);
  ctx.textAlign = "left";
  lines.forEach((l, i) => ctx.fillText(l, x + 32, y + 20 + size + i * size * 1.25 - 6));
  ctx.restore();
}

/** Recuadro de la imagen principal: «Nombre™ Original:» + beneficio. */
function lbTitleBox(ctx: CanvasRenderingContext2D, linea1: string, linea2: string, color: string, fonts: Fonts) {
  ctx.save();
  const maxW = 500;
  ctx.font = `800 38px ${fonts.body}`;
  const l1 = wrap(ctx, linea1, maxW - 48).slice(0, 2);
  ctx.font = `600 27px ${fonts.body}`;
  const l2 = wrap(ctx, linea2, maxW - 48).slice(0, 3);
  const h = 32 + l1.length * 44 + l2.length * 33 + 20;
  const x = SIZE - 40 - maxW;
  const y = 40;
  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 16;
  roundRect(ctx, x, y, maxW, h, 14);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = inkFor(color);
  ctx.textAlign = "center";
  let ty = y + 26 + 34;
  ctx.font = `800 38px ${fonts.body}`;
  for (const l of l1) {
    ctx.fillText(l, x + maxW / 2, ty);
    ty += 44;
  }
  ctx.font = `600 27px ${fonts.body}`;
  for (const l of l2) {
    ctx.fillText(l, x + maxW / 2, ty - 6);
    ty += 33;
  }
  ctx.restore();
}

/** Infografía «BENEFICIOS:»: lista con ✓ sobre fondo oscuro y el producto en una tarjeta. */
function lbBenefits(ctx: CanvasRenderingContext2D, items: string[], photo: ImageBitmap | null, color: string, fonts: Fonts) {
  const g = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  g.addColorStop(0, shade(color, -0.78));
  g.addColorStop(1, shade(color, -0.45));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);
  // Tarjeta con el producto
  if (photo) {
    ctx.save();
    roundRect(ctx, 630, 250, 410, 560, 28);
    const bg = photoBackground(photo);
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 40;
    ctx.fillStyle = bg.light ? bg.color : "#ffffff";
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.clip();
    contain(ctx, photo, 650, 270, 370, 520);
    ctx.restore();
  }
  const x = 40;
  const w = 560;
  const rowH = 118;
  const top = 200;
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.font = `400 92px ${fonts.display}`;
  ctx.textAlign = "left";
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 14;
  ctx.fillText("BENEFICIOS:", x + 8, 150);
  ctx.shadowBlur = 0;
  const list = items.slice(0, 5);
  roundRect(ctx, x, top, w, rowH * list.length + 30, 22);
  ctx.fillStyle = "rgba(10, 16, 40, 0.62)";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.stroke();
  list.forEach((text, i) => {
    const cy = top + 15 + rowH * i + rowH / 2;
    ctx.beginPath();
    ctx.arc(x + 58, cy, 30, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = inkFor(color);
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x + 44, cy + 1);
    ctx.lineTo(x + 54, cy + 12);
    ctx.lineTo(x + 74, cy - 10);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 31px ${fonts.body}`;
    const lines = wrap(ctx, text, w - 140).slice(0, 2);
    lines.forEach((l, j) => ctx.fillText(l, x + 108, cy + 11 - (lines.length - 1) * 19 + j * 38));
    if (i < list.length - 1) {
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(x + 24, top + 15 + rowH * (i + 1), w - 48, 2);
    }
  });
  ctx.restore();
}

const toBlob = (c: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo crear la imagen"))), "image/jpeg", 0.9));

export type Prices = { price: string; compare: string | null; discountPct: number | null };

export async function composeImage(kind: Kind, t: ImageTexts, pics: Pics, prices: Prices, brand: Brand, fonts: Fonts, extra: Extra) {
  const { c, ctx } = canvas();
  const p = palette(brand);

  // --- Imágenes estilo LullaBites (sin franjas de titular/precio) ---
  if (kind === "principal") {
    const color = lbColor(brand);
    sceneOrPhoto(ctx, pics.despues, pics.photo, 0, 0, SIZE, SIZE);
    lbBadge(ctx, 175, 175, 135, ["SÚPER", "PROMO"], color, fonts);
    lbTitleBox(ctx, extra.recuadro.linea1, extra.recuadro.linea2, color, fonts);
    lbStrip(ctx, brand, fonts, "left");
    return toBlob(c);
  }
  if (kind === "beneficios") {
    const color = lbColor(brand);
    lbBenefits(ctx, extra.beneficios, pics.photo, color, fonts);
    lbBadge(ctx, SIZE - 175, 140, 120, ["SÚPER", "PROMO"], color, fonts);
    lbStrip(ctx, brand, fonts, "right");
    return toBlob(c);
  }
  if (kind === "mega_oferta") {
    // Producto protagonista (foto del alumno) sobre fondo premium oscuro, como la «MEGA OFERTA» de LullaBites.
    const color = lbColor(brand);
    const g = ctx.createRadialGradient(SIZE / 2, SIZE / 2, 80, SIZE / 2, SIZE / 2, SIZE * 0.75);
    g.addColorStop(0, "#3f3f46");
    g.addColorStop(1, "#09090b");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SIZE, SIZE);
    if (pics.photo) {
      const bg = photoBackground(pics.photo);
      ctx.save();
      if (bg.light) {
        roundRect(ctx, 170, 170, 740, 740, 40);
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 50;
        ctx.fillStyle = bg.color;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.clip();
        contain(ctx, pics.photo, 200, 200, 680, 680);
      } else {
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 50;
        contain(ctx, pics.photo, 140, 140, 800, 760);
      }
      ctx.restore();
    }
    lbBadge(ctx, SIZE - 175, 175, 135, ["MEGA", "OFERTA"], color, fonts);
    lbStrip(ctx, brand, fonts, "right");
    return toBlob(c);
  }

  const name = t.nombre_corto;
  switch (kind) {
    case "oferta": {
      const g = ctx.createRadialGradient(SIZE / 2, MID_TOP + MID_H / 2, 60, SIZE / 2, MID_TOP + MID_H / 2, SIZE * 0.7);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(1, "#e4e4e7");
      ctx.fillStyle = g;
      ctx.fillRect(0, MID_TOP, SIZE, MID_H);
      if (pics.photo) {
        const bg = photoBackground(pics.photo);
        if (!bg.light) {
          roundRect(ctx, 150, MID_TOP + 40, 780, MID_H - 80, 30);
          ctx.fillStyle = bg.color;
          ctx.fill();
        }
        contain(ctx, pics.photo, 170, MID_TOP + 50, 740, MID_H - 100);
      }
      // Sello de descuento
      const pct = prices.discountPct;
      const label = pct && pct >= 45 ? ["MITAD", "DE PRECIO"] : pct && pct >= 5 ? [`-${pct}%`, "HOY"] : ["OFERTA", "DE HOY"];
      ctx.save();
      ctx.translate(SIZE - 190, MID_TOP + 200);
      ctx.rotate(-0.12);
      ctx.beginPath();
      ctx.arc(0, 0, 130, 0, Math.PI * 2);
      ctx.fillStyle = "#E11D2A";
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 8;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.font = `400 ${label[0].length > 6 ? 58 : 76}px ${fonts.display}`;
      ctx.fillText(label[0], 0, -2, 220);
      ctx.font = `400 44px ${fonts.display}`;
      ctx.fillText(label[1], 0, 50, 220);
      ctx.restore();
      if (prices.compare) {
        ctx.font = `700 38px ${fonts.body}`;
        const txt = `Antes ${prices.compare}`;
        const w = ctx.measureText(txt).width;
        const x = SIZE - 40 - w;
        const y = MID_BOTTOM - 36;
        ctx.fillStyle = "#52525b";
        ctx.textAlign = "left";
        ctx.fillText(txt, x, y);
        ctx.fillRect(x - 4, y - 13, w + 8, 4);
      }
      header(ctx, t.titulares.oferta, fonts, p.header, p.headerInk);
      break;
    }
    case "resenas": {
      // Comentarios de clientes REALES (los que pegó el alumno), con iniciales en vez de fotos inventadas.
      ctx.fillStyle = "#f0f2f5";
      ctx.fillRect(0, MID_TOP, SIZE, MID_H);
      const list = extra.reviews.slice(0, 3);
      const colors = ["#2563EB", "#DB2777", "#059669", "#D97706"];
      let y = MID_TOP + 30;
      const boxH = (MID_H - 60 - (list.length - 1) * 22) / Math.max(list.length, 1);
      list.forEach((rv, i) => {
        // Avatar con iniciales
        const initials = rv.nombre.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
        ctx.beginPath();
        ctx.arc(80, y + 50, 40, 0, Math.PI * 2);
        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `800 32px ${fonts.body}`;
        ctx.fillText(initials || "C", 80, y + 52);
        ctx.textBaseline = "alphabetic";
        // Burbuja del comentario
        roundRect(ctx, 140, y, SIZE - 180, boxH, 28);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.textAlign = "left";
        ctx.fillStyle = "#111111";
        ctx.font = `800 30px ${fonts.body}`;
        ctx.fillText(rv.nombre + (rv.ciudad ? ` · ${rv.ciudad}` : ""), 172, y + 48, SIZE - 240);
        const { lines, size } = fitLines(ctx, rv.texto, (s) => `500 ${s}px ${fonts.body}`, SIZE - 250, Math.max(1, Math.floor((boxH - 70) / 38)), 32, 22);
        ctx.fillStyle = "#27272a";
        lines.forEach((l, j) => ctx.fillText(l, 172, y + 92 + j * size * 1.2));
        y += boxH + 22;
      });
      header(ctx, "Lo que dicen nuestros clientes", fonts, p.header, p.headerInk);
      break;
    }
    case "antes_despues": {
      const half = SIZE / 2;
      sceneOrPhoto(ctx, pics.antes, pics.photo, 0, MID_TOP, half, MID_H, true);
      sceneOrPhoto(ctx, pics.despues, pics.photo, half, MID_TOP, half, MID_H);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(half - 4, MID_TOP, 8, MID_H);
      pill(ctx, "ANTES", 24, MID_TOP + 24, "#E11D2A", fonts);
      pill(ctx, "DESPUÉS", half + 24, MID_TOP + 24, "#16A34A", fonts);
      header(ctx, t.titulares.antes_despues, fonts, p.header, p.headerInk);
      break;
    }
    case "que_llega": {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, MID_TOP, SIZE, MID_H);
      if (pics.photo) contain(ctx, pics.photo, 40, MID_TOP + 40, 600, MID_H - 80);
      const items = t.que_llega_items.slice(0, 4);
      const step = MID_H / (items.length + 1);
      items.forEach((it, i) => {
        const cy = MID_TOP + step * (i + 1);
        ctx.strokeStyle = "#111111";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(600, cy);
        ctx.lineTo(680, cy);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(600, cy, 7, 0, Math.PI * 2);
        ctx.fillStyle = "#111111";
        ctx.fill();
        const { lines, size } = fitLines(ctx, it, (s) => `800 ${s}px ${fonts.body}`, SIZE - 720, 2, 38, 24);
        ctx.textAlign = "left";
        lines.forEach((l, j) => ctx.fillText(l, 696, cy + 12 - (lines.length - 1) * size * 0.55 + j * size * 1.1));
      });
      header(ctx, t.titulares.que_llega, fonts, p.header, p.headerInk);
      break;
    }
    case "usos": {
      if (pics.usos) cover(ctx, pics.usos, 0, MID_TOP, SIZE, MID_H);
      else sceneOrPhoto(ctx, pics.despues, pics.photo, 0, MID_TOP, SIZE, MID_H);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(SIZE / 2 - 3, MID_TOP, 6, MID_H);
      ctx.fillRect(0, MID_TOP + MID_H / 2 - 3, SIZE, 6);
      const labels = t.usos_etiquetas.slice(0, 4);
      const pos = [
        [16, MID_TOP + 16],
        [SIZE / 2 + 16, MID_TOP + 16],
        [16, MID_TOP + MID_H / 2 + 16],
        [SIZE / 2 + 16, MID_TOP + MID_H / 2 + 16],
      ];
      labels.forEach((l, i) => pill(ctx, l.toUpperCase(), pos[i][0], pos[i][1], "#111111", fonts, 26));
      header(ctx, t.titulares.usos, fonts, p.header, p.headerInk);
      break;
    }
    case "comparacion": {
      const half = SIZE / 2;
      sceneOrPhoto(ctx, pics.antes, pics.photo, 0, MID_TOP, half, MID_H, true, 1.15);
      if (pics.usos) {
        // Primera foto de la cuadrícula de usos (persona usando el producto).
        cover(ctx, pics.usos, half, MID_TOP, half, MID_H, 1, 0, 0, pics.usos.width / 2, pics.usos.height / 2);
      } else sceneOrPhoto(ctx, pics.despues, pics.photo, half, MID_TOP, half, MID_H, false, 1.15);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(half - 4, MID_TOP, 8, MID_H);
      const banner = (text: string, x: number, bg: string) => {
        ctx.fillStyle = bg;
        ctx.fillRect(x + 20, MID_TOP + 20, half - 40, 70);
        const { size } = fitLines(ctx, text.toUpperCase(), (s) => `400 ${s}px ${fonts.display}`, half - 70, 1, 48, 26);
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `400 ${size}px ${fonts.display}`;
        ctx.fillText(text.toUpperCase(), x + half / 2, MID_TOP + 57);
        ctx.textBaseline = "alphabetic";
      };
      banner(t.comparacion.sin_titulo, 0, "#E11D2A");
      banner(t.comparacion.con_titulo, half, "#16A34A");
      crossMark(ctx, half / 2, MID_TOP + MID_H / 2, 90);
      checkMark(ctx, half + half - 110, MID_TOP + MID_H - 210, 70);
      caption(ctx, t.comparacion.sin_texto, 0, half, fonts);
      caption(ctx, t.comparacion.con_texto, half, half, fonts);
      header(ctx, t.titulares.comparacion, fonts, p.header, p.headerInk);
      break;
    }
    case "confianza": {
      if (pics.delivery) cover(ctx, pics.delivery, 0, MID_TOP, SIZE, MID_H);
      else {
        const g = ctx.createLinearGradient(0, MID_TOP, 0, MID_BOTTOM);
        g.addColorStop(0, "#fde68a");
        g.addColorStop(1, "#f59e0b");
        ctx.fillStyle = g;
        ctx.fillRect(0, MID_TOP, SIZE, MID_H);
      }
      // Recuadro con el producto
      if (pics.photo) {
        roundRect(ctx, SIZE - 330, MID_TOP + 40, 290, 290, 20);
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "rgba(0,0,0,0.3)";
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.shadowBlur = 0;
        contain(ctx, pics.photo, SIZE - 315, MID_TOP + 55, 260, 260);
      }
      const cards = [
        brand.freeShipping ? ["🚚", "ENVÍO", "GRATIS"] : ["📦", "ENVÍO A", "TODO EL PAÍS"],
        brand.cod ? ["💵", "PAGA AL", "RECIBIR"] : ["🔒", "COMPRA", "SEGURA"],
        ["💬", "CONFIRMAMOS", "POR WHATSAPP"],
        ["✅", "COMPRA", "SEGURA"],
      ];
      const cw = 236;
      const gap = (SIZE - 4 * cw) / 5;
      cards.forEach(([icon, l1, l2], i) => {
        const x = gap + i * (cw + gap);
        const y = MID_BOTTOM - 210;
        roundRect(ctx, x, y, cw, 185, 18);
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "rgba(0,0,0,0.25)";
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.textAlign = "center";
        ctx.font = `56px ${fonts.body}`;
        ctx.fillStyle = "#111111";
        ctx.fillText(icon, x + cw / 2, y + 72);
        ctx.font = `800 26px ${fonts.body}`;
        ctx.fillText(l1, x + cw / 2, y + 122, cw - 20);
        ctx.fillText(l2, x + cw / 2, y + 154, cw - 20);
      });
      header(ctx, t.titulares.confianza, fonts, p.header, p.headerInk);
      break;
    }
  }
  footer(ctx, name, prices.price, brand, fonts);
  return toBlob(c);
}
