// Analiza un video ganador con Gemini y genera un guion nuevo para el producto del alumno.
// POST { id } con el JWT del alumno. Responde 202 y sigue trabajando en segundo plano.
import { createClient } from "npm:@supabase/supabase-js@2";

const GEMINI = "https://generativelanguage.googleapis.com";
const key = () => (Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("GEMINI_KEY") ?? Deno.env.get("GOOGLE_API_KEY") ?? "").trim();
const MODELS = [Deno.env.get("GEMINI_MODEL"), "gemini-flash-latest", "gemini-2.5-flash"].filter(Boolean) as string[];
const DAILY_LIMIT = 5;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const FORMATS: Record<string, string> = {
  mismo: "el MISMO formato del video de referencia (replica su estilo de grabación, ritmo y tipo de escenas)",
  ugc: "UGC con un presentador generado con IA que muestra y explica el producto como si grabara con su celular",
  demo: "demostración problema → solución con planos cercanos del producto",
  antes_despues: "antes y después con transición visual",
  esqueleto: "esqueleto 3D educativo y divertido que explica qué pasa en el cuerpo ('¿Qué pasa en tu cuerpo si…?') y presenta el producto como apoyo",
  animado: "mini historia animada 3D estilo película familiar (personaje con un problema, descubre el producto, final feliz) sin usar personajes ni estudios reales",
  objeto: "el producto cobra vida con ojos y boca en animación 3D y habla a cámara",
  pov: "POV / unboxing en primera persona",
};

const SCHEMA = {
  type: "object",
  properties: {
    analisis: {
      type: "object",
      properties: {
        resumen: { type: "string" },
        formato: { type: "string" },
        duracion_segundos: { type: "number" },
        gancho: {
          type: "object",
          properties: { que_pasa: { type: "string" }, texto_pantalla: { type: "string" }, por_que_funciona: { type: "string" } },
          required: ["que_pasa", "por_que_funciona"],
        },
        estructura: {
          type: "array",
          items: {
            type: "object",
            properties: { tramo: { type: "string" }, segundos: { type: "string" }, que_pasa: { type: "string" }, objetivo: { type: "string" } },
            required: ["tramo", "segundos", "que_pasa", "objetivo"],
          },
        },
        angulo: { type: "string" },
        elementos_clave: { type: "array", items: { type: "string" } },
        llamado_accion: { type: "string" },
      },
      required: ["resumen", "formato", "gancho", "estructura", "angulo", "elementos_clave", "llamado_accion"],
    },
    guion: {
      type: "object",
      properties: {
        titulo: { type: "string" },
        formato: { type: "string" },
        duracion_segundos: { type: "number" },
        personaje: { type: "string" },
        escenas: {
          type: "array",
          items: {
            type: "object",
            properties: {
              numero: { type: "number" },
              segundos: { type: "string" },
              tramo: { type: "string" },
              que_se_ve: { type: "string" },
              voz: { type: "string" },
              texto_pantalla: { type: "string" },
              prompt_imagen: { type: "string" },
              prompt_video: { type: "string" },
            },
            required: ["numero", "segundos", "tramo", "que_se_ve", "voz", "prompt_video"],
          },
        },
        texto_anuncio: { type: "string" },
        titulos: { type: "array", items: { type: "string" } },
      },
      required: ["titulo", "formato", "escenas", "texto_anuncio", "titulos"],
    },
    variantes_gancho: { type: "array", items: { type: "string" } },
    consejos: { type: "array", items: { type: "string" } },
  },
  required: ["analisis", "guion", "variantes_gancho", "consejos"],
};

function buildPrompt(r: Record<string, string | null>) {
  return `Eres el estratega creativo de Adriang Society, experto en anuncios para dropshipping CONTRA ENTREGA en Latinoamérica (Meta y TikTok).

TAREA
1. Mira el video adjunto completo (imagen, voz, música y textos en pantalla). Es un anuncio ganador de referencia.
2. Analiza POR QUÉ funciona: el gancho de los primeros 3 segundos, la estructura por tramos con sus segundos, el ángulo de venta, las emociones y los elementos clave (ritmo, planos, texto en pantalla, prueba, oferta, llamado a la acción).
3. Escribe un guion NUEVO para MI producto que copie la ESTRUCTURA y la PSICOLOGÍA del video de referencia, pero con contenido 100% original (no copies frases ni marcas del video).

MI PRODUCTO
- Producto: ${r.product}
- Descripción: ${r.description}
- País donde vendo: ${r.country}
- Precio: ${r.price || "no definido"}
- Oferta: ${r.offer || "envío gratis + pago contra entrega"}
- Formato del nuevo video: ${FORMATS[r.format ?? "mismo"] ?? FORMATS.mismo}

REGLAS DEL GUION
- Estructura Adriang Society: GANCHO (0–3 s) → PICO DE INTERÉS → DESARROLLO con demostración → PRUEBA o AUTORIDAD → LLAMADO A LA ACCIÓN con la oferta (envío gratis y pago al recibir).
- Duración total entre 15 y 35 segundos. Escenas de máximo 8 segundos (es lo que genera Veo/Flow por clip).
- Todo en español latino, con el vocabulario y acento de ${r.country}.
- "voz" = lo que se dice exactamente. "texto_pantalla" = texto corto y grande.
- "prompt_video": prompt listo para pegar en Google Flow / Veo 3, en español, vertical 9:16, describiendo personaje (siempre igual en todas las escenas), acción, lugar, estilo visual, cámara y luz, e incluyendo entre comillas el diálogo de esa escena. Indica que el producto debe verse idéntico a la imagen de referencia que subirá el alumno.
- "prompt_imagen": prompt para generar el primer fotograma en Gemini / Nano Banana (opcional si no aplica).
- "personaje": ficha corta del personaje para copiar igual en cada escena.
- Si hay personas generadas con IA, son presentadores: NUNCA las presentes como clientes reales ni inventes testimonios o reseñas.
- Sin promesas médicas, curas ni resultados garantizados. Respeta las políticas publicitarias de Meta y TikTok.
- "texto_anuncio": texto principal para el anuncio con emojis, oferta y llamado a la acción. "titulos": 5 títulos cortos.
- "variantes_gancho": 5 ganchos alternativos para probar (texto + qué se ve).
- "consejos": 4 a 6 consejos concretos para producirlo y testearlo (herramientas, edición en CapCut, subtítulos, música, qué medir).
Responde SOLO con el JSON del esquema.`;
}

async function gemini(path: string, init: RequestInit) {
  const url = `${GEMINI}${path}${path.includes("?") ? "&" : "?"}key=${key()}`;
  return fetch(url, init);
}

async function uploadToGemini(bytes: Uint8Array, mime: string, name: string) {
  const start = await gemini("/upload/v1beta/files", {
    method: "POST",
    headers: {
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(bytes.byteLength),
      "X-Goog-Upload-Header-Content-Type": mime,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: name } }),
  });
  const uploadUrl = start.headers.get("x-goog-upload-url");
  if (!start.ok || !uploadUrl) throw new Error(`Gemini no aceptó el archivo (${start.status}): ${(await start.text()).slice(0, 200)}`);
  const up = await fetch(uploadUrl, {
    method: "POST",
    headers: { "X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize", "Content-Length": String(bytes.byteLength) },
    body: bytes,
  });
  if (!up.ok) throw new Error(`Error subiendo el video a Gemini (${up.status})`);
  const { file } = await up.json();
  // esperar a que el video quede procesado
  for (let i = 0; i < 40; i++) {
    const res = await gemini(`/v1beta/${file.name}`, { method: "GET" });
    const f = await res.json();
    if (f.state === "ACTIVE") return f as { name: string; uri: string; mimeType: string };
    if (f.state === "FAILED") throw new Error("Gemini no pudo procesar el video. Prueba con otro formato (MP4).");
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("El video tardó demasiado en procesarse. Prueba con un video más corto.");
}

async function generate(fileUri: string, mime: string, prompt: string) {
  let lastError = "";
  for (const model of MODELS) {
    const res = await gemini(`/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ file_data: { mime_type: mime, file_uri: fileUri } }, { text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: SCHEMA, temperature: 0.8, mediaResolution: "MEDIA_RESOLUTION_LOW" },
      }),
    });
    if (res.status === 404) {
      lastError = `Modelo ${model} no disponible`;
      continue;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(`Gemini respondió con error (${res.status}): ${JSON.stringify(data).slice(0, 300)}`);
    const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
    if (!text) throw new Error("La IA no devolvió respuesta (puede que el video haya sido bloqueado por las políticas de contenido).");
    return { model, result: JSON.parse(text) };
  }
  throw new Error(lastError || "No hay modelo de Gemini disponible");
}

async function process(id: string) {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: row } = await admin.from("ai_scripts").select("*").eq("id", id).single();
  if (!row) return;
  let geminiFile: string | null = null;
  try {
    if (!key()) throw new Error("Falta configurar GEMINI_API_KEY en los secretos de Supabase.");
    if (!row.video_path) throw new Error("No se encontró el video.");
    const { data: blob, error } = await admin.storage.from("ai-videos").download(row.video_path);
    if (error || !blob) throw new Error("No se pudo leer el video subido.");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const mime = blob.type && blob.type.startsWith("video/") ? blob.type : "video/mp4";
    const file = await uploadToGemini(bytes, mime, `${row.id}.mp4`);
    geminiFile = file.name;
    const { model, result } = await generate(file.uri, file.mimeType ?? mime, buildPrompt(row));
    await admin
      .from("ai_scripts")
      .update({ status: "listo", result: { ...result, modelo: model }, finished_at: new Date().toISOString(), error: null })
      .eq("id", id);
  } catch (e) {
    await admin
      .from("ai_scripts")
      .update({ status: "error", error: String((e as Error).message ?? e).slice(0, 1000), finished_at: new Date().toISOString() })
      .eq("id", id);
  } finally {
    if (geminiFile) await gemini(`/v1beta/${geminiFile}`, { method: "DELETE" }).catch(() => {});
    if (row.video_path) await admin.storage.from("ai-videos").remove([row.video_path]).catch(() => {});
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData?.user;
  if (!user) return json({ error: "No autorizado" }, 401);

  const { id } = await req.json().catch(() => ({}));
  if (!id) return json({ error: "Falta el id" }, 400);

  // RLS: solo puede leer su propia fila
  const { data: row } = await userClient.from("ai_scripts").select("id, user_id, status").eq("id", id).maybeSingle();
  if (!row || row.user_id !== user.id) return json({ error: "No encontrado" }, 404);
  if (row.status !== "procesando") return json({ ok: true, status: row.status });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: profile } = await admin.from("profiles").select("role, active").eq("id", user.id).single();
  if (!profile?.active) return json({ error: "Cuenta inactiva" }, 403);
  if (profile.role === "student") {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count } = await admin.from("ai_scripts").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since);
    if ((count ?? 0) > DAILY_LIMIT) {
      await admin.from("ai_scripts").update({ status: "error", error: `Llegaste al límite de ${DAILY_LIMIT} análisis por día. Vuelve mañana.` }).eq("id", id);
      return json({ error: "Límite diario" }, 429);
    }
  }

  // @ts-ignore EdgeRuntime existe en Supabase
  EdgeRuntime.waitUntil(process(id));
  return json({ ok: true, status: "procesando" }, 202);
});
