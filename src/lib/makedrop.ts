/** Marca de MakeDrop IA (las imágenes son las de la comunidad de Skool de Adrián). */
const SKOOL_ASSETS = "https://assets.skool.com/f/7f4361935a544c12b4ed9200b926042c";

export const MAKEDROP = {
  name: "MakeDrop IA",
  fullName: "MakeDrop IA | Ceoadriang",
  logo: `${SKOOL_ASSETS}/a1511aa96cc148d2a676896b07ac9aa6728da9f9e2a5479294f7826339b10315.jpg`,
  hero: `${SKOOL_ASSETS}/54c317c1ed614b41b521008a1824104cdbabcc9b19374e5a901fcb93f58eefa4.png`,
  gallery: [
    { src: `${SKOOL_ASSETS}/d1c1aad81e0c470f8f7ac55464dc7929552d236c41664fc8ac46738a62f29783.png`, alt: "Bonos IA de MakeDrop IA" },
    { src: `${SKOOL_ASSETS}/c48e05ea6b9c4a229ba40c944f13684451fd42c2420149849bf63dc7972f4c2f.png`, alt: "Resultados de estudiantes de MakeDrop IA" },
    { src: `${SKOOL_ASSETS}/46f7187256c4410da949d57c69306e23f1053bd6f7af4fee9acd446af1778334.png`, alt: "Preguntas frecuentes de MakeDrop IA" },
  ],
  skoolUrl: "https://www.skool.com/adriang-society-6943",
  /** Video de la academia que se muestra en /membresia. */
  video: "https://drive.google.com/file/d/1KWzE5BVEfsETCnHMGNYAuIP39hmG5ZY0/view?usp=sharing",
  whatsapp: "573208652165",
} as const;

const drive = (id: string) => `https://drive.google.com/thumbnail?id=${id}&sz=w1200`;

/** Casos de éxito reales de estudiantes (capturas sin datos de clientes). Se muestran en /membresia y en la portada. */
export const SUCCESS_CASES = [
  { title: "Emilio", text: "Su proceso en la mentoría y el crecimiento de sus pedidos en Shopify, contado por él mismo.", img: drive("1T7XX9NOwyLvdfTudtxj1Zblf5cEtmK71") },
  { title: "Jorge", text: "En octubre me escribió para celebrar la primera venta de su tienda.", img: null },
  { title: "Fabián", text: "\"Cayó un pedido masivo\": así me escribió Fabián cuando le empezaron a entrar pedidos grandes.", img: drive("1FE55Ytjn-nSLgLNhqQi_dWCDi3FB3MXY") },
  { title: "$2,2 millones COP en ventas", text: "Ventas totales de la tienda de un estudiante en Shopify.", img: drive("1Z2qtccIVputhpl11cMA3BA5Qst-YUxYl") },
  { title: "Pedidos todos los días", text: "Lista de pedidos contra entrega de un estudiante.", img: drive("1mbhuYe04Xs4IwORgE0oL8tSsBgQwKFI6") },
] as const;

/** Enlace de WhatsApp con un mensaje ya escrito. */
export function whatsappLink(number: string, text: string) {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
