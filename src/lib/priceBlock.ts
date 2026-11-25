/**
 * Bloque de precio y confianza para la página de producto de Shopify (va en un bloque «Liquid personalizado»).
 * El mismo diseño sirve para la vista previa del estudio (con los precios del alumno) y para el código Liquid
 * (con los precios reales de cada producto, así sirve para todas las landings de la tienda).
 */
import { toShopifyPrice } from "./landing";

export type PriceBlockOptions = {
  store: string;
  country: string;
  /** Ciudad desde donde despacha (vacío = «a todo el país»). */
  city: string;
  freeShipping: boolean;
  cod: boolean;
  whatsapp: boolean;
  guarantee: boolean;
  /** Derecho de retracto (Ley 1480, solo Colombia). */
  retracto: boolean;
  minDays: number;
  maxDays: number;
};

const MONTHS = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sept.", "oct.", "nov.", "dic."];

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!).replace(/\{\{|\{%/g, "{ {");

export const formatCop = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;

const ICON = {
  shield: `<svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="#4a9a4f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>`,
  cash: `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#4b5068" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/></svg>`,
  chat: `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#4b5068" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/><path d="m9 12 2 2 4-4"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#4b5068" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`,
  truck: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#4a9a4f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62L18.3 8.38A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>`,
  guard: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#4b5068" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>`,
  refresh: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#4b5068" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>`,
  wa: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#4a9a4f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/><path d="m9 12 2 2 4-4"/></svg>`,
};

export const PRICE_BLOCK_CSS = `.mdp{font-family:Poppins,system-ui,-apple-system,"Segoe UI",Arial,sans-serif;color:#1a1f5c;max-width:620px;margin:8px 0 16px}
.mdp *{box-sizing:border-box}.mdp p{margin:0}
.mdp-price{display:grid;grid-template-columns:auto 1fr;column-gap:16px;align-items:center;margin-bottom:22px}
.mdp-was{grid-column:2;color:#a3a6b8;font-size:17px;font-weight:500;text-decoration:line-through}
.mdp-label{color:#6b6f86;font-size:24px}
.mdp-row{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.mdp-now{font-size:46px;line-height:1.05;font-weight:800;letter-spacing:-1.5px;color:#1a1f5c}
.mdp-badge{background:#1a1f5c;color:#fff;font-size:15px;font-weight:700;padding:4px 10px;border-radius:7px;white-space:nowrap}
.mdp-save{grid-column:2;justify-self:start;margin-top:10px;background:#d35757;color:#fff;font-weight:700;font-size:17px;padding:8px 20px;border-radius:999px}
.mdp-card{border:1.5px solid #e9e9ef;border-radius:16px;padding:20px 16px 18px;margin-bottom:12px;background:#fff}
.mdp-head{display:flex;align-items:center;gap:16px;padding:0 8px}
.mdp-title{color:#4a9a4f;font-weight:700;font-size:20px;line-height:1.2}
.mdp-sub{color:#2b2f45;font-size:15px}
.mdp-bar{height:7px;border-radius:9px;margin:18px 0 14px;background:linear-gradient(90deg,#f7dede 0%,#fbefcf 35%,#e7f2dd 65%,#4a9a4f 100%)}
.mdp-cols{display:grid;grid-template-columns:repeat(3,1fr)}
.mdp-col{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;color:#4b5068;font-size:13.5px;line-height:1.3;padding:0 8px}
.mdp-col+.mdp-col{border-left:1px solid #ececf1}
.mdp-info{background:#f2f2f4;border-radius:16px;padding:18px 16px;margin-bottom:12px;display:grid;gap:14px}
.mdp-line{display:flex;gap:12px;align-items:flex-start;font-size:15px;line-height:1.45;color:#1a1f5c}
.mdp-line svg{flex:none;margin-top:1px}
.mdp-green{color:#4a9a4f}.mdp-blue{color:#3b82f6}.mdp-muted{color:#6b6f86}
.mdp-express{color:#4a9a4f;font-weight:800;font-style:italic;letter-spacing:.3px}
.mdp-wa{background:#eaf4ee;border-radius:16px;padding:16px;display:flex;gap:12px;align-items:flex-start;font-size:15px;line-height:1.45;color:#1f2433}
.mdp-wa svg{flex:none;margin-top:2px}
@media (max-width:480px){.mdp-now{font-size:38px}.mdp-label{font-size:19px}.mdp-title{font-size:17px}.mdp-col{font-size:12px}.mdp-line,.mdp-wa{font-size:14px}}`;

const FONT_LINK = `<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">`;

type Slots = {
  price: string;
  compare?: string;
  pct?: string;
  savings?: string;
  delivery: string;
  /** Envuelve las partes que solo salen si hay precio de antes. */
  ifCompare: (html: string) => string;
};

function body(o: PriceBlockOptions, s: Slots) {
  const store = esc(o.store.trim() || "nuestra tienda");
  const dispatch = o.city.trim() ? `Despacho rápido desde ${esc(o.city.trim())}` : `Despacho rápido a todo ${esc(o.country || "el país")}`;
  const colombia = /colombia/i.test(o.country);
  const shipLine = [
    o.freeShipping ? `<span class="mdp-green">Envío Gratis</span> <span style="color:#f5b301">⚡</span> <span class="mdp-express">EXPRESS</span> · <span class="mdp-blue">Disponible</span>` : `<span class="mdp-green">Envío</span> · <span class="mdp-blue">Disponible</span>`,
    o.cod ? "Pago Contraentrega" : "",
    s.delivery,
  ]
    .filter(Boolean)
    .join("<br>");
  return `<div class="mdp">
  <div class="mdp-price">
    ${s.ifCompare(`<p class="mdp-was">DE ${s.compare}</p>`)}
    <span class="mdp-label">Precio:</span>
    <div class="mdp-row"><span class="mdp-now">${s.price}</span>${s.ifCompare(`<span class="mdp-badge">↓ ${s.pct}%</span>`)}</div>
    ${s.ifCompare(`<p class="mdp-save">${s.savings} de descuento</p>`)}
  </div>
  <div class="mdp-card">
    <div class="mdp-head">${ICON.shield}<div><p class="mdp-title">Compra segura en ${store}</p><p class="mdp-sub">${o.cod ? "No pagas nada hasta tenerlo en tus manos" : "Tu compra está protegida de principio a fin"}</p></div></div>
    <div class="mdp-bar"></div>
    <div class="mdp-cols">
      <div class="mdp-col">${ICON.cash}<span>${o.cod ? "Pagas al recibir" : "Pago seguro"}</span></div>
      <div class="mdp-col">${ICON.chat}<span>${o.whatsapp ? "Te confirmamos por WhatsApp" : "Atención personalizada"}</span></div>
      <div class="mdp-col">${ICON.clock}<span>${dispatch}</span></div>
    </div>
  </div>
  <div class="mdp-info">
    <div class="mdp-line">${ICON.truck}<p>${shipLine}</p></div>
    ${o.guarantee ? `<div class="mdp-line">${ICON.guard}<p>Compra Garantizada. <span class="mdp-muted">Si llega con defecto, lo resolvemos</span></p></div>` : ""}
    ${o.retracto && colombia ? `<div class="mdp-line">${ICON.refresh}<p>Derecho de retracto. <span class="mdp-muted">Tienes 5 días hábiles para devolverlo (Ley 1480).</span></p></div>` : ""}
  </div>
  ${o.whatsapp ? `<div class="mdp-wa">${ICON.wa}<p><strong>Te escribimos por WhatsApp</strong> para confirmar tu pedido antes de enviarlo. ${o.cod ? "Lo revisas al recibir y ahí pagas." : "Así sabes cuándo llega."}</p></div>` : ""}
</div>`;
}

function days(o: PriceBlockOptions) {
  const min = Math.max(0, Math.min(30, Math.round(o.minDays)));
  const max = Math.max(min, Math.min(45, Math.round(o.maxDays)));
  return { min, max };
}

/** Versión para ver en el estudio, con los precios que escribió el alumno. */
export function priceBlockPreview(o: PriceBlockOptions, price: string, compare: string | null) {
  const now = Number(toShopifyPrice(price));
  const before = Number(toShopifyPrice(compare));
  const hasCompare = Boolean(now && before && before > now);
  const { min, max } = days(o);
  const at = (d: number) => {
    const date = new Date(Date.now() + d * 86400000);
    return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  };
  return (
    `<style>${PRICE_BLOCK_CSS}</style>` +
    body(o, {
      price: now ? formatCop(now) : esc(price),
      compare: hasCompare ? formatCop(before) : "",
      pct: hasCompare ? String(Math.round((1 - now / before) * 100)) : "",
      savings: hasCompare ? formatCop(before - now) : "",
      delivery: `Se entrega entre el: ${at(min)} al ${at(max)}`,
      ifCompare: (html) => (hasCompare ? html : ""),
    })
  );
}

/** Código para pegar en Shopify (bloque «Liquid personalizado» de la página de producto). Toma el precio de cada producto. */
export function priceBlockLiquid(o: PriceBlockOptions) {
  const { min, max } = days(o);
  const head = `{%- comment -%} Bloque de precio y confianza · MakeDrop IA. Toma el precio y el precio de antes de cada producto. {%- endcomment -%}
{%- assign mdp_v = product.selected_or_first_available_variant -%}
{%- assign mdp_price = mdp_v.price -%}
{%- assign mdp_compare = mdp_v.compare_at_price | default: 0 -%}
{%- assign mdp_pct = 0 -%}
{%- if mdp_compare > mdp_price -%}{%- assign mdp_pct = mdp_compare | minus: mdp_price | times: 100.0 | divided_by: mdp_compare | round -%}{%- endif -%}
{%- assign mdp_now = 'now' | date: '%s' | plus: 0 -%}
{%- assign mdp_d1 = mdp_now | plus: ${min * 86400} -%}
{%- assign mdp_d2 = mdp_now | plus: ${max * 86400} -%}
{%- assign mdp_months = "${MONTHS.join(",")}" | split: "," -%}
{%- assign mdp_m1 = mdp_d1 | date: '%m' | minus: 1 -%}
{%- assign mdp_m2 = mdp_d2 | date: '%m' | minus: 1 -%}
`;
  return (
    head +
    FONT_LINK +
    `\n<style>${PRICE_BLOCK_CSS}</style>\n` +
    body(o, {
      price: "{{ mdp_price | money_without_trailing_zeros }}",
      compare: "{{ mdp_compare | money_without_trailing_zeros }}",
      pct: "{{ mdp_pct }}",
      savings: "{{ mdp_compare | minus: mdp_price | money_without_trailing_zeros }}",
      delivery: "Se entrega entre el: {{ mdp_d1 | date: '%-d' }} {{ mdp_months[mdp_m1] }} al {{ mdp_d2 | date: '%-d' }} {{ mdp_months[mdp_m2] }}",
      ifCompare: (html) => `{%- if mdp_compare > mdp_price -%}${html}{%- endif -%}`,
    }) +
    "\n"
  );
}

export const PRICE_BLOCK_STEPS = [
  "En Shopify entra a Tienda online → Personalizar y abre la plantilla de Productos.",
  "En la información del producto pulsa «Agregar bloque» → «Liquid personalizado» y pega el código.",
  "Arrástralo debajo del título y oculta el bloque «Precio» del tema para que no salga dos veces.",
  "Guarda. Sirve para todos tus productos: toma el precio y el precio de antes de cada uno.",
];
