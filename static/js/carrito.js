import { CONFIG } from "./config.js";
import { precioVariante, codigoDe, describirVariante } from "./datos.js";

// Estado del carrito. Se guarda en el navegador para que el pedido
// no se pierda si el cliente cierra la pestaña.
const CLAVE_STORAGE = "elceibo:carrito";

let items = leerGuardado();
const suscriptores = new Set();

function leerGuardado() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_STORAGE));
    return Array.isArray(guardado) ? guardado : [];
  } catch {
    return [];
  }
}

function guardarYAvisar() {
  try {
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(items));
  } catch {
    // sin almacenamiento disponible: el carrito funciona igual mientras dure la visita
  }
  suscriptores.forEach((funcion) => funcion(items));
}

export const carrito = {
  items: () => items,

  // variante es un objeto { nombre, precio } o null si el producto no tiene
  agregar(producto, variante = null, cantidad = 1) {
    const nombreVariante = variante?.nombre ?? "";
    const clave = `${producto.id}::${nombreVariante}`;
    const existente = items.find((item) => item.clave === clave);
    if (existente) {
      existente.cantidad += cantidad;
    } else {
      items.push({
        clave,
        id: producto.id,
        nombre: producto.nombre,
        precio: precioVariante(producto, variante),
        codigo: codigoDe(producto, variante),
        variante: nombreVariante,
        detalle: describirVariante(producto, variante),
        cantidad,
      });
    }
    guardarYAvisar();
  },

  cambiarCantidad(clave, diferencia) {
    const item = items.find((i) => i.clave === clave);
    if (!item) return;
    item.cantidad += diferencia;
    if (item.cantidad <= 0) items = items.filter((i) => i.clave !== clave);
    guardarYAvisar();
  },

  quitar(clave) {
    items = items.filter((i) => i.clave !== clave);
    guardarYAvisar();
  },

  vaciar() {
    items = [];
    guardarYAvisar();
  },

  // Actualiza nombre y precio con el catálogo actual y descarta productos
  // o variantes que ya no existen (por si cambiaron desde la última visita)
  sincronizar(productos) {
    const porId = new Map(productos.map((p) => [p.id, p]));
    items = items.flatMap((item) => {
      const producto = porId.get(item.id);
      if (!producto) return [];
      const variante = producto.variantes.find((v) => v.nombre === item.variante) ?? null;
      if (item.variante && !variante) return [];
      return [{
        ...item,
        nombre: producto.nombre,
        precio: precioVariante(producto, variante),
        codigo: codigoDe(producto, variante),
        detalle: describirVariante(producto, variante),
      }];
    });
    guardarYAvisar();
  },

  cantidadTotal: () => items.reduce((suma, i) => suma + i.cantidad, 0),
  subtotal: () => items.reduce((suma, i) => suma + (i.precio ?? 0) * i.cantidad, 0),

  // Descuento por monto: se aplica cuando el subtotal supera el mínimo
  descuento() {
    const { montoMinimo, porcentaje } = CONFIG.descuento;
    const subtotal = carrito.subtotal();
    return subtotal > montoMinimo ? Math.round((subtotal * porcentaje) / 100) : 0;
  },

  faltaParaDescuento: () => Math.max(0, CONFIG.descuento.montoMinimo - carrito.subtotal() + 1),
  total: () => carrito.subtotal() - carrito.descuento(),
  tieneAConsultar: () => items.some((i) => i.precio == null),

  suscribir(funcion) {
    suscriptores.add(funcion);
    funcion(items);
  },
};
