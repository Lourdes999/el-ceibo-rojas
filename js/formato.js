const formateadorPrecio = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export function formatearPrecio(valor) {
  return valor == null ? "A consultar" : formateadorPrecio.format(valor);
}

// Quita tildes y pasa a minúsculas para que "cuchilleria" encuentre "Cuchillería"
export function normalizar(texto) {
  return String(texto).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

const ENTIDADES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escaparHTML(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ENTIDADES[c]);
}
