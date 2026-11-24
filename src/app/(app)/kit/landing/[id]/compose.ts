/**
 * Dibuja en el navegador las 6 imágenes finales de la landing (1080×1080):
 * foto base (IA o del alumno) + sello «SÚPER PROMO» + franja «ENVÍO GRATIS · PAGO CONTRAENTREGA».
 * El texto lo pone el código, así nunca sale con errores de ortografía.
 */

export const SIZE = 1080;

export type Fonts = { display: string; body: string };
export type Brand = { color: string; storeName: string; freeShipping: boolean; cod: boolean };

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
/** Texto blanco u oscuro según qué tan claro sea el color de marca. */
export function inkFor(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.68 ? "#18181b" : "#ffffff";
}
function shade(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (amount < 0 ? c * amount : (255 - c) * amount))));
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
}

function canvas() {
  const c = document.createElement("canvas");
  c.width = SIZE;
  c.height = SIZE;
  const ctx = c.getContext("2d")!;
  ctx.textBaseline = "alphabetic";
  return { c, ctx };
}

function cover(ctx: CanvasRenderingContext2D, img: ImageBitmap, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.width, h / img.height);
  const sw = w / s;
  const sh = h / s;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}
function contain(ctx: CanvasRenderingContext2D, img: ImageBitmap, x: number, y: number, w: number, h: number) {
  const s = Math.min(w / img.width, h / img.height);
  const dw = img.width * s;
  const dh = img.height * s;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

/** Color de fondo de la foto (mirando sus esquinas) y si es claro, típico de las fotos de proveedor. */
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

/** Sello estrella tipo «SÚPER PROMO». */
function badge(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, lines: string[], brand: Brand, fonts: Fonts) {
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
  ctx.fillStyle = brand.color;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 7;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  const ink = inkFor(brand.color);
  ctx.textAlign = "center";
  const size = r * 0.48;
  ctx.font = `italic 400 ${size}px ${fonts.display}`;
  lines.forEach((l, i) => {
    const y = (i - (lines.length - 1) / 2) * size * 0.98 + size * 0.36;
    ctx.lineWidth = 8;
    ctx.strokeStyle = shade(brand.color, -0.45);
    ctx.strokeText(l, 0, y);
    ctx.fillStyle = ink;
    ctx.fillText(l, 0, y);
  });
  ctx.restore();
}

/** Franja inferior «🚚 ENVÍO GRATIS / 🏠 PAGO CONTRAENTREGA». */
function strip(ctx: CanvasRenderingContext2D, brand: Brand, fonts: Fonts, align: "left" | "right" = "left") {
  const lines = [brand.freeShipping ? "🚚  ENVÍO GRATIS" : "", brand.cod ? "🏠  PAGO CONTRAENTREGA" : ""].filter(Boolean);
  if (!lines.length) return;
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
  ctx.fillStyle = brand.color;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.stroke();
  ctx.fillStyle = inkFor(brand.color);
  ctx.textAlign = "left";
  lines.forEach((l, i) => ctx.fillText(l, x + 32, y + 20 + size + i * size * 1.25 - 6));
  ctx.restore();
}

/** Recuadro de la imagen principal: «Nombre™ Original:» + beneficio. */
function titleBox(ctx: CanvasRenderingContext2D, linea1: string, linea2: string, brand: Brand, fonts: Fonts) {
  ctx.save();
  const maxW = 540;
  ctx.font = `800 40px ${fonts.body}`;
  const l1 = wrap(ctx, linea1, maxW - 48).slice(0, 2);
  ctx.font = `600 28px ${fonts.body}`;
  const l2 = wrap(ctx, linea2, maxW - 48).slice(0, 3);
  const h = 32 + l1.length * 46 + l2.length * 34 + 20;
  const x = SIZE - 40 - maxW;
  const y = 40;
  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 16;
  roundRect(ctx, x, y, maxW, h, 14);
  ctx.fillStyle = brand.color;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = inkFor(brand.color);
  ctx.textAlign = "center";
  let ty = y + 26 + 36;
  ctx.font = `800 40px ${fonts.body}`;
  for (const l of l1) {
    ctx.fillText(l, x + maxW / 2, ty);
    ty += 46;
  }
  ctx.font = `600 28px ${fonts.body}`;
  for (const l of l2) {
    ctx.fillText(l, x + maxW / 2, ty - 6);
    ty += 34;
  }
  ctx.restore();
}

/** Panel izquierdo de la infografía «BENEFICIOS:». */
function benefitsPanel(ctx: CanvasRenderingContext2D, items: string[], brand: Brand, fonts: Fonts) {
  ctx.save();
  const x = 40;
  const w = 560;
  const rowH = 118;
  const top = 200;
  ctx.fillStyle = "#ffffff";
  ctx.font = `400 92px ${fonts.display}`;
  ctx.textAlign = "left";
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 14;
  ctx.fillText("BENEFICIOS:", x + 8, 150);
  ctx.shadowBlur = 0;
  const panelH = rowH * items.length + 30;
  roundRect(ctx, x, top, w, panelH, 22);
  ctx.fillStyle = "rgba(10, 16, 40, 0.62)";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.stroke();
  items.slice(0, 5).forEach((text, i) => {
    const cy = top + 15 + rowH * i + rowH / 2;
    // Ícono: círculo con check
    ctx.beginPath();
    ctx.arc(x + 58, cy, 30, 0, Math.PI * 2);
    ctx.fillStyle = brand.color;
    ctx.fill();
    ctx.strokeStyle = inkFor(brand.color);
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
    if (i < items.length - 1) {
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(x + 24, top + 15 + rowH * (i + 1), w - 48, 2);
    }
  });
  ctx.restore();
}

const toBlob = (c: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo crear la imagen"))), "image/jpeg", 0.9));

export type ComposeInput = {
  slot: "principal" | "beneficios" | "uso_1" | "producto" | "uso_2";
  /** Foto generada por la IA (cuadrada). Si no hay, se usa la foto del alumno. */
  ai: ImageBitmap | null;
  photo: ImageBitmap | null;
  recuadro: { linea1: string; linea2: string };
  beneficios: string[];
};

export async function composeImage(input: ComposeInput, brand: Brand, fonts: Fonts) {
  const { c, ctx } = canvas();
  const { slot, ai, photo } = input;

  if (slot === "beneficios") {
    if (ai) cover(ctx, ai, 0, 0, SIZE, SIZE);
    else {
      const g = ctx.createLinearGradient(0, 0, SIZE, SIZE);
      g.addColorStop(0, shade(brand.color, -0.75));
      g.addColorStop(1, shade(brand.color, -0.35));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, SIZE, SIZE);
      if (photo) {
        ctx.save();
        const bg = photoBackground(photo);
        if (bg.light) {
          ctx.shadowColor = "rgba(0,0,0,0.45)";
          ctx.shadowBlur = 40;
          roundRect(ctx, 630, 250, 410, 560, 28);
          ctx.fillStyle = bg.color;
          ctx.fill();
          ctx.shadowBlur = 0;
          contain(ctx, photo, 650, 270, 370, 520);
        } else {
          // Foto oscura (p. ej. la foto premium del producto hecha con IA): tarjeta redondeada con la foto completa.
          ctx.shadowColor = "rgba(0,0,0,0.55)";
          ctx.shadowBlur = 40;
          roundRect(ctx, 630, 250, 410, 560, 28);
          ctx.fillStyle = "#09090b";
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.clip();
          cover(ctx, photo, 630, 250, 410, 560);
        }
        ctx.restore();
      }
    }
    benefitsPanel(ctx, input.beneficios, brand, fonts);
    badge(ctx, SIZE - 175, 175, 135, ["SÚPER", "PROMO"], brand, fonts);
    strip(ctx, brand, fonts, "right");
    return toBlob(c);
  }

  if (ai) cover(ctx, ai, 0, 0, SIZE, SIZE);
  else if (photo) {
    if (slot === "producto") {
      const bg = photoBackground(photo);
      const light = bg.light;
      if (light) {
        ctx.fillStyle = bg.color;
        ctx.fillRect(0, 0, SIZE, SIZE);
      } else {
        const g = ctx.createRadialGradient(SIZE / 2, SIZE / 2, 80, SIZE / 2, SIZE / 2, SIZE * 0.75);
        g.addColorStop(0, "#3f3f46");
        g.addColorStop(1, "#09090b");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, SIZE, SIZE);
      }
      ctx.save();
      if (!light) {
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 50;
      }
      contain(ctx, photo, 140, 140, 800, 760);
      ctx.restore();
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, SIZE, SIZE);
      cover(ctx, photo, 0, 0, SIZE, SIZE);
    }
  } else {
    ctx.fillStyle = shade(brand.color, -0.6);
    ctx.fillRect(0, 0, SIZE, SIZE);
  }

  if (slot === "producto") {
    badge(ctx, SIZE - 175, 175, 135, ["MEGA", "OFERTA"], brand, fonts);
    strip(ctx, brand, fonts, "right");
  } else {
    badge(ctx, 175, 175, 135, ["SÚPER", "PROMO"], brand, fonts);
    if (slot === "principal") titleBox(ctx, input.recuadro.linea1, input.recuadro.linea2, brand, fonts);
    strip(ctx, brand, fonts, "left");
  }
  return toBlob(c);
}

/** Imagen de cierre: logo/nombre de la tienda + «Compra verificada». */
export async function composeTrust(brand: Brand, fonts: Fonts) {
  const { c, ctx } = canvas();
  ctx.fillStyle = brand.color;
  ctx.fillRect(0, 0, SIZE, SIZE);
  const ink = inkFor(brand.color);
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.textAlign = "left";

  // ✔ Compra verificada
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(150, 230, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = brand.color;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(128, 232);
  ctx.lineTo(145, 250);
  ctx.lineTo(176, 214);
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.font = `700 66px ${fonts.body}`;
  ctx.fillText("Compra verificada", 226, 254);

  // Nombre de la tienda como logo
  ctx.textAlign = "center";
  let size = 150;
  const name = brand.storeName.trim() || "Mi Tienda";
  do {
    ctx.font = `700 ${size}px ${fonts.body}`;
    size -= 6;
  } while (ctx.measureText(name).width > SIZE - 160 && size > 50);
  ctx.fillText(name, SIZE / 2, 600);

  // Escudo + «Te contactaremos para confirmar tu compra»
  ctx.save();
  ctx.translate(150, 830);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(0, -62);
  ctx.lineTo(50, -42);
  ctx.lineTo(50, 6);
  ctx.quadraticCurveTo(50, 50, 0, 70);
  ctx.quadraticCurveTo(-50, 50, -50, 6);
  ctx.lineTo(-50, -42);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-20, 2);
  ctx.lineTo(-4, 20);
  ctx.lineTo(24, -14);
  ctx.stroke();
  ctx.restore();
  ctx.textAlign = "left";
  ctx.font = `500 50px ${fonts.body}`;
  ctx.fillText("Te contactaremos para", 236, 815);
  ctx.fillText("confirmar tu compra", 236, 875);
  return toBlob(c);
}
