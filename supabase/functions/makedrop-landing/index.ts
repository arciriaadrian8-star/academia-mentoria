// MakeDrop Landing: genera con Gemini el texto completo de una landing para Shopify
// (estructura definitiva + preguntas frecuentes) y 3 fotos con IA (máx. ~COP 575 por landing) para las
// 7 imágenes vendedoras estilo Pidelisto (titular arriba, precio abajo):
//   «despues» (persona feliz con el producto) y «usos» (cuadrícula 2×2 en UNA imagen) en Nano Banana 2,
//   «antes» (el problema, sin el producto) en Nano Banana económico.
//   Franjas, titulares, precio, sellos, ANTES/DESPUÉS, ✗/✓ e íconos se dibujan con código en el navegador.
//   La escena de entrega de «Confianza» se genera UNA sola vez y la comparten todas las landings.
// POST { id } con el JWT del alumno. Responde 202 y sigue en segundo plano en 2 fases:
//   "text"   → escribe todos los textos y las escenas de cada foto
//   "images" → genera las 3 fotos tomando como referencia la foto del producto del alumno
// POST { id, slot } con el JWT del alumno: rehace solo esa foto.
// Puntos de IA: crear la landing y rehacer una foto descuentan puntos de la bolsa mensual del alumno
// (función spend_points). Si la IA falla, los puntos se devuelven.
// POST { phase: "shared" }: crea la escena de entrega compartida solo si todavía no existe.
// Los sellos, franjas y la lista de beneficios se dibujan después en el navegador del alumno.
import { createClient } from "npm:@supabase/supabase-js@2";

const GEMINI = "https://generativelanguage.googleapis.com";
const key = () => (Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("GEMINI_KEY") ?? Deno.env.get("GOOGLE_API_KEY") ?? "").trim();
const TEXT_MODELS = [Deno.env.get("GEMINI_MODEL"), "gemini-flash-latest", "gemini-2.5-flash", "gemini-flash-lite-latest", "gemini-2.5-flash-lite"].filter(Boolean) as string[];
const IMAGE_MODELS = [Deno.env.get("GEMINI_IMAGE_MODEL"), "gemini-3.1-flash-image-preview", "gemini-2.5-flash-image"].filter(Boolean) as string[];
const NANO_2 = "gemini-3.1-flash-image-preview";
const NANO_ECO = "gemini-2.5-flash-image";
const BUCKET = "makedrop";
const SLOTS = ["despues", "usos", "antes"] as const;
const SHARED_DELIVERY = "_shared/entrega.png";
type Slot = (typeof SLOTS)[number];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const str = { type: "string" };
const block = (extra: Record<string, unknown> = {}, required: string[] = []) => ({
  type: "object",
  properties: { emoji: str, titulo: str, ...extra },
  required: ["emoji", "titulo", ...required],
});

const SCHEMA = {
  type: "object",
  properties: {
    titulo: str,
    nombre_marca: str,
    barra_anuncio: str,
    recuadro: { type: "object", properties: { linea1: str, linea2: str }, required: ["linea1", "linea2"] },
    beneficios_imagen: { type: "array", items: str },
    bloques: {
      type: "object",
      properties: {
        dolor: block({ texto: str }, ["texto"]),
        promesa: block({ texto: str }, ["texto"]),
        formula: block(
          { beneficios: { type: "array", items: { type: "object", properties: { nombre: str, texto: str }, required: ["nombre", "texto"] } } },
          ["beneficios"],
        ),
        habito: block({ texto: str }, ["texto"]),
        uso: block({ pasos: { type: "array", items: str } }, ["pasos"]),
        cierre: block({ texto: str, llamado: str }, ["texto", "llamado"]),
      },
      required: ["dolor", "promesa", "formula", "habito", "uso", "cierre"],
    },
    faq: {
      type: "object",
      properties: {
        titulo: str,
        items: { type: "array", items: { type: "object", properties: { pregunta: str, respuesta: str }, required: ["pregunta", "respuesta"] } },
      },
      required: ["titulo", "items"],
    },
    seo: { type: "object", properties: { titulo: str, descripcion: str }, required: ["titulo", "descripcion"] },
    tipo_producto: str,
    etiquetas: { type: "array", items: str },
    producto_visual: str,
    persona: str,
    escenas: {
      type: "object",
      properties: { despues: str, usos: str, antes: str },
      required: ["despues", "usos", "antes"],
    },
    imagenes: {
      type: "object",
      properties: {
        nombre_corto: str,
        titulares: {
          type: "object",
          properties: { oferta: str, antes_despues: str, que_llega: str, usos: str, comparacion: str, aspiracional: str, confianza: str },
          required: ["oferta", "antes_despues", "que_llega", "usos", "comparacion", "aspiracional", "confianza"],
        },
        aspiracional_sub: str,
        usos_etiquetas: { type: "array", items: str },
        que_llega_items: { type: "array", items: str },
        comparacion: {
          type: "object",
          properties: { sin_titulo: str, sin_texto: str, con_titulo: str, con_texto: str },
          required: ["sin_titulo", "sin_texto", "con_titulo", "con_texto"],
        },
      },
      required: ["nombre_corto", "titulares", "aspiracional_sub", "usos_etiquetas", "que_llega_items", "comparacion"],
    },
  },
  required: ["titulo", "nombre_marca", "barra_anuncio", "recuadro", "beneficios_imagen", "bloques", "faq", "seo", "tipo_producto", "etiquetas", "producto_visual", "persona", "escenas", "imagenes"],
};

type Row = Record<string, unknown> & {
  id: string;
  user_id: string;
  product: string;
  description: string;
  country: string;
  price: string;
  compare_price: string | null;
  offer: string | null;
  audience: string | null;
  store_name: string | null;
  reviews: string | null;
  photo_paths: string[];
  status: string;
  result: Record<string, unknown> | null;
};

function buildPrompt(r: Row, hasPhotos: boolean) {
  return `Eres el mejor copywriter de e-commerce CONTRA ENTREGA de Latinoamérica (Shopify + anuncios en Meta y TikTok). Escribes landings que convierten clientes fríos en compradores: hablas como un amigo, no como un vendedor; muestras el cambio real en su cuerpo, su casa o su vida; y quitas todos los miedos a comprar.
${hasPhotos ? "Las imágenes adjuntas son fotos REALES del producto del alumno: míralas con atención para describirlo con exactitud." : "No hay foto del producto: imagínalo de forma realista a partir de la descripción."}

PRODUCTO DEL ALUMNO
- Nombre: ${r.product}
- Descripción: ${r.description}
- País donde vende: ${r.country} (usa su vocabulario y su moneda)
- Precio hoy: ${r.price}${r.compare_price ? ` · Precio antes: ${r.compare_price}` : ""}
- Oferta: ${r.offer || "envío gratis + pago contra entrega"}
- Cliente ideal: ${r.audience || "decídelo tú según el producto"}
- Tienda: ${r.store_name || "no definida"}

ESTRUCTURA OBLIGATORIA (la landing va en la descripción del producto de Shopify)
1. "titulo": NOMBRE™ Original: [qué es] que [beneficio 1], [beneficio 2] y [beneficio 3].  Ej: "RelaGum LullaBites™ Original: Gomitas relajantes que ayudan con el sueño, reducen estrés y ayudan a despertar renovado." Si el nombre no tiene marca, créale un nombre comercial corto y pegajoso con ™.
2. "nombre_marca": solo el nombre comercial con ™ (ej: "LullaBites™").
3. "barra_anuncio": barra superior corta con emojis, ej: "🎁 HOY ENVÍO GRATIS + PAGA AL RECIBIR 🚚" (adáptala a la oferta real).
4. "recuadro": texto para el recuadro de la imagen principal. linea1 = "Nombre™ Original:" ; linea2 = qué es y su beneficio principal en máximo 10 palabras.
5. "beneficios_imagen": EXACTAMENTE 5 beneficios para la infografía, de máximo 38 caracteres cada uno, formato "Beneficio con ingrediente/característica" (ej: "Alivio del estrés con L-teanina").
6. "bloques" (cada uno con un emoji que encaje, un título corto y potente, y texto de 2 a 4 frases, centrado):
   - dolor: pregunta que duele ("¿Te cuesta…?" / "¿Cansado de…?") + texto empático con situaciones reales de su semana que termina en "no estás solo" o similar.
   - promesa: "${"{Nombre}"}™: [la promesa]" + cómo funciona o de qué está hecho + "sin X, sin Y".
   - formula: título tipo "Fórmula natural, efectiva y pensada para ti" (adáptalo: si es ropa, calidad de la tela; si es tecnología, la tecnología) + EXACTAMENTE 3 beneficios {nombre, texto} (el texto de 1 frase).
   - habito: la transformación: cómo cambia su día, su cuerpo o su casa desde que lo usa.
   - uso: "Cómo usarlo para obtener mejores resultados" + EXACTAMENTE 3 pasos cortos.
   - cierre: "Nombre™ te acompaña donde vayas" o equivalente + texto que invita a comprar + "llamado" corto (ej: "¡Pídelo hoy y paga al recibir!").
7. "faq": título con emoji (ej: "❓ Preguntas frecuentes ❓") y EXACTAMENTE 4 preguntas cortas: 2 con las dudas reales del producto (cómo se usa, si sirve para mí, tallas/medidas, qué incluye…) y 2 de compra: cómo pago (contra entrega, al recibir) y cuánto tarda en llegar (envío a todo ${r.country}). Respuestas cortas y tranquilizadoras.
8. "seo": título (máx 60 caracteres) y descripción (máx 155) para Google.
9. "tipo_producto": categoría corta (ej: "Bienestar"). "etiquetas": 5 etiquetas.
10. "imagenes" (textos que van ESCRITOS en las 7 imágenes vendedoras; cortos, directos, hablándole de "usted" como en Colombia, sin signos de exclamación):
   - nombre_corto: nombre del producto para la franja de precio, máx. 22 caracteres (ej: "PISTOLA DE PINTURA").
   - titulares (máx. 32 caracteres cada uno, irán en MAYÚSCULAS):
     oferta: el beneficio principal (ej: "Pinte su casa sin pagar pintor").
     antes_despues: el resultado (ej: "Así queda su casa para diciembre").
     que_llega: "Esto le llega a su casa" o similar.
     usos: todo lo que puede hacer con él (ej: "Pinte todo usted mismo").
     comparacion: el ahorro o la ventaja frente a la alternativa (ej: "Deje de pagarle al pintor").
     aspiracional: la vida soñada con el producto; si aplica, la temporada actual (ej: "La casa lista para la Navidad").
     confianza: "Paga cuando lo tenga en sus manos".
   - aspiracional_sub: subtítulo corto para la imagen aspiracional (máx. 40 caracteres).
   - usos_etiquetas: EXACTAMENTE 4 usos distintos, máx. 18 caracteres, en mayúsculas cuando se muestren (ej: "Pinta paredes", "Pinta rejas", "Pinta puertas", "Pinta muebles").
   - que_llega_items: 3 o 4 cosas que trae la caja, solo las de la descripción o la foto (ej: "Vaso de 800 ml").
   - comparacion: sin_titulo (la alternativa, máx. 22: "Pagarle al pintor"), sin_texto (su problema, máx. 30: "Le cobra el día"), con_titulo (máx. 22: "Con su pistola"), con_texto (la ventaja, máx. 30: "Lo hace usted en una tarde").

PARA LAS FOTOS (en INGLÉS, las usa un generador de imágenes)
- "producto_visual": descripción precisa del aspecto del producto (forma, colores, empaque, etiqueta, tamaño) para que salga idéntico.
- "persona": el cliente ideal que aparece en las fotos (edad, género, rasgos latinos, ropa) — debe ser coherente en todas.
- "escenas": una escena por foto, en inglés, 1-2 frases, sin texto en la imagen:
   despues: the AFTER / dream result: the person happy and proud in the place where the problem is now solved, holding or using the product (if a season fits, add it subtly, e.g. Christmas decoration in December).
   usos: a 2x2 grid of FOUR different photos in one image, one per item of usos_etiquetas, in the same order (top-left, top-right, bottom-left, bottom-right), each showing a person using the product for that use.
   antes: the BEFORE / the problem: the same kind of place with the problem clearly visible (dirty, broken, messy, uncomfortable…), WITHOUT the product, a bit gloomy.

REGLAS
- Español latino natural de ${r.country}, frases cortas, tono de amigo, emojis con moderación (solo en títulos y viñetas).
- No inventes descuentos, regalos, garantías, stock ni urgencias que el alumno no puso. No uses cifras de clientes inventadas.
- No inventes características, ingredientes, certificaciones ni afirmaciones que no estén en la descripción o se vean en la foto (por ejemplo "sin azúcar", "sin efectos secundarios", "100% natural"). Si no sabes el tiempo de entrega, di "en pocos días hábiles".
- Salud, suplementos y belleza: usa "ayuda a", "contribuye a", "apoya"; nunca "cura", "elimina enfermedades" ni resultados garantizados.
Responde SOLO con el JSON del esquema.`;
}

const SLOT_SPEC: Record<Slot, string> = {
  despues: "Square photo. Person in the center, face in the middle third of the image (not at the very top or bottom), the product clearly visible at its real size. Bright, warm, happy.",
  usos: "4:3 image made of a clean 2x2 grid of four equal photos separated by thin white lines. Each panel: one person using the product for one use, product clearly visible at its real size, faces in the middle of each panel.",
  antes: "Square photo of the problem situation, no product anywhere, slightly dull and gloomy light, the problem obvious at first sight.",
};
const SLOT_RATIO: Record<Slot, string> = { despues: "1:1", usos: "4:3", antes: "1:1" };

function imagePrompt(slot: Slot, result: Record<string, unknown>, hasPhotos: boolean) {
  const escenas = (result.escenas ?? {}) as Record<string, string>;
  const peopleSlot = slot === "despues" || slot === "usos";
  return [
    "Ultra realistic commercial advertising photograph for a Latin American e-commerce product page. Square 1:1 image.",
    `Scene: ${escenas[slot] ?? ""}`,
    peopleSlot ? `Person: ${result.persona ?? "a Latin American adult"}. Natural skin texture, genuine expression, realistic hands.` : "",
    `Composition: ${SLOT_SPEC[slot]}`,
    `Product: ${result.producto_visual ?? ""}.`,
    hasPhotos && slot !== "antes"
      ? "CRITICAL: the product must look EXACTLY like the product in the attached reference photo(s): same shape, colors, packaging, label design and proportions. Do not redesign it."
      : "",
    slot === "antes" ? "The product must NOT appear in this image." : "",
    "REAL SCALE: keep the product at its true real-world size relative to hands, faces and objects (for example, a supplement bottle fits in one hand). Never enlarge it or bring it close to the lens.",
    "Leave a little breathing room at the top and bottom edges (they may be cropped).",
    "Do NOT add any text, letters, numbers, logos, watermarks, stickers, price tags, badges or graphic overlays. Professional lighting, sharp focus, vibrant but natural colors.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function gemini(path: string, body: unknown) {
  return fetch(`${GEMINI}${path}?key=${key()}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };

async function generateText(parts: Part[]) {
  let lastError = "";
  let busy = false;
  for (const model of TEXT_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const base = { responseMimeType: "application/json", responseSchema: SCHEMA, temperature: 0.9 };
      const call = (thinking: Record<string, unknown> | null) =>
        gemini(`/v1beta/models/${model}:generateContent`, {
          contents: [{ role: "user", parts }],
          generationConfig: thinking ? { ...base, thinkingConfig: thinking } : base,
        });
      // Sin «razonamiento extra»: es lo que más encarece el texto y no mejora esta tarea.
      let res = await call({ thinkingLevel: "minimal" });
      if (res.status === 400) res = await call({ thinkingBudget: 0 });
      if (res.status === 400) res = await call(null);
      if (res.status === 404) {
        lastError = `Modelo ${model} no disponible`;
        break;
      }
      if (res.status === 503 || res.status === 429 || res.status === 500) {
        busy = true;
        lastError = `Gemini saturado (${res.status})`;
        if (attempt === 0) await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(`Gemini respondió con error (${res.status}): ${JSON.stringify(data).slice(0, 300)}`);
      const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string; thought?: boolean }) => (p.thought ? "" : p.text ?? "")).join("") ?? "";
      if (!text) throw new Error("La IA no devolvió respuesta (puede que la foto o la descripción hayan sido bloqueadas por las políticas de contenido).");
      return { model, result: JSON.parse(text) as Record<string, unknown> };
    }
  }
  if (busy) throw new Error("La IA de Google está saturada en este momento. Intenta de nuevo en unos minutos.");
  throw new Error(lastError || "No hay modelo de Gemini disponible");
}

class ImageError extends Error {
  constructor(message: string, public billing = false) {
    super(message);
  }
}

async function generateImage(prompt: string, refs: Part[], models: string[], ratio = "1:1") {
  let lastError = "";
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const body = (withConfig: boolean) => ({
        contents: [{ role: "user", parts: [...refs, { text: prompt }] }],
        generationConfig: withConfig ? { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: ratio } } : { responseModalities: ["TEXT", "IMAGE"] },
      });
      let res = await gemini(`/v1beta/models/${model}:generateContent`, body(true));
      if (res.status === 400) res = await gemini(`/v1beta/models/${model}:generateContent`, body(false));
      if (res.status === 404) {
        lastError = `Modelo de imágenes ${model} no disponible`;
        break;
      }
      const data = await res.json().catch(() => ({}));
      const raw = JSON.stringify(data).slice(0, 400);
      if (res.status === 402 || /prepayment credits are depleted/i.test(raw)) {
        throw new ImageError("El saldo de prepago de Gemini está en cero. Recarga mínimo 5 USD en AI Studio para usar tus créditos.", true);
      }
      if (res.status === 429 || res.status === 403 || res.status === 400) {
        if (/limit:\s*0|free.?tier|billing|FAILED_PRECONDITION|PERMISSION_DENIED/i.test(raw)) {
          throw new ImageError("Las imágenes con IA necesitan la facturación de Gemini activa (el plan gratis no genera imágenes).", true);
        }
      }
      if (res.status === 503 || res.status === 429 || res.status === 500) {
        lastError = `Gemini saturado (${res.status})`;
        await new Promise((r) => setTimeout(r, 2500 * (attempt + 1)));
        continue;
      }
      if (!res.ok) {
        lastError = `Error ${res.status}: ${raw}`;
        break;
      }
      const parts = data?.candidates?.[0]?.content?.parts ?? [];
      for (const p of parts) {
        const inline = p.inlineData ?? p.inline_data;
        if (inline?.data) return { model, mime: (inline.mimeType ?? inline.mime_type ?? "image/png") as string, data: inline.data as string };
      }
      lastError = "La IA no devolvió imagen (puede haber sido bloqueada por las políticas de contenido).";
      break;
    }
  }
  throw new ImageError(lastError || "No hay modelo de imágenes disponible");
}

function toBase64(bytes: Uint8Array) {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(bin);
}
function fromBase64(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const adminClient = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function fail(id: string, e: unknown) {
  const admin = adminClient();
  await admin
    .from("ai_landings")
    .update({ status: "error", result: null, error: String((e as Error)?.message ?? e).slice(0, 1000), finished_at: new Date().toISOString() })
    .eq("id", id);
  // La landing no salió: se devuelven los puntos.
  await admin.from("ai_points_usage").delete().eq("ref_id", id).eq("action", "landing");
}

/** Descuenta puntos. Devuelve el id del gasto, o null si no le alcanzan. */
async function spend(userId: string, action: string, points: number, ref: string) {
  const { data, error } = await adminClient().rpc("spend_points", { p_user: userId, p_action: action, p_points: points, p_ref: ref });
  if (error) {
    if (/sin_puntos/.test(error.message)) return null;
    throw new Error(error.message);
  }
  return data as number;
}

async function pointsCost() {
  const { data } = await adminClient().from("settings").select("points_landing, points_redo").eq("id", 1).maybeSingle();
  return { landing: Number(data?.points_landing ?? 270), redo: Number(data?.points_redo ?? 80) };
}

async function loadPhotos(row: Row) {
  const admin = adminClient();
  const parts: Part[] = [];
  for (const path of (row.photo_paths ?? []).slice(0, 3)) {
    const { data: blob } = await admin.storage.from(BUCKET).download(path);
    if (!blob) continue;
    const mime = blob.type && blob.type.startsWith("image/") ? blob.type : "image/jpeg";
    parts.push({ inline_data: { mime_type: mime, data: toBase64(new Uint8Array(await blob.arrayBuffer())) } });
  }
  return parts;
}

function callSelf(selfUrl: string, id: string, phase: string) {
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  return fetch(selfUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${anon}`, apikey: anon },
    body: JSON.stringify({ id, phase }),
  });
}

/** Marca la fila como tomada para una fase, para que nunca corra dos veces. */
async function claim(id: string, from: string, to: string) {
  const admin = adminClient();
  const { data: row } = await admin.from("ai_landings").select("*").eq("id", id).maybeSingle();
  if (!row || row.status !== "procesando" || row.result?._stage !== from) return null;
  const { data: claimed } = await admin
    .from("ai_landings")
    .update({ result: { ...row.result, _stage: to } })
    .eq("id", id)
    .eq("result->>_stage", from)
    .select("*")
    .maybeSingle();
  return (claimed as Row | null) ?? null;
}

/** Fase 1: todos los textos de la landing + las escenas de cada foto. */
async function phaseText(id: string, selfUrl: string) {
  const row = await claim(id, "texto_pendiente", "texto");
  if (!row) return;
  try {
    if (!key()) throw new Error("Falta configurar GEMINI_API_KEY en los secretos de Supabase.");
    const photos = await loadPhotos(row);
    const { model, result } = await generateText([...photos, { text: buildPrompt(row, photos.length > 0) }]);
    await adminClient()
      .from("ai_landings")
      .update({ result: { ...result, modelo: model, _stage: "imagenes_pendiente" } })
      .eq("id", id);
    await callSelf(selfUrl, id, "images");
  } catch (e) {
    await fail(id, e);
  }
}

/** Modelo para las fotos con personas (Ajustes); por defecto Nano Banana 2. */
async function peopleModel() {
  const { data: cfg } = await adminClient().from("settings").select("landing_image_model").eq("id", 1).maybeSingle();
  return (cfg?.landing_image_model as string | undefined) || NANO_2;
}

/** Fotos con personas: el modelo de calidad primero. La escena del problema: el económico primero. */
function modelsFor(slot: Slot, preferred: string) {
  const first = slot === "antes" ? NANO_ECO : preferred;
  return [first, ...IMAGE_MODELS.filter((m) => m !== first)];
}

async function makeSlotImage(row: Row, slot: Slot, result: Record<string, unknown>, refs: Part[], preferred: string) {
  const img = await generateImage(imagePrompt(slot, result, refs.length > 0), refs, modelsFor(slot, preferred), SLOT_RATIO[slot]);
  const ext = img.mime.includes("jpeg") ? "jpg" : img.mime.includes("webp") ? "webp" : "png";
  const path = `${row.user_id}/${row.id}/base-${slot}.${ext}`;
  const { error } = await adminClient().storage.from(BUCKET).upload(path, fromBase64(img.data), { contentType: img.mime, upsert: true });
  if (error) throw new Error(`No se pudo guardar la imagen: ${error.message}`);
  return { path, model: img.model };
}

/** Fase 2: las 3 fotos con IA (en paralelo). Si fallan, la landing sale igual con las fotos del alumno. */
async function phaseImages(id: string) {
  const row = await claim(id, "imagenes_pendiente", "imagenes");
  if (!row) return;
  const admin = adminClient();
  const result = { ...(row.result ?? {}) } as Record<string, unknown>;
  delete result._stage;
  try {
    const refs = (await loadPhotos(row)).slice(0, 2);
    const preferred = await peopleModel();
    const images: Record<string, string> = {};
    const errors: string[] = [];
    let billing = false;
    let imageModel = "";
    await Promise.all(
      SLOTS.map(async (slot) => {
        try {
          const saved = await makeSlotImage(row, slot, result, refs, preferred);
          if (slot !== "antes") imageModel = saved.model;
          images[slot] = saved.path;
        } catch (e) {
          if (e instanceof ImageError && e.billing) billing = true;
          errors.push(`${slot}: ${String((e as Error)?.message ?? e).slice(0, 200)}`);
        }
      }),
    );
    const aviso = billing
      ? "Las fotos con IA necesitan saldo en la cuenta de Gemini de la academia. Armamos la landing con tus fotos del producto."
      : errors.length
        ? `${errors.length} de ${SLOTS.length} fotos no se pudieron generar; en su lugar usamos tu foto del producto.`
        : null;
    await admin
      .from("ai_landings")
      .update({
        status: "listo",
        images,
        result: { ...result, modelo_imagenes: imageModel || null, aviso_imagenes: aviso, errores_imagenes: errors.length ? errors : null },
        finished_at: new Date().toISOString(),
        error: null,
      })
      .eq("id", id);
  } catch (e) {
    // Si algo inesperado falla aquí, igual entregamos la landing con los textos.
    await admin
      .from("ai_landings")
      .update({ status: "listo", images: {}, result: { ...result, aviso_imagenes: `No se pudieron generar las fotos: ${String((e as Error)?.message ?? e).slice(0, 200)}` }, finished_at: new Date().toISOString() })
      .eq("id", id);
  }
}

async function ensureSharedDelivery() {
  const admin = adminClient();
  const { data: list } = await admin.storage.from(BUCKET).list("_shared", { search: "entrega.png" });
  if (list?.some((f) => f.name === "entrega.png")) return { ok: true, existed: true };
  const prompt = [
    "Ultra realistic commercial advertising photograph, square 1:1.",
    "A friendly Latin American delivery man in a beige uniform and cap hands a medium cardboard box to a smiling Latin American woman at the door of a nice colorful house with plants, sunny day.",
    "The two people are on the LEFT 60% of the image; the RIGHT 40% is a clean, slightly blurred house wall (graphics will go there). Faces in the upper-middle area. Leave the bottom 30% simple (icons will cover it).",
    "Do NOT add any text, letters, logos or watermarks.",
  ].join("\n");
  const img = await generateImage(prompt, [], [NANO_2, NANO_ECO], "1:1");
  const { error } = await admin.storage.from(BUCKET).upload(SHARED_DELIVERY, fromBase64(img.data), { contentType: img.mime, upsert: false });
  if (error && !/exists/i.test(error.message)) return { ok: false, error: error.message };
  return { ok: true, created: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const { id, phase, slot } = await req.json().catch(() => ({}));
  // Escena de entrega compartida (imagen «Confianza»): solo se crea si todavía no existe.
  if (phase === "shared") return json(await ensureSharedDelivery());
  if (!id || typeof id !== "string") return json({ error: "Falta el id" }, 400);
  const selfUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/makedrop-landing`;

  // Fases internas: solo avanzan filas que ya pasaron por la validación del alumno.
  if (phase === "text") {
    // @ts-ignore EdgeRuntime existe en Supabase
    EdgeRuntime.waitUntil(phaseText(id, selfUrl));
    return json({ ok: true }, 202);
  }
  if (phase === "images") {
    // @ts-ignore EdgeRuntime existe en Supabase
    EdgeRuntime.waitUntil(phaseImages(id));
    return json({ ok: true }, 202);
  }

  const auth = req.headers.get("Authorization") ?? "";
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData?.user;
  if (!user) return json({ error: "No autorizado" }, 401);

  const { data: row } = await userClient.from("ai_landings").select("id, user_id, status, result").eq("id", id).maybeSingle();
  if (!row || row.user_id !== user.id) return json({ error: "No encontrado" }, 404);

  // Rehacer solo una foto (cuesta puntos): se responde cuando la foto está lista.
  if (slot) {
    if (!SLOTS.includes(slot)) return json({ error: "Esa foto no se puede rehacer" }, 400);
    if (row.status !== "listo" || !row.result?.titulo) return json({ error: "La landing aún no está lista" }, 409);
    const admin = adminClient();
    const { data: prof } = await admin.from("profiles").select("active").eq("id", user.id).single();
    if (!prof?.active) return json({ error: "Cuenta inactiva" }, 403);
    const cost = (await pointsCost()).redo;
    const usageId = await spend(user.id, "rehacer_foto", cost, id);
    if (usageId === null) return json({ error: `No te alcanzan los puntos: rehacer una foto cuesta ${cost}.` }, 402);
    const { data: full } = await admin.from("ai_landings").select("*").eq("id", id).single();
    try {
      const refs = (await loadPhotos(full as Row)).slice(0, 2);
      const saved = await makeSlotImage(full as Row, slot as Slot, full.result, refs, await peopleModel());
      await admin
        .from("ai_landings")
        .update({ images: { ...(full.images ?? {}), [slot]: saved.path }, result: { ...full.result, rehechas: Number(full.result?.rehechas ?? 0) + 1 } })
        .eq("id", id);
      const { data: bal } = await admin.rpc("points_balance", { p_user: user.id });
      const balance = (Array.isArray(bal) ? bal[0] : bal)?.balance ?? null;
      return json({ ok: true, path: saved.path, balance });
    } catch (e) {
      await admin.from("ai_points_usage").delete().eq("id", usageId); // no salió: se devuelven los puntos
      return json({ error: String((e as Error)?.message ?? e).slice(0, 300) }, 502);
    }
  }

  if (row.status !== "procesando" || row.result) return json({ ok: true, status: row.status });

  const admin = adminClient();
  const { data: profile } = await admin.from("profiles").select("role, active, access_until").eq("id", user.id).single();
  if (!profile?.active) return json({ error: "Cuenta inactiva" }, 403);
  if (profile.role === "kit" && profile.access_until && new Date(profile.access_until).getTime() <= Date.now()) {
    return json({ error: "Acceso vencido" }, 403);
  }
  // Se toma la fila primero (para no cobrar dos veces si llegan 2 llamadas) y luego se cobran los puntos.
  const { data: queued } = await admin
    .from("ai_landings")
    .update({ result: { _stage: "en_cola" } })
    .eq("id", id)
    .is("result", null)
    .select("id")
    .maybeSingle();
  if (!queued) return json({ ok: true, status: "procesando" });

  // Puntos de IA: crear la landing descuenta los puntos de Ajustes (admin y coaches no tienen límite).
  const cost = (await pointsCost()).landing;
  const usageId = await spend(user.id, "landing", cost, id);
  if (usageId === null) {
    await admin.from("ai_landings").update({ status: "error", result: null, error: `No te alcanzan los puntos: crear una landing cuesta ${cost}.` }).eq("id", id);
    return json({ error: "Sin puntos" }, 402);
  }
  await admin.from("ai_landings").update({ result: { _stage: "texto_pendiente" } }).eq("id", id);
  // @ts-ignore EdgeRuntime existe en Supabase
  EdgeRuntime.waitUntil(phaseText(id, selfUrl));
  return json({ ok: true, status: "procesando" }, 202);
});
