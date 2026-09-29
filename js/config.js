// Datos del negocio. Acá se cambian el WhatsApp, el descuento y la ruta del catálogo.
export const CONFIG = {
  nombreNegocio: "El Ceibo",
  // Formato internacional sin "+", espacios ni guiones: 54 9 + característica + número
  whatsapp: "5492474468603",
  rutaCatalogo: "data/productos.json",
  // Compras mayores a este monto tienen descuento sobre el total
  descuento: { montoMinimo: 200000, porcentaje: 15 },
};
