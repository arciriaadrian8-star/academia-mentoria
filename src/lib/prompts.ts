/**
 * Plantillas del Generador de prompts y guiones (Kit COD).
 * Todo se arma con los datos del producto: el alumno solo cambia nombre, beneficio, dolor, oferta y ángulo.
 */

export type Ctx = {
  producto: string;
  beneficio: string;
  dolor: string;
  cliente: string;
  pais: string;
  precio: string;
  precioAntes: string;
  oferta: string;
  angulo: AngleId;
};

export const ANGLES = [
  { id: "dolor", label: "Dolor directo", hint: "Ataca el problema que ya tiene" },
  { id: "miedo", label: "Miedo al futuro", hint: "Lo que puede pasar si no actúa" },
  { id: "transformacion", label: "Transformación", hint: "El antes y el después" },
  { id: "comodidad", label: "Comodidad", hint: "Fácil, rápido, sin esfuerzo" },
  { id: "identidad", label: "Identidad", hint: "Para personas que ya no aceptan conformarse" },
  { id: "social", label: "Prueba social", hint: "Lo que todos están usando" },
] as const;

export type AngleId = (typeof ANGLES)[number]["id"];

export type PromptItem = { title: string; text: string; note?: string };
export type PromptSection = { id: string; title: string; description: string; tools: string; items: PromptItem[] };

const fill = (s: string, fallback: string) => (s.trim() ? s.trim() : fallback);

function norm(c: Ctx) {
  return {
    p: fill(c.producto, "[tu producto]"),
    b: fill(c.beneficio, "[beneficio principal]"),
    d: fill(c.dolor, "[el problema que resuelve]"),
    cl: fill(c.cliente, "[tu cliente ideal]"),
    pais: fill(c.pais, "Colombia"),
    precio: fill(c.precio, "[precio]"),
    antes: fill(c.precioAntes, "[precio antes]"),
    oferta: fill(c.oferta, "envío gratis + pago contra entrega"),
    a: c.angulo,
  };
}

/** Frase de gancho según el ángulo. */
export function hooksFor(angle: AngleId, c: Ctx): string[] {
  const { p, b, d, cl } = norm(c);
  switch (angle) {
    case "dolor":
      return [
        `¿Todavía sufres porque ${d}? Mira esto.`,
        `Si ${d}, este video es para ti.`,
        `Dejé de sufrir porque ${d} el día que conocí esto.`,
        `El error que cometes todos los días y por eso ${d}.`,
      ];
    case "miedo":
      return [
        `Si no haces algo hoy, en unos meses ${d} va a ser peor.`,
        `Nadie te dice esto sobre ${d}… hasta que ya es tarde.`,
        `Lo que pasa si ignoras que ${d}.`,
        `Antes de que ${d} empeore, mira esto.`,
      ];
    case "transformacion":
      return [
        `Así estaba antes… y así estoy después de ${p}.`,
        `De sufrir porque ${d} a ${b} en pocos días.`,
        `Mira la diferencia: izquierda sin ${p}, derecha con ${p}.`,
        `En 7 días pasé de esto… a esto.`,
      ];
    case "comodidad":
      return [
        `${b} sin esfuerzo, desde tu casa.`,
        `La forma más fácil de ${b} (y nadie la conoce).`,
        `Sin complicarte: ${p} hace todo por ti.`,
        `2 minutos al día y listo: así funciona ${p}.`,
      ];
    case "identidad":
      return [
        `Para ${cl} que ya no se conforman.`,
        `Si eres de las personas que exigen lo mejor, mira esto.`,
        `Esto no es para todos. Es para quienes ya decidieron ${b}.`,
        `Las personas que se cuidan de verdad ya usan ${p}.`,
      ];
    case "social":
      return [
        `Todo el mundo en ${norm(c).pais} está pidiendo esto. Te muestro por qué.`,
        `El producto que se está agotando este mes.`,
        `Miles ya lo probaron. Esta es la razón.`,
        `Me lo recomendaron tanto que tuve que probarlo.`,
      ];
  }
}

const angleLabel = (a: AngleId) => ANGLES.find((x) => x.id === a)?.label ?? a;

const AI_NOTE =
  "Usa personajes de IA como presentadores, nunca como clientes reales: no inventes testimonios. Meta y TikTok piden marcar el contenido hecho con IA cuando parece real.";

export function buildSections(c: Ctx): PromptSection[] {
  const { p, b, d, cl, pais, precio, antes, oferta, a } = norm(c);
  const hooks = hooksFor(a, c);
  const h0 = hooks[0];
  const voz = `Voz en off en español latino con acento de ${pais}, cercana y natural.`;

  return [
    /* ------------------------------------------------------------- ángulos */
    {
      id: "angulos",
      title: "Ángulos de venta y ganchos",
      description: "Un mismo producto, 6 formas de venderlo. Prueba mínimo 3 ángulos antes de descartar un producto.",
      tools: "Úsalos en el texto del anuncio, en el texto de pantalla y en los primeros 3 segundos del video.",
      items: ANGLES.map((ang) => ({
        title: `${ang.label} · ${ang.hint}`,
        text: hooksFor(ang.id, c).map((h) => `• ${h}`).join("\n"),
      })),
    },

    /* --------------------------------------------------------------- copy */
    {
      id: "copy",
      title: "Textos para el anuncio",
      description: `Escritos con el ángulo «${angleLabel(a)}». Cópialos en Meta o TikTok Ads.`,
      tools: "Texto principal + título + descripción.",
      items: [
        {
          title: "Texto principal corto",
          text: `${h0}\n\n✅ ${b}\n✅ ${oferta}\n✅ Pagas cuando lo recibes en tu casa\n\n👉 Pide el tuyo hoy, unidades limitadas.`,
        },
        {
          title: "Texto principal tipo historia",
          text: `Durante mucho tiempo ${d}. Probé de todo y nada funcionaba…\n\nHasta que conocí ${p}. Ahora puedo decir que ${b}.\n\nY lo mejor: llega a tu casa con ${oferta}. No pagas nada por adelantado.\n\n👉 Toca «Comprar» y pídelo hoy.`,
        },
        {
          title: "Texto principal de oferta",
          text: `🔥 OFERTA SOLO POR HOY 🔥\n${p}\nAntes ${antes} → HOY ${precio}\n\n🎁 ${oferta}\n🚚 Envío gratis a todo ${pais}\n💵 Paga al recibir\n\n⏳ Quedan pocas unidades.`,
        },
        {
          title: "5 títulos",
          text: [`${b} desde el primer uso`, `Paga al recibir · Envío gratis`, `${p} · ${oferta}`, `Últimas unidades con descuento`, `La solución para ${d}`].map((t) => `• ${t}`).join("\n"),
        },
      ],
    },

    /* ------------------------------------------------------------ imágenes */
    {
      id: "imagenes",
      title: "Imágenes para pautar",
      description: "Prompts para crear creativos en imagen. Sube una foto real del producto como referencia para que salga idéntico.",
      tools: "Gemini (Nano Banana) o Flow con imagen de referencia · formato 1:1 o 4:5.",
      items: [
        {
          title: "Imagen principal (hero)",
          text: `Usa la foto adjunta del producto "${p}" como referencia exacta (misma forma, colores y logo). Crea una imagen publicitaria vertical 4:5 para Facebook e Instagram, fondo limpio de estudio con luz suave, el producto al centro con sombra realista. Arriba un título grande en español: "${b}". Abajo tres sellos: "Envío gratis", "Paga al recibir", "${oferta}". Estilo profesional de e-commerce, alta nitidez, sin texto adicional.`,
        },
        {
          title: "Problema vs. solución",
          text: `Imagen dividida en dos mitades, formato 4:5. Izquierda (tonos grises, iluminación fría): una persona de ${cl} con cara de frustración porque ${d}; etiqueta roja "ANTES". Derecha (tonos cálidos y luminosos): la misma persona feliz usando "${p}" (usa la foto adjunta como referencia exacta del producto); etiqueta verde "DESPUÉS". Texto superior: "${hooks[1] ?? h0}". Fotografía realista, estilo anuncio de e-commerce.`,
        },
        {
          title: "Oferta con precio tachado",
          text: `Crea un creativo de oferta 1:1 con el producto "${p}" (referencia exacta: foto adjunta) en primer plano. Fondo de color llamativo con degradado. Textos en español: arriba "OFERTA SOLO POR HOY", al centro el precio anterior tachado "${antes}" y el precio nuevo grande "${precio}", un sello circular "${oferta}" y abajo "Envío gratis · Paga al recibir". Diseño limpio, tipografía gruesa, legible en celular.`,
        },
        {
          title: "Beneficios con íconos (infografía)",
          text: `Infografía publicitaria 4:5 del producto "${p}" (usa la foto adjunta como referencia exacta) al centro. Alrededor, 4 beneficios con íconos simples y flechas apuntando al producto: "${b}", "Fácil de usar", "Calidad garantizada", "Resultados desde el primer uso". Fondo claro, colores de marca, estilo moderno y minimalista, todo el texto en español.`,
        },
        {
          title: "Prueba social (con reseña REAL)",
          text: `Crea una imagen 4:5 estilo publicación de cliente: el producto "${p}" (referencia: foto adjunta) sobre una mesa en una casa real, luz natural. Encima, una tarjeta blanca tipo reseña con 5 estrellas y este texto: "[PEGA AQUÍ UNA RESEÑA REAL DE UN CLIENTE]". Debajo: "Envío gratis · Paga al recibir". Estilo auténtico, no publicitario.`,
          note: "Usa solo reseñas reales de tus clientes. Inventar reseñas es engañoso y puede hacer que te cierren la cuenta publicitaria.",
        },
        {
          title: "Producto en uso (lifestyle)",
          text: `Fotografía realista vertical 4:5: una persona de ${cl} usando "${p}" (referencia exacta: foto adjunta) en su día a día en ${pais}, ambiente de casa latinoamericana, luz natural de ventana, expresión de satisfacción porque ${b}. Profundidad de campo baja, aspecto de foto tomada con celular de alta gama. Sin texto.`,
        },
      ],
    },

    /* ---------------------------------------------------------- product page */
    {
      id: "pagina",
      title: "Página de producto",
      description: "Prompt para que la IA te escriba toda la página con la estructura que vende en contra entrega.",
      tools: "ChatGPT o Gemini · después lo pegas en Shopify.",
      items: [
        {
          title: "Prompt maestro de la página",
          text: `Actúa como experto en e-commerce contra entrega en Latinoamérica. Escribe la página de producto completa en español para "${p}", que se vende en ${pais} a ${cl}.\nProblema que resuelve: ${d}.\nBeneficio principal: ${b}.\nPrecio: ${precio} (antes ${antes}). Oferta: ${oferta}. Envío gratis y pago contra entrega.\n\nEntrega en este orden:\n1. Título corto y vendedor (máx. 8 palabras).\n2. Subtítulo con la promesa principal.\n3. 5 viñetas de beneficios con emojis.\n4. Sección "¿Para quién es?" con 3 perfiles.\n5. Sección "Cómo funciona" en 3 pasos.\n6. Tabla comparativa: ${p} vs. alternativas comunes.\n7. Texto de la oferta con urgencia (solo por hoy / últimas unidades).\n8. Garantía y envío: pago al recibir, tiempos de entrega de 2 a 5 días hábiles.\n9. 6 preguntas frecuentes con respuesta corta (incluye: ¿cómo pago?, ¿cuánto tarda?, ¿qué pasa si no me sirve?).\n10. 3 llamados a la acción distintos para el botón.\nTono cercano, frases cortas, sin promesas médicas ni exageradas.`,
        },
        {
          title: "Imágenes de la galería",
          text: `Genera 5 imágenes cuadradas 1:1 para la galería de la página de producto de "${p}" (usa la foto adjunta como referencia exacta): 1) producto sobre fondo blanco, 2) producto en uso por ${cl}, 3) detalle de materiales en primer plano, 4) infografía con medidas y contenido de la caja, 5) imagen de oferta "${oferta}". Estilo consistente, luz suave, textos en español.`,
        },
      ],
    },

    /* ---------------------------------------------------------------- videos */
    ...videoSections({ p, b, d, cl, pais, precio, antes, oferta, h0, hooks, voz }),

    /* ---------------------------------------------------------------- maestro */
    {
      id: "maestro",
      title: "Prompt maestro: 10 creativos más",
      description: "Pégalo en ChatGPT o Gemini para que te genere más ideas con la estructura de Adriang Society.",
      tools: "ChatGPT o Gemini.",
      items: [
        {
          title: "Generador de creativos",
          text: `Eres estratega creativo de anuncios para dropshipping contra entrega en Latinoamérica. Mi producto es "${p}", lo vendo en ${pais} a ${cl}. Resuelve: ${d}. Beneficio principal: ${b}. Oferta: ${oferta}, precio ${precio}.\n\nCrea 10 ideas de video de 15 a 25 segundos. Para cada una dame:\n- Ángulo de venta (dolor, miedo al futuro, transformación, comodidad, identidad o prueba social).\n- Gancho de los primeros 3 segundos (texto en pantalla + lo que se ve).\n- Pico de interés (segundos 3–8).\n- Desarrollo con demostración (segundos 8–18).\n- Prueba o autoridad (segundos 18–22).\n- Llamado a la acción con la oferta (últimos 3 segundos).\n- Formato sugerido (UGC, demostración, antes/después, animado 3D, esqueleto educativo, objeto que habla, POV).\nNo inventes testimonios ni hagas promesas médicas.`,
        },
      ],
    },
  ];
}

type V = { p: string; b: string; d: string; cl: string; pais: string; precio: string; antes: string; oferta: string; h0: string; hooks: string[]; voz: string };

function videoSections(v: V): PromptSection[] {
  const { p, b, d, cl, pais, oferta, h0, hooks, voz } = v;
  const cta = `Pide ${p} hoy con ${oferta}. Pagas cuando te llegue.`;
  const produccion =
    "Cómo producirlo: 1) genera cada escena en Flow / Veo (clips de 8 s, formato vertical 9:16) usando la foto del producto como referencia; 2) une los clips en CapCut; 3) agrega subtítulos grandes, música en tendencia y el texto de la oferta al final.";

  return [
    {
      id: "video-ugc",
      title: "Video UGC con presentador IA",
      description: "Un presentador muestra y explica el producto como si grabara con su celular. Es el formato que más vende en COD.",
      tools: "Flow / Veo 3 (con audio) · CapCut para unir.",
      items: [
        {
          title: "Guion (20 s)",
          text: `0–3 s · GANCHO: el presentador mira a cámara con el producto en la mano. Texto en pantalla: "${h0}"\n3–8 s · PROBLEMA: "Si ${d}, sé lo frustrante que es."\n8–16 s · DEMOSTRACIÓN: lo usa frente a cámara. "Mira, con ${p} ${b}."\n16–20 s · OFERTA: "${cta}"\n\n${produccion}`,
          note: AI_NOTE,
        },
        {
          title: "Escena 1 · Veo / Flow",
          text: `Video vertical 9:16, estilo grabado con celular (UGC). Una persona de ${cl}, en la sala de una casa en ${pais}, sostiene "${p}" (igual a la imagen de referencia) y mira a la cámara con energía. Dice en español: "${h0}". Luz natural de ventana, cámara en mano con leve movimiento, plano medio. ${voz}`,
        },
        {
          title: "Escena 2 · Veo / Flow",
          text: `Misma persona, mismo lugar y misma ropa. Plano cercano mostrando cómo usa "${p}" paso a paso, sus manos en primer plano. Dice: "Con ${p} ${b}, mira lo fácil que es." Iluminación natural, estilo UGC realista, vertical 9:16.`,
        },
        {
          title: "Escena 3 · Veo / Flow",
          text: `Misma persona sonriendo a cámara con el producto junto a su cara. Dice: "${cta}" Al final señala hacia abajo. Vertical 9:16, estilo UGC realista.`,
        },
      ],
    },
    {
      id: "video-demo",
      title: "Problema → solución (demostración)",
      description: "Muestra el problema exagerado y cómo el producto lo resuelve en segundos.",
      tools: "Flow / Veo 3 · CapCut.",
      items: [
        {
          title: "Guion (18 s)",
          text: `0–3 s · Texto en pantalla: "${hooks[1] ?? h0}". Se ve el problema en acción (${d}).\n3–6 s · Corte rápido: aparece ${p}.\n6–14 s · Demostración en primer plano: ${b}.\n14–18 s · Producto y oferta en pantalla: "${oferta} · Paga al recibir".\n\n${produccion}`,
        },
        {
          title: "Escena del problema",
          text: `Video vertical 9:16, cámara lenta dramática: una persona de ${cl} en su casa en ${pais} enfrentando el problema: ${d}. Expresión de frustración, iluminación fría y desaturada, plano cercano. Sin texto.`,
        },
        {
          title: "Escena de la solución",
          text: `Video vertical 9:16, primer plano de manos usando "${p}" (idéntico a la imagen de referencia). Se ve claramente cómo ${b}. Iluminación cálida y brillante, movimiento de cámara suave de acercamiento, estilo comercial de e-commerce.`,
        },
      ],
    },
    {
      id: "video-antes-despues",
      title: "Antes y después",
      description: "Transformación visual en dos tiempos. Muy fuerte para belleza, hogar, limpieza y bienestar.",
      tools: "Gemini (imágenes) + Flow / Veo para animar · CapCut.",
      items: [
        {
          title: "Guion (15 s)",
          text: `0–3 s · Pantalla dividida, texto: "${hooks[2] ?? h0}".\n3–8 s · "ANTES": ${d}.\n8–12 s · Transición con efecto de barrido: "DESPUÉS" con ${p}: ${b}.\n12–15 s · "${oferta} · Paga al recibir".\n\n${produccion}`,
          note: "Muestra resultados que el producto realmente logra. Las promesas falsas disparan devoluciones y bloqueos de cuenta.",
        },
        {
          title: "Transición antes/después · Veo / Flow",
          text: `Video vertical 9:16. Comienza con una escena apagada y gris de ${d} (etiqueta "ANTES"). Un barrido de luz cruza la pantalla de izquierda a derecha y revela la misma escena transformada, luminosa y ordenada, con "${p}" (idéntico a la referencia) en primer plano (etiqueta "DESPUÉS"). Cámara fija, estilo comercial limpio.`,
        },
      ],
    },
    {
      id: "video-esqueleto",
      title: "Esqueleto educativo («¿Qué pasa en tu cuerpo si…?»)",
      description: "Formato viral: un esqueleto 3D explica de forma curiosa lo que pasa en el cuerpo y presenta el producto como solución. Ideal para salud, bienestar y suplementos.",
      tools: "Gemini / Nano Banana para la imagen del esqueleto + Veo 3 para animarlo · CapCut.",
      items: [
        {
          title: "Guion (25 s)",
          text: `0–3 s · Esqueleto mirando a cámara, texto: "¿Qué le pasa a tu cuerpo si ${d}?"\n3–10 s · El esqueleto señala la zona del cuerpo afectada (se ilumina en rojo) y explica en tono curioso y divertido.\n10–18 s · Aparece ${p}; la zona pasa de rojo a verde mientras explica que ${b}.\n18–25 s · El esqueleto sostiene el producto: "${cta}"\n\n${produccion}`,
          note: "En salud y suplementos no prometas curar enfermedades; habla de bienestar y apoyo, y respeta las normas de tu país (en Colombia, INVIMA).",
        },
        {
          title: "Imagen del personaje · Gemini / Nano Banana",
          text: `Personaje: un esqueleto humano 3D amigable y expresivo, huesos color marfil limpios, ojos grandes y brillantes dentro de las cuencas, postura relajada. Está en un consultorio moderno y luminoso, frente a la cámara, señalando con una mano. Estilo de animación 3D suave y redondeado, iluminación de estudio con luz cálida principal y contraluz fría, fondo ligeramente desenfocado. Formato vertical 9:16, sin texto.`,
        },
        {
          title: "Animación · Veo 3",
          text: `Anima la imagen: el esqueleto 3D amigable mira a cámara, gesticula con las manos y señala su ${"[zona del cuerpo]"}, que brilla en rojo. Dice en español con tono curioso y divertido: "¿Sabías lo que pasa en tu cuerpo cuando ${d}?" Cámara con acercamiento lento, iluminación de estudio, estilo de animación 3D suave. ${voz}`,
        },
        {
          title: "Escena del producto · Veo 3",
          text: `El mismo esqueleto 3D amigable sostiene "${p}" (idéntico a la imagen de referencia) junto a su cara y sonríe; la zona del cuerpo pasa de rojo a verde brillante. Dice en español: "${b}. ${cta}" Plano medio, cámara estable, misma iluminación y estilo que la escena anterior.`,
        },
      ],
    },
    {
      id: "video-animado",
      title: "Historia animada 3D (estilo película familiar)",
      description: "Una mini historia animada tipo película: un personaje con un problema, descubre el producto y tiene un final feliz. Engancha porque se ve como una película, no como un anuncio.",
      tools: "Gemini para el personaje + Flow / Veo 3 para cada escena · CapCut.",
      items: [
        {
          title: "Ficha del personaje (pégala igual en cada escena)",
          text: `Personaje: [nombre], ${cl}, con rasgos suaves y redondeados, ojos grandes y expresivos con brillo, cabello [color y estilo], ropa [prenda y color llamativo], un detalle único: [ej. bufanda amarilla]. Estilo: animación 3D suave y redondeada, piel con brillo cálido, texturas pintadas a mano, profundidad de campo baja.`,
          note: "Copia esta ficha palabra por palabra en todas las escenas para que el personaje no cambie. No uses personajes de películas reales ni nombres de estudios.",
        },
        {
          title: "Guion (30 s · 4 escenas)",
          text: `Escena 1 (0–8 s) · EL PROBLEMA: el personaje en su casa sufre porque ${d}. Narrador: "${h0}"\nEscena 2 (8–15 s) · EL DESCUBRIMIENTO: recibe un paquete en la puerta, lo abre y encuentra ${p}. Ojos brillando de sorpresa.\nEscena 3 (15–23 s) · LA TRANSFORMACIÓN: lo usa y todo cambia: ${b}. Colores más cálidos, música alegre.\nEscena 4 (23–30 s) · FINAL FELIZ + OFERTA: el personaje sonríe a cámara con el producto. Narrador: "${cta}"\n\n${produccion}`,
        },
        {
          title: "Escena 1 · Flow / Veo",
          text: `[PEGA LA FICHA DEL PERSONAJE]. El personaje está en la sala de su casa al atardecer, con cara triste y cansada porque ${d}. Acción: suspira y mira por la ventana. Animación 3D suave y redondeada. Cámara: acercamiento lento. Luz: cálida de ventana desde un lado, contraluz fría azul. Vertical 9:16.`,
        },
        {
          title: "Escena 2 · Flow / Veo",
          text: `[PEGA LA FICHA DEL PERSONAJE]. El personaje abre la puerta, recibe una caja y al abrirla encuentra "${p}" (idéntico a la imagen de referencia); sus ojos se iluminan de sorpresa. Animación 3D suave y redondeada. Cámara: plano medio estático. Luz: cálida y brillante. Vertical 9:16.`,
        },
        {
          title: "Escena 3 · Flow / Veo",
          text: `[PEGA LA FICHA DEL PERSONAJE]. El personaje usa "${p}" y su expresión cambia a felicidad: ${b}. El ambiente gris se llena de colores cálidos. Animación 3D suave y redondeada. Cámara: giro lento alrededor del personaje. Luz: dorada principal, contraluz suave. Vertical 9:16.`,
        },
        {
          title: "Escena 4 · Flow / Veo",
          text: `[PEGA LA FICHA DEL PERSONAJE]. El personaje sonríe directo a cámara sosteniendo "${p}" junto a su cara y guiña un ojo. Narrador en español: "${cta}" Animación 3D suave y redondeada. Cámara: acercamiento lento. Luz: cálida y brillante. Vertical 9:16.`,
        },
      ],
    },
    {
      id: "video-objeto",
      title: "El producto que habla",
      description: "El propio producto cobra vida con carita y voz, y se presenta. Muy llamativo y fácil de producir.",
      tools: "Gemini + Veo 3 · CapCut.",
      items: [
        {
          title: "Guion (15 s)",
          text: `0–3 s · El producto abre los ojos y dice: "¡Ey, tú! Sí, tú, el que ${d}."\n3–10 s · "Soy ${p} y conmigo ${b}."\n10–15 s · "Estoy en oferta: ${oferta}. ¡Me pagas cuando llegue a tu casa!"\n\n${produccion}`,
        },
        {
          title: "Escena · Veo 3",
          text: `"${p}" (idéntico a la imagen de referencia) cobra vida sobre una mesa de cocina luminosa: le aparecen ojos grandes y expresivos y una boca sonriente en estilo de animación 3D suave, se mueve con alegría y habla a cámara en español: "¡Hola! Soy ${p} y conmigo ${b}." Fondo real ligeramente desenfocado, luz natural, vertical 9:16. ${voz}`,
        },
      ],
    },
    {
      id: "video-pov",
      title: "POV / unboxing",
      description: "Vista en primera persona abriendo el paquete y usando el producto por primera vez. Genera confianza en contra entrega.",
      tools: "Flow / Veo 3 · CapCut.",
      items: [
        {
          title: "Guion (15 s)",
          text: `0–3 s · Texto: "POV: por fin llegó mi ${p} y lo pagué al recibir".\n3–9 s · Manos abriendo la caja, se ve el producto.\n9–13 s · Primer uso: ${b}.\n13–15 s · "${oferta}".\n\n${produccion}`,
        },
        {
          title: "Escena · Veo / Flow",
          text: `Video en primera persona (POV), vertical 9:16: unas manos abren una caja de envío sobre una cama, sacan "${p}" (idéntico a la imagen de referencia) y lo muestran a cámara con emoción. Luz natural de mañana, estilo grabado con celular, sonido de cartón al abrir.`,
        },
      ],
    },
    {
      id: "video-comparacion",
      title: "Comparación: lo común vs. ${p}",
      description: "Pon tu producto al lado de la alternativa común y deja que la diferencia hable.",
      tools: "Flow / Veo 3 · CapCut.",
      items: [
        {
          title: "Guion (15 s)",
          text: `0–3 s · Texto: "No compres otro hasta ver esto".\n3–8 s · Lado izquierdo: la alternativa común falla (${d}).\n8–12 s · Lado derecho: ${p} funciona (${b}).\n12–15 s · "${oferta} · Paga al recibir".\n\n${produccion}`,
          note: "No muestres marcas reales de la competencia: usa una alternativa genérica.",
        },
        {
          title: "Escena · Veo / Flow",
          text: `Video vertical 9:16 en pantalla dividida. Izquierda: un producto genérico sin marca que no funciona bien (${d}), tonos grises. Derecha: "${p}" (idéntico a la imagen de referencia) que funciona perfecto (${b}), tonos cálidos. Cámara fija, iluminación de estudio, estilo comercial.`,
        },
      ],
    },
  ].map((s) => ({ ...s, title: s.title.replace("${p}", p) }));
}

export const VIDEO_FORMATS = [
  "video-ugc",
  "video-demo",
  "video-antes-despues",
  "video-esqueleto",
  "video-animado",
  "video-objeto",
  "video-pov",
  "video-comparacion",
];

export const PRICE_HINT = (pais: string) => `Precio en la moneda de ${pais}`;
