"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { loadLocal, saveLocal } from "@/lib/kit";
import { CopyButton } from "@/components/CopyButton";
import { TextField } from "@/components/kit/KitUI";

type Vars = Record<string, string>;

const DEFAULTS: Vars = {
  cliente: "Laura",
  telefono: "",
  tienda: "Tu Tienda",
  producto: "Faja reductora",
  cantidad: "2",
  total: "$89.900",
  direccion: "Calle 10 # 20-30, apto 501",
  ciudad: "Bogotá",
  transportadora: "Interrapidísimo",
  guia: "240012345678",
  oferta: "15% de descuento en tu próxima compra",
  asesor: "Adrian",
};

const KEY = "academia-whatsapp-v1";

const STAGES: { id: string; title: string; when: string; text: string }[] = [
  {
    id: "confirmacion",
    title: "1. Confirmación del pedido",
    when: "En menos de 1 hora después de que entra el pedido.",
    text: `¡Hola {cliente}! 👋 Te escribe {asesor} de *{tienda}*.\n\nRecibimos tu pedido y queremos confirmarlo antes de enviarlo:\n\n🛍️ Producto: {producto} (x{cantidad})\n💵 Total a pagar al recibir: *{total}*\n📍 Dirección: {direccion}, {ciudad}\n\n¿Confirmas que los datos están correctos y que estarás para recibirlo? Responde *SÍ* para despacharlo hoy mismo 🚚`,
  },
  {
    id: "recordatorio",
    title: "2. Recordatorio si no responde",
    when: "3 a 4 horas después del primer mensaje sin respuesta.",
    text: `Hola {cliente}, ¿cómo estás? 😊 Solo necesitamos tu *SÍ* para enviar tu {producto} hoy.\n\nRecuerda que pagas *{total}* únicamente cuando lo recibas en tus manos. ¿Lo confirmamos?`,
  },
  {
    id: "upsell",
    title: "3. Oferta extra al confirmar (opcional)",
    when: "Justo después de que confirma, antes de despachar.",
    text: `¡Perfecto {cliente}, tu pedido está confirmado! ✅\n\nComo eres cliente nuevo, puedes agregar *otra unidad de {producto}* con un precio especial y te llega en el mismo envío. ¿Te la agrego?`,
  },
  {
    id: "guia",
    title: "4. Pedido enviado + guía",
    when: "Cuando el proveedor genera la guía.",
    text: `¡Buenas noticias {cliente}! 🎉 Tu pedido ya fue enviado.\n\n🛍️ {producto}\n📍 {direccion}, {ciudad}\n💵 Pagas al recibir: *{total}*\n🚚 Transportadora: {transportadora}\n🔎 Guía: *{guia}*\n\nTiempo estimado de entrega: 2 a 5 días hábiles. Te avisamos cualquier novedad 🙌`,
  },
  {
    id: "novedad-direccion",
    title: "5a. Novedad: dirección incompleta",
    when: "Apenas la transportadora reporta la novedad.",
    text: `Hola {cliente} 👋 La transportadora {transportadora} intentó entregar tu {producto}, pero reporta que la dirección está incompleta.\n\n¿Nos ayudas con la dirección exacta (barrio, número de casa/apto y un punto de referencia)? Así lo reprogramamos para mañana 🚚`,
  },
  {
    id: "novedad-ausente",
    title: "5b. Novedad: no estaba en casa",
    when: "El mismo día de la novedad.",
    text: `Hola {cliente}, hoy pasaron a entregar tu {producto} pero no encontraron a nadie 😕\n\n¿Qué día y en qué horario te queda mejor recibirlo? Si quieres, alguien más puede recibirlo y pagar *{total}* por ti.`,
  },
  {
    id: "novedad-rechazo",
    title: "5c. Novedad: no quiso recibir / no tenía el dinero",
    when: "Antes de que la transportadora lo devuelva.",
    text: `Hola {cliente}, la transportadora nos informa que no se pudo completar la entrega de tu {producto}.\n\n¿Pasó algo? Si fue por el dinero, podemos programarlo para el día que te quede mejor. Tu pedido sigue reservado con el mismo precio 🙏`,
  },
  {
    id: "reparto",
    title: "6. Sale a entrega hoy",
    when: "Cuando el pedido aparece «En reparto».",
    text: `¡Hoy es el día {cliente}! 🚚 Tu {producto} sale a entrega hoy.\n\nPor favor ten listo *{total}* en efectivo (o el medio de pago de la transportadora) y mantén tu celular a la mano por si el mensajero te llama 📞`,
  },
  {
    id: "entregado",
    title: "7. Entregado + pedir opinión",
    when: "1 a 2 días después de la entrega.",
    text: `¡Hola {cliente}! 😊 ¿Cómo te fue con tu {producto}?\n\nNos encantaría saber tu opinión. Si te gustó, ¿nos regalas una foto o un comentario? Nos ayuda muchísimo 💛`,
  },
  {
    id: "recompra",
    title: "8. Recompra / fidelización",
    when: "Entre 20 y 30 días después (ideal en productos que se acaban).",
    text: `¡Hola {cliente}! Esperamos que sigas disfrutando tu {producto} 💛\n\nComo ya eres parte de *{tienda}*, tenemos algo especial para ti: *{oferta}*. Válido solo esta semana. ¿Te lo apartamos?`,
  },
  {
    id: "rescate",
    title: "9. Rescate de pedido cancelado",
    when: "Si el cliente canceló o no confirmó en 24 h.",
    text: `Hola {cliente}, vimos que tu pedido de {producto} quedó sin confirmar 😕\n\nLo tenemos guardado con el mismo precio *{total}* y envío gratis. ¿Quieres que te lo enviemos? Pagas solo cuando lo recibas.`,
  },
];

const render = (t: string, v: Vars) => t.replace(/\{(\w+)\}/g, (_, k: string) => (v[k]?.trim() ? v[k] : `[${k}]`));

export function WhatsAppTemplates() {
  const [vars, setVars] = useState<Vars>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const saved = loadLocal<Vars>(KEY);
    if (saved) setVars({ ...DEFAULTS, ...saved });
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) saveLocal(KEY, vars);
  }, [vars, loaded]);
  const set = (k: string, value: string) => setVars((s) => ({ ...s, [k]: value }));
  const phone = useMemo(() => vars.telefono.replace(/\D/g, ""), [vars.telefono]);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      <aside className="card space-y-3 p-5 lg:sticky lg:top-32">
        <h2 className="font-semibold">Datos del pedido</h2>
        <TextField v={vars} set={set} k="cliente" label="Nombre del cliente" />
        <TextField v={vars} set={set} k="telefono" label="WhatsApp del cliente" placeholder="573001234567" hint="Con indicativo, sin +. Para abrir el chat directo." />
        <TextField v={vars} set={set} k="tienda" label="Nombre de tu tienda" />
        <TextField v={vars} set={set} k="asesor" label="Tu nombre (asesor)" />
        <TextField v={vars} set={set} k="producto" label="Producto" />
        <div className="grid grid-cols-2 gap-3">
          <TextField v={vars} set={set} k="cantidad" label="Cantidad" />
          <TextField v={vars} set={set} k="total" label="Total a pagar" />
        </div>
        <TextField v={vars} set={set} k="direccion" label="Dirección" />
        <TextField v={vars} set={set} k="ciudad" label="Ciudad" />
        <TextField v={vars} set={set} k="transportadora" label="Transportadora" />
        <TextField v={vars} set={set} k="guia" label="Número de guía" />
        <TextField v={vars} set={set} k="oferta" label="Oferta de recompra" />
      </aside>

      <div className="min-w-0 space-y-4">
        {STAGES.map((s) => {
          const text = render(s.text, vars);
          return (
            <article key={s.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="text-xs text-zinc-500">⏱️ {s.when}</p>
                </div>
                <div className="flex gap-2">
                  <CopyButton text={text} />
                  <a
                    href={`https://wa.me/${phone}?text=${encodeURIComponent(text)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm"
                  >
                    <MessageCircle className="size-3.5" /> Abrir WhatsApp
                  </a>
                </div>
              </div>
              <pre className="mt-3 rounded-xl bg-emerald-50 p-4 font-sans text-sm whitespace-pre-wrap text-zinc-800">{text}</pre>
            </article>
          );
        })}
      </div>
    </div>
  );
}
