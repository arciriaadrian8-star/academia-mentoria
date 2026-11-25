"use client";

import "@fontsource/anton/400.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/montserrat/800.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { zipSync } from "fflate";
import {
  AlertTriangle,
  Check,
  Download,
  ExternalLink,
  FileSpreadsheet,
  ImagePlus,
  LayoutTemplate,
  Loader2,
  Palette,
  PenLine,
  ShieldCheck,
  Sparkles,
  Store,
  WandSparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  buildDescriptionHtml,
  buildShopifyCsv,
  DEFAULT_COLOR,
  descriptionText,
  discountPct,
  FINAL_IMAGES,
  fileName,
  imageTexts,
  isHexColor,
  LANDING_BUCKET,
  parseReviews,
  photoPrompt,
  PHOTO_SLOTS,
  type LandingMode,
  type LandingResult,
  type PhotoSlot,
} from "@/lib/landing";
import { CopyButton } from "@/components/CopyButton";
import { PRICE_BLOCK_STEPS, priceBlockLiquid, priceBlockPreview, type PriceBlockOptions } from "@/lib/priceBlock";
import { shrinkImage } from "../shrink";
import { composeImage, inkFor, loadBitmap, type Brand, type Fonts, type Look } from "./compose";

/** Fotos de IA: «despues», «usos» (2×2) y «antes». Las de landings viejas se reaprovechan. */
type AiSlot = "despues" | "usos" | "antes" | "principal" | "uso_1" | "uso_2" | "producto" | "beneficios";

export type StudioProps = {
  landingId: string;
  mode: LandingMode;
  country: string;
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
  /** Escena de entrega compartida para la imagen «Confianza». */
  deliveryUrl: string | null;
  /** Reseñas reales que pegó el alumno (una por línea). */
  reviews: string | null;
  /** Puntos que cuesta rehacer una foto y puntos que le quedan al alumno este mes (null = sin límite). */
  redoCost: number;
  pointsBalance: number | null;
};

type Tab = "landing" | "textos" | "fotos";
const TABS: { id: Tab; label: string; short: string; icon: typeof Store }[] = [
  { id: "landing", label: "Landing", short: "Landing", icon: LayoutTemplate },
  { id: "textos", label: "Textos", short: "Textos", icon: PenLine },
  { id: "fotos", label: "Fotos y prompts", short: "Fotos", icon: WandSparkles },
];
const FIRST_TAB: Record<LandingMode, Tab> = { completa: "landing", rapida: "landing", texto: "textos", prompts: "fotos" };

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
  const reviews = useMemo(() => parseReviews(props.reviews), [props.reviews]);
  // «Reseñas» solo se arma si hay reseñas reales.
  const images = useMemo(() => FINAL_IMAGES.filter((im) => im.kind !== "resenas" || reviews.length > 0), [reviews]);
  const [brand, setBrand] = useState<Brand>(() => ({
    color: isHexColor(props.color) ? props.color : DEFAULT_COLOR,
    storeName: props.storeName || "Mi Tienda",
    freeShipping: !props.offer || /gratis/i.test(props.offer),
    cod: true,
    look: "ganador",
  }));
  const [finals, setFinals] = useState<Record<number, { blob: Blob; url: string }>>({});
  const [composing, setComposing] = useState(true);
  const [busy, setBusy] = useState<"" | "csv" | "zip">("");
  const [error, setError] = useState("");
  const [frameHeight, setFrameHeight] = useState(1600);
  const bitmaps = useRef<{ ai: Partial<Record<AiSlot, ImageBitmap>>; photos: ImageBitmap[]; delivery: ImageBitmap | null } | null>(null);
  const [version, setVersion] = useState(0);
  const [redoing, setRedoing] = useState<PhotoSlot | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<PhotoSlot | null>(null);
  const [notice, setNotice] = useState("");
  const [balance, setBalance] = useState<number | null>(props.pointsBalance);
  const canRedo = balance === null || balance >= props.redoCost;
  const [tab, setTab] = useState<Tab>(FIRST_TAB[props.mode] ?? "landing");
  // Bloque de precio y confianza para Shopify («Liquid personalizado»).
  const [pb, setPb] = useState({ city: "", minDays: 2, maxDays: 7, whatsapp: true, guarantee: true, retracto: /colombia/i.test(props.country) });
  const priceOpts: PriceBlockOptions = useMemo(
    () => ({ ...pb, store: brand.storeName, country: props.country, freeShipping: brand.freeShipping, cod: brand.cod }),
    [pb, brand.storeName, brand.freeShipping, brand.cod, props.country],
  );
  const priceLiquid = useMemo(() => priceBlockLiquid(priceOpts), [priceOpts]);
  const pricePreview = useMemo(() => priceBlockPreview(priceOpts, props.price, props.comparePrice), [priceOpts, props.price, props.comparePrice]);
  // Fotos de fondo que el alumno cambió en esta visita (las aplica aunque las imágenes aún no estén cargadas).
  const overrides = useRef<Partial<Record<PhotoSlot, ImageBitmap>>>({});
  const [baseUrls, setBaseUrls] = useState<Partial<Record<PhotoSlot, string>>>(() => ({
    despues: props.aiUrls.despues ?? props.aiUrls.principal ?? props.aiUrls.uso_1,
    usos: props.aiUrls.usos,
    antes: props.aiUrls.antes,
  }));

  // Dibuja las 8 imágenes finales (y las vuelve a dibujar si cambias el estilo, el color o la franja).
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
          const delivery = props.deliveryUrl ? await loadBitmap(props.deliveryUrl).catch(() => null) : null;
          bitmaps.current = { ai, photos, delivery };
        }
        Object.assign(bitmaps.current.ai, overrides.current);
        const { ai, photos, delivery } = bitmaps.current;
        const pics = {
          despues: ai.despues ?? ai.principal ?? ai.uso_1 ?? null,
          usos: ai.usos ?? null,
          antes: ai.antes ?? null,
          photo: photos[0] ?? null,
          delivery,
        };
        const texts = imageTexts(r);
        const prices = { price: props.price, compare: props.comparePrice, discountPct: discountPct(props.price, props.comparePrice) };
        const next: Record<number, { blob: Blob; url: string }> = {};
        const extra = { beneficios: r.beneficios_imagen ?? [], reviews, recuadro: r.recuadro };
        for (const im of images) {
          const blob = await composeImage(im.kind, texts, pics, prices, brand, FONTS, extra);
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
  }, [brand, props.aiUrls, props.photoUrls, props.deliveryUrl, props.price, props.comparePrice, r, version, images, reviews]);

  /** Cambia una foto de fondo y vuelve a dibujar las imágenes vendedoras. */
  function applyPhoto(slot: PhotoSlot, bitmap: ImageBitmap, url: string) {
    overrides.current[slot] = bitmap;
    if (bitmaps.current) bitmaps.current.ai[slot] = bitmap;
    setBaseUrls((prev) => ({ ...prev, [slot]: url }));
    setVersion((v) => v + 1);
  }

  /** Rehace solo una foto con IA (sin gastar una landing nueva). */
  async function redo(slot: PhotoSlot) {
    setRedoing(slot);
    setError("");
    setNotice("");
    try {
      const supabase = createClient();
      const { data, error: fnError } = await supabase.functions.invoke("makedrop-landing", { body: { id: props.landingId, slot } });
      if (fnError) {
        const detail = await (fnError as { context?: Response }).context?.json?.().catch(() => null);
        throw new Error(detail?.error ?? fnError.message);
      }
      const { data: signed } = await supabase.storage.from(LANDING_BUCKET).createSignedUrl(data.path, 3600);
      if (!signed?.signedUrl) throw new Error("No se pudo cargar la foto nueva");
      applyPhoto(slot, await loadBitmap(signed.signedUrl), signed.signedUrl);
      setBalance(typeof data.balance === "number" ? data.balance : balance === null ? null : balance - props.redoCost);
      setNotice("Listo: la foto nueva ya está en tus imágenes.");
    } catch (e) {
      setError(`No se pudo rehacer la foto: ${(e as Error).message}`);
    } finally {
      setRedoing(null);
    }
  }

  /** Sube una foto que el alumno hizo en Gemini (gratis) y la usa como fondo de sus imágenes vendedoras. */
  async function uploadMine(slot: PhotoSlot, file: File | undefined) {
    if (!file) return;
    setError("");
    setNotice("");
    if (!file.type.startsWith("image/")) return setError("Sube la foto en JPG, PNG o WEBP.");
    setUploadingSlot(slot);
    try {
      const blob = await shrinkImage(file, 1600, 0.9);
      const supabase = createClient();
      const path = `${props.userId}/${props.landingId}/mine-${slot}-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from(LANDING_BUCKET).upload(path, blob, { contentType: "image/jpeg" });
      if (upErr) throw new Error(upErr.message);
      const { error: rpcErr } = await supabase.rpc("set_landing_photo", { p_id: props.landingId, p_slot: slot, p_path: path });
      if (rpcErr) throw new Error(rpcErr.message);
      applyPhoto(slot, await createImageBitmap(blob), URL.createObjectURL(blob));
      setNotice("Listo: tu foto ya está en tus imágenes vendedoras. Revísalas en la pestaña Landing.");
    } catch (e) {
      setError(`No se pudo subir tu foto: ${(e as Error).message}`);
    } finally {
      setUploadingSlot(null);
    }
  }

  const hasGif = Boolean(props.gifUrl);
  const shopifyHtml = useMemo(
    () => buildDescriptionHtml(r, (n) => `/cdn/shop/files/${fileName(code, n)}`, { hasGif, hasReviews: reviews.length > 0, color: brand.color }),
    [r, code, hasGif, brand.color],
  );
  const previewHtml = useMemo(
    () => buildDescriptionHtml(r, (n) => (n === "gif" ? props.gifUrl ?? "" : finals[n]?.url ?? ""), { hasGif, hasReviews: reviews.length > 0, color: brand.color }),
    [r, finals, hasGif, props.gifUrl, brand.color],
  );
  const ready = Object.keys(finals).length === images.length && !composing;

  /** Sube las imágenes finales con su nombre definitivo y devuelve enlaces temporales (7 días) para que Shopify las descargue. */
  async function uploadFinals() {
    const supabase = createClient();
    const base = `${props.userId}/${props.landingId}`;
    const items: { path: string; alt: string }[] = [];
    for (const im of images) {
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
      for (const im of images) files[fileName(code, im.n)] = new Uint8Array(await finals[im.n].blob.arrayBuffer());
      if (props.gifUrl) files[fileName(code, "gif")] = new Uint8Array(await (await fetch(props.gifUrl)).arrayBuffer());
      const enc = new TextEncoder();
      files["descripcion-shopify.html"] = enc.encode(shopifyHtml);
      files["bloque-precio-shopify.liquid"] = enc.encode(priceLiquid);
      files["como-usar-bloque-precio.txt"] = enc.encode(
        ["BLOQUE DE PRECIO Y CONFIANZA (Liquid personalizado)", ...PRICE_BLOCK_STEPS.map((x, i) => `${i + 1}. ${x}`)].join("\n"),
      );
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

  const textCards = [
    { label: "Título del producto", text: r.titulo },
    { label: "Barra de anuncio", text: r.barra_anuncio },
    { label: "Título SEO (Google)", text: r.seo.titulo },
    { label: "Descripción SEO (Google)", text: r.seo.descripcion },
  ];
  const plainDescription = descriptionText(r);
  const missingPhotos = PHOTO_SLOTS.filter((sl) => !baseUrls[sl.id]).length;

  const messages = (
    <>
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && (
        <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <Check className="size-4 shrink-0" /> {notice}
        </p>
      )}
    </>
  );

  return (
    <div className="space-y-5">
      {/* Pestañas */}
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-zinc-200 bg-white p-1 shadow-sm" role="tablist">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition ${
                active ? "bg-brand text-white shadow" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              <Icon className="size-4" />
              <span className="sm:hidden">{t.short}</span>
              <span className="hidden sm:inline">{t.label}</span>
              {t.id === "fotos" && missingPhotos > 0 && (
                <span className={`chip ${active ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"}`}>{missingPhotos}</span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "landing" && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          {/* Vista previa tipo página de producto */}
          <div className="space-y-4">
            {props.mode !== "completa" && missingPhotos > 0 && (
              <button
                type="button"
                onClick={() => setTab("fotos")}
                className="flex w-full items-center gap-3 rounded-2xl border border-brand/20 bg-brand/5 p-4 text-left text-sm text-zinc-700 transition hover:bg-brand/10"
              >
                <WandSparkles className="size-5 shrink-0 text-brand" />
                <span>
                  <strong className="text-zinc-900">Tu landing usa la foto de tu producto.</strong> Para que se vea como la completa, haz tus fotos gratis en
                  Gemini con los prompts y súbelas aquí.
                </span>
              </button>
            )}
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
                  <div className="mt-2 grid grid-cols-5 gap-1.5">
                    {images.map((im) => (
                      <div key={im.n} className="relative">
                        {finals[im.n] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={finals[im.n].url} alt={im.label} title={im.label} className="aspect-square w-full rounded-md object-cover" />
                        ) : (
                          <div className="aspect-square animate-pulse rounded-md bg-zinc-100" />
                        )}
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => setTab("fotos")} className="mt-2 text-xs font-semibold text-brand hover:underline">
                    ¿Una foto no quedó bien? Cámbiala aquí →
                  </button>
                </div>
                <div>
                  <h2 className="text-lg leading-snug font-bold sm:text-xl">{r.titulo}</h2>
                  <div className="mt-3 origin-top-left [zoom:0.82]" dangerouslySetInnerHTML={{ __html: pricePreview }} />
                  <div className="mt-2 rounded-xl border-2 border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-500">
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
          </div>

          {/* Panel de descarga */}
          <aside className="space-y-4 lg:sticky lg:top-32">
            {r.aviso_imagenes && (
              <div className="card flex gap-2 border-l-4 border-l-amber-400 p-4 text-sm text-zinc-700">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                <p>{r.aviso_imagenes}</p>
              </div>
            )}

            <section className="card overflow-hidden">
              <div className="border-b border-zinc-100 bg-gradient-to-r from-brand/10 to-transparent px-5 py-3">
                <h2 className="flex items-center gap-2 font-semibold"><Store className="size-4 text-brand" /> Llévala a Shopify</h2>
              </div>
              <div className="space-y-3 p-5">
                <button type="button" onClick={downloadCsv} disabled={!ready || busy !== ""} className="btn btn-primary w-full py-3">
                  {busy === "csv" ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
                  {busy === "csv" ? "Preparando archivo..." : "Descargar archivo para Shopify"}
                </button>
                <ol className="space-y-2 text-sm text-zinc-600">
                  {[
                    <>En Shopify entra a <strong>Productos → Importar</strong> y sube el archivo.</>,
                    <>Se crea el producto en <strong>borrador</strong> con título, precio, imágenes y toda la landing.</>,
                    <>Ábrelo, revísalo, activa el botón de <strong>Releasit</strong> y cámbialo a <strong>Activo</strong>.</>,
                    <>Pega la barra de anuncio en <strong>Tienda online → Personalizar</strong>.</>,
                  ].map((step, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-bold text-zinc-700">{i + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                <p className="text-xs text-zinc-500">Importa el archivo dentro de los próximos 7 días (si pasa más tiempo, descárgalo de nuevo).</p>
                <button type="button" onClick={downloadZip} disabled={!ready || busy !== ""} className="btn btn-secondary w-full">
                  {busy === "zip" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                  Descargar imágenes y textos (ZIP)
                </button>
                {messages}
              </div>
            </section>

            <section className="card space-y-3 p-5">
              <h2 className="flex items-center gap-2 font-semibold"><Palette className="size-4 text-brand" /> Ajusta las imágenes</h2>
              <div>
                <label className="label" htmlFor="md-store">Nombre de tu tienda</label>
                <input id="md-store" className="input" maxLength={40} value={brand.storeName} onChange={(e) => setBrand({ ...brand, storeName: e.target.value })} />
              </div>
              <div>
                <span className="label">Estilo de las imágenes</span>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: "ganador", label: "Colores ganadores", hint: "Amarillo, rojo y naranja" },
                    { id: "marca", label: "Mi color", hint: "Color de tu tienda" },
                  ] as { id: Look; label: string; hint: string }[]).map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setBrand({ ...brand, look: o.id })}
                      className={`rounded-xl border p-2 text-left text-sm transition ${brand.look === o.id ? "border-brand bg-brand/5 font-semibold ring-2 ring-brand/20" : "border-zinc-200 hover:bg-zinc-50"}`}
                    >
                      {o.label}
                      <span className="block text-xs font-normal text-zinc-500">{o.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input type="color" aria-label="Color de tu tienda" value={brand.color} onChange={(e) => setBrand({ ...brand, color: e.target.value })} className="h-10 w-14 cursor-pointer rounded-lg border border-zinc-200" />
                <span className="text-sm text-zinc-600">Color de tu tienda (estilo «Mi color» y detalles de la descripción)</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={brand.freeShipping} onChange={(e) => setBrand({ ...brand, freeShipping: e.target.checked })} /> Envío gratis
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={brand.cod} onChange={(e) => setBrand({ ...brand, cod: e.target.checked })} /> Pago contra entrega
                </label>
              </div>
              {composing && <p className="flex items-center gap-2 text-xs text-zinc-500"><Loader2 className="size-3.5 animate-spin" /> Dibujando imágenes…</p>}
            </section>

            <section className="card space-y-3 p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4 text-brand" /> Bloque de precio</h2>
                <CopyButton text={priceLiquid} label="Copiar código" />
              </div>
              <p className="text-xs text-zinc-500">
                Precio, descuento y «Compra segura» como en la vista previa. Se pega una sola vez en tu tema y sirve para todos tus productos (también va en el ZIP).
              </p>
              <div>
                <label className="label" htmlFor="pb-city">Ciudad de despacho</label>
                <input
                  id="pb-city"
                  className="input"
                  maxLength={40}
                  placeholder={`Vacío = «a todo ${props.country}»`}
                  value={pb.city}
                  onChange={(e) => setPb({ ...pb, city: e.target.value })}
                />
              </div>
              <div>
                <span className="label">Se entrega entre (días)</span>
                <div className="flex items-center gap-2 text-sm text-zinc-600">
                  <input type="number" min={0} max={30} aria-label="Días mínimos" className="input w-20" value={pb.minDays} onChange={(e) => setPb({ ...pb, minDays: Number(e.target.value) })} />
                  y
                  <input type="number" min={0} max={45} aria-label="Días máximos" className="input w-20" value={pb.maxDays} onChange={(e) => setPb({ ...pb, maxDays: Number(e.target.value) })} />
                  días
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={pb.whatsapp} onChange={(e) => setPb({ ...pb, whatsapp: e.target.checked })} /> Confirmación por WhatsApp
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={pb.guarantee} onChange={(e) => setPb({ ...pb, guarantee: e.target.checked })} /> Compra garantizada
                </label>
                {/colombia/i.test(props.country) && (
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={pb.retracto} onChange={(e) => setPb({ ...pb, retracto: e.target.checked })} /> Derecho de retracto
                  </label>
                )}
              </div>
              <ol className="space-y-1.5 text-xs text-zinc-600">
                {PRICE_BLOCK_STEPS.map((step, i) => (
                  <li key={step} className="flex gap-2">
                    <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-700">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          </aside>
        </div>
      )}

      {tab === "textos" && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-5 py-3">
              <h2 className="font-semibold">Descripción de la landing</h2>
              <div className="flex flex-wrap gap-2">
                <CopyButton text={plainDescription} label="Copiar texto" />
                <CopyButton text={shopifyHtml} label="Copiar HTML" />
              </div>
            </div>
            <div className="space-y-5 p-5 text-[15px] leading-relaxed text-zinc-800">
              {[
                { b: r.bloques.dolor, body: <p>{r.bloques.dolor.texto}</p> },
                { b: r.bloques.promesa, body: <p>{r.bloques.promesa.texto}</p> },
                {
                  b: r.bloques.formula,
                  body: (
                    <ul className="space-y-1">
                      {r.bloques.formula.beneficios.map((x) => (
                        <li key={x.nombre}>✅ <strong>{x.nombre}:</strong> {x.texto}</li>
                      ))}
                    </ul>
                  ),
                },
                { b: r.bloques.habito, body: <p>{r.bloques.habito.texto}</p> },
                {
                  b: r.bloques.uso,
                  body: (
                    <ol className="list-decimal space-y-1 pl-5">
                      {r.bloques.uso.pasos.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ol>
                  ),
                },
                {
                  b: r.bloques.cierre,
                  body: (
                    <>
                      <p>{r.bloques.cierre.texto}</p>
                      <p className="mt-1 font-semibold">{r.bloques.cierre.llamado}</p>
                    </>
                  ),
                },
              ].map(({ b, body }) => (
                <div key={b.titulo}>
                  <h3 className="mb-1 text-lg font-bold text-zinc-900">{b.emoji} {b.titulo}</h3>
                  {body}
                </div>
              ))}
              <div className="rounded-xl bg-zinc-50 p-4">
                <h3 className="mb-2 text-lg font-bold text-zinc-900">{r.faq.titulo}</h3>
                <div className="space-y-3">
                  {r.faq.items.map((f) => (
                    <div key={f.pregunta}>
                      <p className="font-semibold">{f.pregunta}</p>
                      <p className="text-zinc-600">{f.respuesta}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-3 lg:sticky lg:top-32">
            {textCards.map((t) => (
              <div key={t.label} className="card p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">{t.label}</p>
                  <CopyButton text={t.text} />
                </div>
                <p className="mt-1.5 text-sm text-zinc-800">{t.text}</p>
              </div>
            ))}
            <div className="card p-4 text-xs text-zinc-500">
              <p>
                <strong className="text-zinc-700">Copiar HTML</strong> sirve para pegar la descripción con imágenes en Shopify (botón «&lt;&gt;» del editor). Sube a ese
                producto las imágenes del ZIP sin cambiarles el nombre para que aparezcan.
              </p>
              <p className="mt-2">
                <strong className="text-zinc-700">Copiar texto</strong> sirve para cualquier lugar: el editor normal de Shopify, WhatsApp o tus anuncios.
              </p>
            </div>
          </aside>
        </div>
      )}

      {tab === "fotos" && (
        <div className="space-y-5">
          <section className="card overflow-hidden">
            <div className="grid gap-4 bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <h2 className="flex items-center gap-2 font-bold text-zinc-900"><Sparkles className="size-4 text-brand" /> Haz tus fotos gratis en Gemini</h2>
                <ol className="mt-2 grid gap-1.5 text-sm text-zinc-700 sm:grid-cols-2">
                  {["Abre Gemini y elige «Crear imagen».", "Adjunta la foto de tu producto.", "Copia el prompt de la foto y pégalo.", "Descarga la imagen y súbela aquí."].map((step, i) => (
                    <li key={step} className="flex gap-2">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
              <a href="https://gemini.google.com/app" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                Abrir Gemini <ExternalLink className="size-4" />
              </a>
            </div>
            <p className="border-t border-zinc-100 px-5 py-3 text-xs text-zinc-500">
              Las imágenes vendedoras (titulares, precio, sellos, antes/después) se arman solas con tus fotos. Si no subes una foto, se usa la de tu producto.
              {balance !== null && ` También puedes hacerla con nuestra IA por ${props.redoCost} puntos (te quedan ${balance}).`}
            </p>
          </section>
          {messages}

          <div className="grid gap-4 lg:grid-cols-3">
            {PHOTO_SLOTS.map((sl) => {
              const url = baseUrls[sl.id];
              const working = uploadingSlot === sl.id || redoing === sl.id;
              return (
                <section key={sl.id} className="card flex flex-col overflow-hidden">
                  <div className="relative aspect-square bg-zinc-100">
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt={sl.title} className="size-full object-cover" />
                    ) : props.photoUrls[0] ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={props.photoUrls[0]} alt="Foto de tu producto" className="size-full object-contain p-6 opacity-60" />
                        <span className="absolute inset-x-3 bottom-3 rounded-lg bg-white/90 px-2 py-1 text-center text-xs font-semibold text-zinc-600 shadow">
                          Por ahora usa la foto de tu producto
                        </span>
                      </>
                    ) : null}
                    {working && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80 text-sm font-semibold text-zinc-700">
                        <Loader2 className="size-6 animate-spin text-brand" />
                        {uploadingSlot === sl.id ? "Subiendo tu foto…" : "La IA está haciendo la foto…"}
                      </div>
                    )}
                    {url && !working && (
                      <span className="absolute top-2 left-2 chip bg-emerald-500 text-white shadow"><Check className="size-3" /> Lista</span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div>
                      <h3 className="font-bold text-zinc-900">{sl.title}</h3>
                      <p className="text-sm text-zinc-600">{sl.what}</p>
                      <p className="text-xs text-zinc-400">Se usa en: {sl.usedIn}</p>
                    </div>
                    <div className="rounded-xl bg-zinc-50 text-xs">
                      <div className="flex items-center justify-between gap-2 px-3 py-2">
                        <span className="font-semibold text-zinc-700">Prompt para Gemini</span>
                        <CopyButton text={photoPrompt(sl.id, r)} label="Copiar prompt" />
                      </div>
                      <details className="group border-t border-zinc-200/70">
                        <summary className="cursor-pointer list-none px-3 py-1.5 text-zinc-500 hover:text-zinc-800">Ver el prompt completo</summary>
                        <pre className="max-h-48 overflow-auto px-3 pb-3 font-sans whitespace-pre-wrap text-zinc-600">{photoPrompt(sl.id, r)}</pre>
                      </details>
                    </div>
                    <div className="mt-auto grid grid-cols-2 gap-2">
                      <label className={`btn btn-secondary btn-sm cursor-pointer ${working ? "pointer-events-none opacity-50" : ""}`}>
                        <ImagePlus className="size-3.5" /> Subir mi foto
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="sr-only"
                          disabled={working}
                          onChange={(e) => {
                            uploadMine(sl.id, e.target.files?.[0]);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => redo(sl.id)}
                        disabled={redoing !== null || uploadingSlot !== null || !canRedo}
                        className="btn btn-secondary btn-sm"
                        title={canRedo ? `Hacer esta foto con la IA de la academia (${props.redoCost} puntos)` : "No te alcanzan los puntos este mes"}
                      >
                        <WandSparkles className="size-3.5" /> {url ? "Rehacer" : "Hacer"} con IA
                      </button>
                    </div>
                    {balance !== null && <p className="-mt-1 text-right text-[11px] text-zinc-400">Con IA: {props.redoCost} pts</p>}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
