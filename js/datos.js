import { CONFIG } from "./config.js";

export async function cargarCatalogo() {
  // La versión de vista previa trae el catálogo embebido en la página
  if (window.__CATALOGO__) return window.__CATALOGO__;

  const respuesta = await fetch(CONFIG.rutaCatalogo);
  if (!respuesta.ok) {
    throw new Error(`No se pudo leer ${CONFIG.rutaCatalogo} (error ${respuesta.status}).`);
  }
  return respuesta.json();
}

// Precio de una variante: el suyo propio o, si no tiene, el del producto
export function precioVariante(producto, variante) {
  return variante?.precio ?? producto.precio;
}

// Precio más bajo entre las variantes (para mostrar "Desde $...")
export function precioDesde(producto) {
  const precios = producto.variantes.length
    ? producto.variantes.map((v) => precioVariante(producto, v))
    : [producto.precio];
  const conocidos = precios.filter((p) => p != null);
  return conocidos.length ? Math.min(...conocidos) : null;
}

export function tienePreciosDistintos(producto) {
  return new Set(producto.variantes.map((v) => precioVariante(producto, v))).size > 1;
}

// Código de la lista de precios: el de la variante si tiene uno propio
export function codigoDe(producto, variante) {
  return variante?.codigo ?? producto.codigo ?? "";
}

// Texto de la variante elegida: "Talle 42", "Material Alpaca"
export function describirVariante(producto, variante) {
  if (!variante) return "";
  const titulo = producto.titulo_variantes ?? "Opción";
  return titulo === "Opción" ? variante.nombre : `${titulo} ${variante.nombre}`;
}
