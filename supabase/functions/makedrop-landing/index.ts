// MakeDrop Landing: genera con Gemini el texto completo de una landing para Shopify
// (estructura definitiva + preguntas frecuentes) y las 5 fotos base con Nano Banana.
// POST { id } con el JWT del alumno. Responde 202 y sigue en segundo plano en 2 fases:
//   "text"   → escribe todos los textos y las escenas de cada foto
//   "images" → genera las 5 fotos tomando como referencia la foto del producto del alumno
// Los sellos, franjas y la lista de beneficios se dibujan después en el navegador del alumno.
import { createClient } from "npm:@supabase/supabase-js@2";

const GEMINI = "https://generativelanguage.googleapis.com";
const key = () => (Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("GEMINI_KEY") ?? Deno.env.get("GOOGLE_API_KEY") ?? "").trim();
const TEXT_MODELS = [Deno.env.get("GEMINI_MODEL"), "gemini-flash-latest", "gemini-2.5-flash", "gemini-flash-lite-latest", "gemini-2.5-flash-lite"].filter(Boolean) as string[];
const IMAGE_MODELS = [Deno.env.get("GEMINI_IMAGE_MODEL"), "gemini-3.1-flash-image-preview", "gemini-2.5-flash-image"].filter(Boolean) as string[];
// Costo aproximado de una landing (5 fotos + texto) en USD, según el modelo de imágenes.
const LANDING_COST: Record<string, number> = { "gemini-3.1-flash-image-preview": 0.4, "gemini-2.5-flash-image": 0.2 };
const BUCKET = "makedrop";
const SLOTS = ["principal", "beneficios", "uso_1", "producto", "uso_2"] as const;
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
      properties: { principal: str, beneficios: str, uso_1: str, producto: str, uso_2: str },
      required: ["principal", "beneficios", "uso_1", "producto", "uso_2"],
    },
  },
  required: ["titulo", "nombre_marca", "barra_anuncio", "recuadro", "beneficios_imagen", "bloques", "faq", "seo", "tipo_producto", "etiquetas", "producto_visual", "persona", "escenas"],
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

PARA LAS FOTOS (en INGLÉS, las usa un generador de imágenes)
- "producto_visual": descripción precisa del aspecto del producto (forma, colores, empaque, etiqueta, tamaño) para que salga idéntico.
- "persona": el cliente ideal que aparece en las fotos (edad, género, rasgos latinos, ropa) — debe ser coherente en todas.
- "escenas": una escena por foto, en inglés, 1-2 frases, sin texto en la imagen:
   principal: the person smiling at the camera and holding the product close to their chest with both hands (arms bent, not extended), simple warm studio background.
   beneficios: the product alone on the RIGHT side, with elements related to its ingredients/features flying or arranged around it, on a deep colored background that matches the product colors; the LEFT 55% must be a clean empty area of that background color.
   uso_1: the person using/enjoying the product in a real everyday moment of their life (where the problem happens).
   producto: premium hero shot of the product alone on a dark elegant background with dramatic light.
   uso_2: a DIFFERENT person (another gender or age of the same target) using the product, happy, in another real setting.

REGLAS
- Español latino natural de ${r.country}, frases cortas, tono de amigo, emojis con moderación (solo en títulos y viñetas).
- No inventes descuentos, regalos, garantías, stock ni urgencias que el alumno no puso. No uses cifras de clientes inventadas.
- No inventes características, ingredientes, certificaciones ni afirmaciones que no estén en la descripción o se vean en la foto (por ejemplo "sin azúcar", "sin efectos secundarios", "100% natural"). Si no sabes el tiempo de entrega, di "en pocos días hábiles".
- Salud, suplementos y belleza: usa "ayuda a", "contribuye a", "apoya"; nunca "cura", "elimina enfermedades" ni resultados garantizados.
Responde SOLO con el JSON del esquema.`;
}

const SLOT_SPEC: Record<Slot, string> = {
  principal: "Medium shot from the waist up. The person is placed slightly to the LEFT and LOWER in the frame: the head must be below the top 35% of the image and away from the right side. The entire TOP-RIGHT quarter of the image must be plain, empty background (a text box will cover it). The product is held close to the chest, clearly visible, at its real size.",
  beneficios: "The product occupies the right 45% of the frame. The left 55% is an empty, clean area of the background color (no objects, no text).",
  uso_1: "Candid lifestyle photo, natural light, the product clearly visible and recognizable.",
  producto: "Product centered, large, filling about 60% of the frame, premium studio look.",
  uso_2: "Candid lifestyle photo with a different person, natural light, the product clearly visible and recognizable.",
};

function imagePrompt(slot: Slot, result: Record<string, unknown>, hasPhotos: boolean) {
  const escenas = (result.escenas ?? {}) as Record<string, string>;
  const peopleSlot = slot === "principal" || slot === "uso_1" || slot === "uso_2";
  return [
    "Ultra realistic commercial advertising photograph for a Latin American e-commerce product page. Square 1:1 image.",
    `Scene: ${escenas[slot] ?? ""}`,
    peopleSlot ? `Person: ${result.persona ?? "a Latin American adult"}. Natural skin texture, genuine expression, realistic hands.` : "",
    `Composition: ${SLOT_SPEC[slot]}`,
    `Product: ${result.producto_visual ?? ""}.`,
    hasPhotos
      ? "CRITICAL: the product must look EXACTLY like the product in the attached reference photo(s): same shape, colors, packaging, label design and proportions. Do not redesign it."
      : "",
    "REAL SCALE: keep the product at its true real-world size relative to hands, faces and objects (for example, a supplement bottle fits in one hand). Never enlarge it or bring it close to the lens.",
    "Keep the top-left corner, the top-right corner and the bottom 20% of the frame visually simple, without faces or the product, because graphics will be placed there later.",
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
      let res = await call({ thinkingLevel: "low" });
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

async function generateImage(prompt: string, refs: Part[], models: string[]) {
  let lastError = "";
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const body = (withConfig: boolean) => ({
        contents: [{ role: "user", parts: [...refs, { text: prompt }] }],
        generationConfig: withConfig ? { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "1:1" } } : { responseModalities: ["TEXT", "IMAGE"] },
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
  await adminClient()
    .from("ai_landings")
    .update({ status: "error", result: null, error: String((e as Error)?.message ?? e).slice(0, 1000), finished_at: new Date().toISOString() })
    .eq("id", id);
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

/** Fase 2: las 5 fotos base con Nano Banana (en paralelo). Si fallan, la landing sale igual con las fotos del alumno. */
async function phaseImages(id: string) {
  const row = await claim(id, "imagenes_pendiente", "imagenes");
  if (!row) return;
  const admin = adminClient();
  const result = { ...(row.result ?? {}) } as Record<string, unknown>;
  delete result._stage;
  try {
    const refs = (await loadPhotos(row)).slice(0, 2);
    // El modelo elegido en Ajustes va primero; el otro queda de respaldo.
    const { data: cfg } = await admin.from("settings").select("landing_image_model").eq("id", 1).maybeSingle();
    const preferred = cfg?.landing_image_model as string | undefined;
    const models = preferred ? [preferred, ...IMAGE_MODELS.filter((m) => m !== preferred)] : IMAGE_MODELS;
    const images: Record<string, string> = {};
    const errors: string[] = [];
    let billing = false;
    let imageModel = "";
    await Promise.all(
      SLOTS.map(async (slot) => {
        try {
          const img = await generateImage(imagePrompt(slot, result, refs.length > 0), refs, models);
          imageModel = img.model;
          const ext = img.mime.includes("jpeg") ? "jpg" : img.mime.includes("webp") ? "webp" : "png";
          const path = `${row.user_id}/${row.id}/base-${slot}.${ext}`;
          const { error } = await admin.storage.from(BUCKET).upload(path, fromBase64(img.data), { contentType: img.mime, upsert: true });
          if (error) throw new Error(`No se pudo guardar la imagen: ${error.message}`);
          images[slot] = path;
        } catch (e) {
          if (e instanceof ImageError && e.billing) billing = true;
          errors.push(`${slot}: ${String((e as Error)?.message ?? e).slice(0, 200)}`);
        }
      }),
    );
    const aviso = billing
      ? "Las fotos con IA necesitan saldo en la cuenta de Gemini de la academia. Armamos la landing con tus fotos del producto."
      : errors.length
        ? `${errors.length} de 5 fotos no se pudieron generar; en su lugar usamos tu foto del producto.`
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const { id, phase } = await req.json().catch(() => ({}));
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
  if (row.status !== "procesando" || row.result) return json({ ok: true, status: row.status });

  const admin = adminClient();
  const { data: profile } = await admin.from("profiles").select("role, active, access_until").eq("id", user.id).single();
  if (!profile?.active) return json({ error: "Cuenta inactiva" }, 403);
  if (profile.role === "kit" && profile.access_until && new Date(profile.access_until).getTime() <= Date.now()) {
    return json({ error: "Acceso vencido" }, 403);
  }
  if (profile.role !== "admin" && profile.role !== "coach") {
    // Presupuesto: el % (Ajustes, por defecto 3 %) de lo que paga el alumno al mes, dividido por el costo de cada landing.
    const { data: settings } = await admin
      .from("settings")
      .select("landing_budget_pct, landing_image_model, landing_default_usd_kit, landing_default_usd_member")
      .eq("id", 1)
      .maybeSingle();
    const { data: billing } = await admin.from("member_billing").select("monthly_usd").eq("user_id", user.id).maybeSingle();
    const usd = Number(billing?.monthly_usd ?? (profile.role === "kit" ? settings?.landing_default_usd_kit : settings?.landing_default_usd_member) ?? 14);
    const cost = LANDING_COST[settings?.landing_image_model ?? ""] ?? 0.4;
    const limit = Math.floor((usd * Number(settings?.landing_budget_pct ?? 3)) / 100 / cost + 1e-9);
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { count } = await admin.from("ai_landings").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since);
    if ((count ?? 0) > limit) {
      await admin.from("ai_landings").update({ status: "error", error: `Llegaste al límite de ${limit} landings en 30 días.` }).eq("id", id);
      return json({ error: "Límite mensual" }, 429);
    }
  }

  const { data: queued } = await admin
    .from("ai_landings")
    .update({ result: { _stage: "texto_pendiente" } })
    .eq("id", id)
    .is("result", null)
    .select("id")
    .maybeSingle();
  if (!queued) return json({ ok: true, status: "procesando" });
  // @ts-ignore EdgeRuntime existe en Supabase
  EdgeRuntime.waitUntil(phaseText(id, selfUrl));
  return json({ ok: true, status: "procesando" }, 202);
});
