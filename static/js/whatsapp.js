import { CONFIG } from "./config.js";
import { formatearPrecio } from "./formato.js";

export function armarMensaje({ items, subtotal, descuento, total, hayAConsultar, nombre, nota }) {
  const lineas = [`¡Hola ${CONFIG.nombreNegocio}! Quiero hacer este pedido:`, ""];

  for (const item of items) {
    const codigo = item.codigo ? `[${item.codigo}] ` : "";
    const detalle = item.detalle ? ` (${item.detalle})` : "";
    const importe = item.precio == null ? "a consultar" : formatearPrecio(item.precio * item.cantidad);
    lineas.push(`• ${item.cantidad} x ${codigo}${item.nombre}${detalle}: ${importe}`);
  }

  lineas.push("");
  if (descuento > 0) {
    lineas.push(`Subtotal: ${formatearPrecio(subtotal)}`);
    lineas.push(`Pauta mayorista (${CONFIG.descuento.porcentaje} %): -${formatearPrecio(descuento)}`);
  }
  lineas.push(`Total estimado: ${formatearPrecio(total)}`);
  if (hayAConsultar) lineas.push("(más los productos con precio a consultar)");
  if (nombre) lineas.push("", `Mi nombre es ${nombre}.`);
  if (nota) lineas.push("", `Nota: ${nota}`);

  return lineas.join("\n");
}

export function enlaceWhatsApp(mensaje) {
  return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}
