"use client";

import "@fontsource/anton/400.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/montserrat/800.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { zipSync } from "fflate";
import { AlertTriangle, Download, FileSpreadsheet, Loader2, Palette, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { buildDescriptionHtml, buildShopifyCsv, DEFAULT_COLOR, FINAL_IMAGES, fileName, isHexColor, LANDING_BUCKET, type LandingResult } from "@/lib/landing";
import { CopyButton } from "@/components/CopyButton";
import { composeImage, composeTrust, inkFor, loadBitmap, type Brand, type Fonts } from "./compose";

type AiSlot = "principal" | "beneficios" | "uso_1" | "producto" | "uso_2";

export type StudioProps = {
  landingId: string;
  userId: string;
  code: string;
  result: LandingResult;
  price: string;
  comparePrice: string | null;
  offer: string | null;
  storeName: string | null;
  color: string | null;
  aiUrls: Partial<Record<AiSlot, string>>;
  photoUrls: string[];
  gifUrl: string | null;
};

const FONTS: Fonts = { display: "Anton, Impact, sans-serif", body: "Montserrat, Arial, sans-serif" };

function download(name: string, data: Blob) {
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const PREVIEW_CSS = `body{margin:0;padding:8px 4px 24px;font-family:Montserrat,Arial,sans-serif;color:#18181b;line-height:1.55;font-size:16px;background:#fff}
h1{font-size:22px;line-height:1.25;margin:28px 0 10px}h2{font-size:21px;margin:30px 0 10px}p{margin:8px 0}img{max-width:100%}`;

export function LandingStudio(props: StudioProps) {
  const { result: r, code } = props;
  const [brand, setBrand] = useState<Brand>(() => ({
    color: isHexColor(props.color) ? props.color : DEFAULT_COLOR,
    storeName: props.storeName || "Mi Tienda",
    freeShipping: !props.offer || /gratis/i.test(props.offer),
    cod: true,
  }));
  const [finals, setFinals] = useState<Record<number, { blob: Blob; url: string }>>({});
  const [composing, setComposing] = useState(true);
  const [busy, setBusy] = useState<"" | "csv" | "zip">("");
  const [error, setError] = useState("");
  const [frameHeight, setFrameHeight] = useState(1600);
  const bitmaps = useRef<{ ai: Partial<Record<AiSlot, ImageBitmap>>; photos: ImageBitmap[] } | null>(null);

  // Dibuja las 6 imágenes finales (y las vuelve a dibujar si cambias color, tienda o franja).
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setComposing(true);
      setError("");
      try {
        await Promise.all([document.fonts.load(`400 80px Anton`), document.fonts.load(`800 40px Montserrat`), document.fonts.load(`600 30px Montserrat`)]);
        if (!bitmaps.current) {
          const ai: Partial<Record<AiSlot, ImageBitmap>> = {};
          await Promise.all(
            Object.entries(props.aiUrls).map(async ([slot, url]) => {
              if (url) ai[slot as AiSlot] = await loadBitmap(url).catch(() => undefined as unknown as ImageBitmap);
            }),
          );
          const photos = (await Promise.all(props.photoUrls.map((u) => loadBitmap(u).catch(() => null)))).filter(Boolean) as ImageBitmap[];
          bitmaps.current = { ai, photos };
        }
        const { ai, photos } = bitmaps.current;
        const next: Record<number, { blob: Blob; url: string }> = {};
        for (const [i, im] of FINAL_IMAGES.entries()) {
          const blob =
            im.slot === "confianza"
              ? await composeTrust(brand, FONTS)
              : await composeImage(
                  { slot: im.slot, ai: ai[im.slot] ?? null, photo: photos.length ? photos[i % photos.length] : null, recuadro: r.recuadro, beneficios: r.beneficios_imagen },
                  brand,
                  FONTS,
                );
          next[im.n] = { blob, url: URL.createObjectURL(blob) };
        }
        if (cancelled) return;
        setFinals((prev) => {
          Object.values(prev).forEach((f) => URL.revokeObjectURL(f.url));
          return next;
        });
      } catch (e) {
        if (!cancelled) setError(`No se pudieron preparar las imágenes: ${(e as Error).message}`);
      } finally {
        if (!cancelled) setComposing(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [brand, props.aiUrls, props.photoUrls, r.recuadro, r.beneficios_imagen]);

  const hasGif = Boolean(props.gifUrl);
  const shopifyHtml = useMemo(
    () => buildDescriptionHtml(r, (n) => `/cdn/shop/files/${fileName(code, n)}`, { hasGif, color: brand.color }),
    [r, code, hasGif, brand.color],
  );
  const previewHtml = useMemo(
    () => buildDescriptionHtml(r, (n) => (n === "gif" ? props.gifUrl ?? "" : finals[n]?.url ?? ""), { hasGif, color: brand.color }),
    [r, finals, hasGif, props.gifUrl, brand.color],
  );
  const ready = Object.keys(finals).length === FINAL_IMAGES.length && !composing;

  /** Sube las imágenes finales con su nombre definitivo y devuelve enlaces temporales (7 días) para que Shopify las descargue. */
  async function uploadFinals() {
    const supabase = createClient();
    const base = `${props.userId}/${props.landingId}`;
    const items: { path: string; alt: string }[] = [];
    for (const im of FINAL_IMAGES) {
      const path = `${base}/${fileName(code, im.n)}`;
      const { error: upErr } = await supabase.storage.from(LANDING_BUCKET).upload(path, finals[im.n].blob, { contentType: "image/jpeg", upsert: true });
      if (upErr) throw new Error(upErr.message);
      items.push({ path, alt: `${r.nombre_marca} · ${im.label}` });
    }
    if (props.gifUrl) {
      const gif = await (await fetch(props.gifUrl)).blob();
      const path = `${base}/${fileName(code, "gif")}`;
      const { error: upErr } = await supabase.storage.from(LANDING_BUCKET).upload(path, gif, { contentType: "image/gif", upsert: true });
      if (upErr) throw new Error(upErr.message);
      items.push({ path, alt: `${r.nombre_marca} en uso` });
    }
    const { data, error: signErr } = await supabase.storage.from(LANDING_BUCKET).createSignedUrls(items.map((i) => i.path), 7 * 24 * 3600);
    if (signErr || !data) throw new Error(signErr?.message ?? "No se pudieron crear los enlaces");
    return items.map((it, i) => {
      const url = data[i]?.signedUrl;
      if (!url) throw new Error("No se pudo crear el enlace de una imagen");
      return { url, alt: it.alt };
    });
  }

  async function downloadCsv() {
    setBusy("csv");
    setError("");
    try {
      const images = await uploadFinals();
      const csv = buildShopifyCsv({
        code,
        result: r,
        bodyHtml: shopifyHtml,
        vendor: brand.storeName,
        price: props.price,
        comparePrice: props.comparePrice,
        images,
      });
      download(`shopify-${fileName(code, 1).replace(/-1\.jpg$/, "")}.csv`, new Blob([csv], { type: "text/csv;charset=utf-8" }));
    } catch (e) {
      setError(`No se pudo crear el archivo: ${(e as Error).message}`);
    } finally {
      setBusy("");
    }
  }

  async function downloadZip() {
    setBusy("zip");
    setError("");
    try {
      const files: Record<string, Uint8Array> = {};
      for (const im of FINAL_IMAGES) files[fileName(code, im.n)] = new Uint8Array(await finals[im.n].blob.arrayBuffer());
      if (props.gifUrl) files[fileName(code, "gif")] = new Uint8Array(await (await fetch(props.gifUrl)).arrayBuffer());
      const enc = new TextEncoder();
      files["descripcion-shopify.html"] = enc.encode(shopifyHtml);
      files["textos.txt"] = enc.encode(
        [`TÍTULO:\n${r.titulo}`, `BARRA DE ANUNCIO:\n${r.barra_anuncio}`, `SEO TÍTULO:\n${r.seo.titulo}`, `SEO DESCRIPCIÓN:\n${r.seo.descripcion}`].join("\n\n"),
      );
      download(`landing-${code}.zip`, new Blob([zipSync(files, { level: 0 }) as Uint8Array<ArrayBuffer>], { type: "application/zip" }));
    } catch (e) {
      setError(`No se pudo crear el ZIP: ${(e as Error).message}`);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      {/* Vista previa tipo página de producto */}
      <div className="card overflow-hidden">
        <div className="px-4 py-2 text-center text-xs font-bold sm:text-sm" style={{ background: brand.color, color: inkFor(brand.color) }}>
          {r.barra_anuncio}
        </div>
        <div className="grid gap-5 p-4 sm:grid-cols-2 sm:p-6">
          <div>
            <div className="aspect-square overflow-hidden rounded-xl bg-zinc-100">
              {finals[1] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={finals[1].url} alt="Imagen principal" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center"><Loader2 className="size-8 animate-spin text-zinc-400" /></div>
              )}
            </div>
            <div className="mt-2 grid grid-cols-6 gap-1.5">
              {FINAL_IMAGES.map((im) =>
                finals[im.n] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={im.n} src={finals[im.n].url} alt={im.label} className="aspect-square w-full rounded-md object-cover" />
                ) : (
                  <div key={im.n} className="aspect-square rounded-md bg-zinc-100" />
                ),
              )}
            </div>
          </div>
          <div>
            <h2 className="text-lg leading-snug font-bold sm:text-xl">{r.titulo}</h2>
            <p className="mt-3 flex flex-wrap items-baseline gap-2">
              <span className="text-2xl font-extrabold">{props.price}</span>
              {props.comparePrice && <span className="text-zinc-400 line-through">{props.comparePrice}</span>}
            </p>
            <div className="mt-4 rounded-xl border-2 border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-500">
              Aquí va el botón de compra de <strong>Releasit</strong>
            </div>
          </div>
        </div>
        <iframe
          title="Descripción de la landing"
          className="block w-full border-t border-zinc-100"
          style={{ height: frameHeight }}
          srcDoc={`<!doctype html><html><head><meta charset="utf-8"><style>${PREVIEW_CSS}</style></head><body>${previewHtml}</body></html>`}
          onLoad={(e) => {
            const doc = e.currentTarget.contentDocument;
            if (!doc) return;
            const fit = () => setFrameHeight(doc.documentElement.scrollHeight + 8);
            fit();
            doc.querySelectorAll("img").forEach((im) => im.addEventListener("load", fit));
          }}
        />
      </div>

      {/* Panel de descarga */}
      <aside className="space-y-4 lg:sticky lg:top-32">
        {r.aviso_imagenes && (
          <div className="card flex gap-2 border-l-4 border-l-amber-400 p-4 text-sm text-zinc-700">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <p>{r.aviso_imagenes}</p>
          </div>
        )}

        <section className="card space-y-3 p-5">
          <h2 className="flex items-center gap-2 font-semibold"><Store className="size-4 text-brand" /> Llévala a Shopify</h2>
          <button type="button" onClick={downloadCsv} disabled={!ready || busy !== ""} className="btn btn-primary w-full">
            {busy === "csv" ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
            {busy === "csv" ? "Preparando archivo..." : "Descargar archivo para Shopify"}
          </button>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-zinc-600">
            <li>En Shopify entra a <strong>Productos → Importar</strong> y sube el archivo.</li>
            <li>Se crea el producto en <strong>borrador</strong> con título, precio, imágenes y toda la landing.</li>
            <li>Ábrelo, revísalo, activa el botón de <strong>Releasit</strong> y cámbialo a <strong>Activo</strong>.</li>
            <li>Pega la barra de anuncio en <strong>Tienda online → Personalizar</strong>.</li>
          </ol>
          <p className="text-xs text-zinc-500">Importa el archivo dentro de los próximos 7 días (si pasa más tiempo, descárgalo de nuevo).</p>
          <button type="button" onClick={downloadZip} disabled={!ready || busy !== ""} className="btn btn-secondary w-full">
            {busy === "zip" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Descargar imágenes y textos (ZIP)
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="flex items-center gap-2 font-semibold"><Palette className="size-4 text-brand" /> Ajusta las imágenes</h2>
          <div>
            <label className="label" htmlFor="md-store">Nombre de tu tienda</label>
            <input id="md-store" className="input" maxLength={40} value={brand.storeName} onChange={(e) => setBrand({ ...brand, storeName: e.target.value })} />
          </div>
          <div className="flex items-center gap-3">
            <input type="color" aria-label="Color de los sellos" value={brand.color} onChange={(e) => setBrand({ ...brand, color: e.target.value })} className="h-10 w-14 cursor-pointer rounded-lg border border-zinc-200" />
            <span className="text-sm text-zinc-600">Color de tu página (sellos, franjas y detalles)</span>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={brand.freeShipping} onChange={(e) => setBrand({ ...brand, freeShipping: e.target.checked })} /> Envío gratis
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={brand.cod} onChange={(e) => setBrand({ ...brand, cod: e.target.checked })} /> Pago contra entrega
          </label>
          {composing && <p className="flex items-center gap-2 text-xs text-zinc-500"><Loader2 className="size-3.5 animate-spin" /> Dibujando imágenes…</p>}
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">Copiar textos</h2>
          {[
            { label: "Título", text: r.titulo },
            { label: "Barra de anuncio", text: r.barra_anuncio },
            { label: "Título SEO", text: r.seo.titulo },
            { label: "Descripción SEO", text: r.seo.descripcion },
          ].map((t) => (
            <div key={t.label} className="rounded-xl bg-zinc-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-zinc-500">{t.label.toUpperCase()}</p>
                <CopyButton text={t.text} />
              </div>
              <p className="mt-1 text-sm text-zinc-800">{t.text}</p>
            </div>
          ))}
          <div className="flex items-center justify-between gap-2 rounded-xl bg-zinc-50 p-3">
            <p className="text-xs font-semibold text-zinc-500">DESCRIPCIÓN (HTML)</p>
            <CopyButton text={shopifyHtml} />
          </div>
          <p className="text-xs text-zinc-500">
            Si pegas la descripción a mano, sube a ese producto las imágenes del ZIP sin cambiarles el nombre para que aparezcan.
          </p>
        </section>
      </aside>
    </div>
  );
}
