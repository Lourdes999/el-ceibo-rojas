import { CONFIG } from "./config.js";
import { cargarCatalogo, precioDesde, precioVariante } from "./datos.js";
import { carrito } from "./carrito.js";
import { armarMensaje, enlaceWhatsApp } from "./whatsapp.js";
import { formatearPrecio, normalizar } from "./formato.js";
import {
  ILUSTRACION, htmlCategorias, htmlOpcionesCategorias, htmlMosaico,
  htmlGrilla, htmlDetalle, htmlItemsCarrito,
} from "./ui.js";
import { iniciarEncabezado, marcarFotosPendientes } from "./encabezado.js";

// Cuántos destacados se muestran en el inicio del catálogo
const MAX_DESTACADOS = 8;

const estado = {
  categorias: [],
  productos: [],
  categoria: null, // null = inicio del catálogo (destacados + categorías)
  busqueda: "",
  orden: "destacados",
};

const el = (id) => document.getElementById(id);

const nodos = {
  encabezado: el("encabezado"),
  menu: el("menu"),
  botonMenu: el("boton-menu"),
  seccion: el("catalogo"),
  titulo: el("titulo-catalogo"),
  volver: el("volver-catalogo"),
  buscador: el("buscador"),
  campoOrden: el("campo-orden"),
  orden: el("orden"),
  vistaInicio: el("vista-inicio"),
  vistaLista: el("vista-lista"),
  bloqueDestacados: el("bloque-destacados"),
  destacados: el("grilla-destacados"),
  mosaico: el("mosaico"),
  categorias: el("categorias"),
  selectorCategoria: el("selector-categoria"),
  resultado: el("resultado"),
  grilla: el("grilla"),
  modal: el("modal-producto"),
  panel: el("carrito"),
  fondo: el("fondo-carrito"),
  abrirCarrito: el("abrir-carrito"),
  contador: el("contador-carrito"),
  items: el("carrito-items"),
  total: el("carrito-total"),
  filaSubtotal: el("fila-subtotal"),
  subtotal: el("carrito-subtotal"),
  filaDescuento: el("fila-descuento"),
  descuento: el("carrito-descuento"),
  avisoDescuento: el("aviso-descuento"),
  aviso: el("carrito-aviso"),
  nombre: el("cliente-nombre"),
  nota: el("cliente-nota"),
  enviar: el("enviar-pedido"),
  vaciar: el("vaciar-carrito"),
  toast: el("toast"),
};

/* ---------- Catálogo ---------- */

function nombreCategoria(id) {
  return estado.categorias.find((c) => c.id === id)?.nombre ?? "";
}

function coincideBusqueda(producto, texto) {
  // También se puede buscar por código de la lista de precios ("027")
  // y por nombre de variante ("alpaca" encuentra la bombilla de alpaca)
  const variantes = producto.variantes.map((v) => `${v.nombre} ${v.codigo ?? ""}`).join(" ");
  return normalizar(
    `${producto.nombre} ${producto.descripcion} ${nombreCategoria(producto.categoria)} ${producto.codigo ?? ""} ${variantes}`
  ).includes(texto);
}

function ordenar(lista) {
  // Los productos a consultar van al final cuando se ordena por precio
  const precio = (p, siNulo) => precioDesde(p) ?? siNulo;
  const criterios = {
    destacados: (a, b) => b.destacado - a.destacado || b.disponible - a.disponible,
    "precio-asc": (a, b) => precio(a, Infinity) - precio(b, Infinity),
    "precio-desc": (a, b) => precio(b, -Infinity) - precio(a, -Infinity),
    nombre: (a, b) => a.nombre.localeCompare(b.nombre, "es"),
  };
  return [...lista].sort(criterios[estado.orden]);
}

function contarPorCategoria() {
  const conteos = {};
  for (const p of estado.productos) conteos[p.categoria] = (conteos[p.categoria] ?? 0) + 1;
  return conteos;
}

// Decide qué se muestra: el inicio (destacados + categorías), una categoría o una búsqueda
function dibujarCatalogo() {
  const texto = normalizar(estado.busqueda.trim());
  const categoria = estado.categorias.find((c) => c.id === estado.categoria);
  const enInicio = !texto && !categoria;

  nodos.vistaInicio.hidden = !enInicio;
  nodos.vistaLista.hidden = enInicio;
  nodos.volver.hidden = enInicio;
  nodos.campoOrden.hidden = enInicio;

  if (enInicio) {
    nodos.titulo.textContent = "Catálogo";
    const destacados = estado.productos.filter((p) => p.destacado).slice(0, MAX_DESTACADOS);
    nodos.bloqueDestacados.hidden = destacados.length === 0;
    nodos.destacados.innerHTML = htmlGrilla(destacados, nombreCategoria);
    nodos.mosaico.innerHTML = htmlMosaico(estado.categorias, estado.productos);
    return;
  }

  // Con texto en el buscador se busca en todo el catálogo
  const lista = texto
    ? estado.productos.filter((p) => coincideBusqueda(p, texto))
    : estado.productos.filter((p) => p.categoria === categoria.id);
  const activa = texto ? null : categoria.id;

  nodos.titulo.textContent = texto ? "Resultados" : categoria.nombre;
  nodos.categorias.innerHTML = htmlCategorias(estado.categorias, activa, contarPorCategoria());
  nodos.selectorCategoria.innerHTML = htmlOpcionesCategorias(estado.categorias, activa);
  nodos.grilla.innerHTML = htmlGrilla(ordenar(lista), nombreCategoria);

  const cantidad = `${lista.length} ${lista.length === 1 ? "producto" : "productos"}`;
  nodos.resultado.textContent = texto
    ? `${cantidad} para “${estado.busqueda.trim()}”.`
    : [categoria.descripcion, `${cantidad}.`].filter(Boolean).join(" ");
}

// Cada categoría tiene su propio enlace (#catalogo/mates) para poder compartirla
function leerRuta() {
  const [seccion, id] = decodeURIComponent(location.hash.slice(1)).split("/");
  if (seccion !== "catalogo") return false;
  estado.categoria = estado.categorias.some((c) => c.id === id) ? id : null;
  return true;
}

function irACategoria(id) {
  location.hash = id ? `catalogo/${id}` : "catalogo";
}

/* ---------- Detalle de producto ---------- */

function abrirDetalle(id) {
  const producto = estado.productos.find((p) => p.id === id);
  if (!producto) return;

  const consulta = enlaceWhatsApp(`¡Hola ${CONFIG.nombreNegocio}! Quería consultar por: ${producto.nombre}.`);
  nodos.modal.innerHTML = htmlDetalle(producto, nombreCategoria, consulta);

  let cantidad = 1;
  const salida = nodos.modal.querySelector("#detalle-cantidad");

  nodos.modal.querySelectorAll("[data-cantidad]").forEach((boton) =>
    boton.addEventListener("click", () => {
      cantidad = Math.max(1, cantidad + Number(boton.dataset.cantidad));
      salida.textContent = cantidad;
    })
  );

  // Al elegir otra variante se actualiza el precio mostrado
  const varianteElegida = () => {
    const marcada = nodos.modal.querySelector('input[name="variante"]:checked');
    return marcada ? producto.variantes[Number(marcada.value)] : null;
  };
  nodos.modal.querySelectorAll('input[name="variante"]').forEach((opcion) =>
    opcion.addEventListener("change", () => {
      nodos.modal.querySelector("#detalle-precio").textContent = formatearPrecio(precioVariante(producto, varianteElegida()));
    })
  );

  // Galería: tocar una miniatura cambia la foto principal
  const fotoPrincipal = nodos.modal.querySelector(".detalle__img");
  nodos.modal.querySelectorAll("[data-foto]").forEach((miniatura) =>
    miniatura.addEventListener("click", () => {
      fotoPrincipal.src = miniatura.dataset.foto;
      nodos.modal.querySelectorAll("[data-foto]").forEach((m) => m.setAttribute("aria-pressed", String(m === miniatura)));
    })
  );

  nodos.modal.querySelector("#detalle-agregar")?.addEventListener("click", () => {
    carrito.agregar(producto, varianteElegida(), cantidad);
    nodos.modal.close();
    avisar(`Agregaste ${producto.nombre} al pedido`);
  });

  nodos.modal.showModal();
}

/* ---------- Carrito ---------- */

function abrirCarrito() {
  nodos.panel.classList.add("abierto");
  nodos.panel.setAttribute("aria-hidden", "false");
  nodos.panel.inert = false;
  nodos.fondo.hidden = false;
  document.body.classList.add("sin-scroll");
  nodos.panel.querySelector("[data-cerrar-carrito]").focus();
}

function cerrarCarrito() {
  nodos.panel.classList.remove("abierto");
  nodos.panel.setAttribute("aria-hidden", "true");
  nodos.panel.inert = true;
  nodos.fondo.hidden = true;
  document.body.classList.remove("sin-scroll");
  nodos.abrirCarrito.focus();
}

function actualizarEnlacePedido() {
  const items = carrito.items();
  const vacio = items.length === 0;
  nodos.enviar.classList.toggle("deshabilitado", vacio);
  nodos.enviar.setAttribute("aria-disabled", String(vacio));
  nodos.enviar.href = vacio
    ? "#"
    : enlaceWhatsApp(
        armarMensaje({
          items,
          subtotal: carrito.subtotal(),
          descuento: carrito.descuento(),
          total: carrito.total(),
          hayAConsultar: carrito.tieneAConsultar(),
          nombre: nodos.nombre.value.trim(),
          nota: nodos.nota.value.trim(),
        })
      );
}

function dibujarCarrito(items) {
  const cantidad = carrito.cantidadTotal();
  nodos.contador.textContent = cantidad;
  nodos.contador.hidden = cantidad === 0;

  nodos.items.innerHTML = htmlItemsCarrito(items);
  const descuento = carrito.descuento();
  nodos.subtotal.textContent = formatearPrecio(carrito.subtotal());
  nodos.descuento.textContent = `-${formatearPrecio(descuento)}`;
  nodos.filaSubtotal.hidden = descuento === 0;
  nodos.filaDescuento.hidden = descuento === 0;
  nodos.filaDescuento.firstElementChild.textContent = `Pauta mayorista (${CONFIG.descuento.porcentaje} %)`;
  nodos.total.textContent = formatearPrecio(carrito.total());

  // Aviso de cuánto falta para el descuento, solo si ya hay algo en el pedido
  const falta = carrito.faltaParaDescuento();
  nodos.avisoDescuento.hidden = items.length === 0 || falta === 0;
  nodos.avisoDescuento.textContent = `Sumando ${formatearPrecio(falta)} más, accedés a la pauta mayorista: ${CONFIG.descuento.porcentaje} % de descuento en el total.`;
  nodos.aviso.hidden = !carrito.tieneAConsultar();
  nodos.vaciar.hidden = items.length === 0;
  actualizarEnlacePedido();
}

/* ---------- Avisos ---------- */

let temporizadorAviso;
function avisar(texto) {
  nodos.toast.textContent = texto;
  nodos.toast.classList.add("visible");
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => nodos.toast.classList.remove("visible"), 2400);
}

/* ---------- Eventos ---------- */

function conectarEventos() {
  window.addEventListener("hashchange", () => {
    if (!leerRuta()) return;
    estado.busqueda = "";
    nodos.buscador.value = "";
    dibujarCatalogo();
    nodos.seccion.scrollIntoView();
  });

  nodos.selectorCategoria.addEventListener("change", () => irACategoria(nodos.selectorCategoria.value));

  nodos.buscador.addEventListener("input", () => {
    estado.busqueda = nodos.buscador.value;
    dibujarCatalogo();
  });

  nodos.orden.addEventListener("change", () => {
    estado.orden = nodos.orden.value;
    dibujarCatalogo();
  });

  // Un solo manejador para las tarjetas de destacados y de la lista
  nodos.seccion.addEventListener("click", (e) => {
    const boton = e.target.closest("[data-accion]");
    if (!boton) return;
    const producto = estado.productos.find((p) => p.id === boton.dataset.id);
    if (boton.dataset.accion === "agregar" && producto) {
      carrito.agregar(producto);
      avisar(`Agregaste ${producto.nombre} al pedido`);
    } else {
      abrirDetalle(boton.dataset.id);
    }
  });

  // Menú desplegable en el celular
  nodos.botonMenu.addEventListener("click", () => {
    const abierto = nodos.encabezado.classList.toggle("menu-abierto");
    nodos.botonMenu.setAttribute("aria-expanded", String(abierto));
  });
  nodos.menu.addEventListener("click", (e) => {
    if (!e.target.closest("a")) return;
    nodos.encabezado.classList.remove("menu-abierto");
    nodos.botonMenu.setAttribute("aria-expanded", "false");
  });

  // Cerrar el detalle con la ×, tocando afuera o con Escape (nativo de <dialog>)
  nodos.modal.addEventListener("click", (e) => {
    if (e.target === nodos.modal || e.target.closest("[data-cerrar]")) nodos.modal.close();
  });

  nodos.abrirCarrito.addEventListener("click", abrirCarrito);
  nodos.fondo.addEventListener("click", cerrarCarrito);
  nodos.panel.querySelector("[data-cerrar-carrito]").addEventListener("click", cerrarCarrito);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nodos.panel.classList.contains("abierto")) cerrarCarrito();
  });

  nodos.items.addEventListener("click", (e) => {
    const cambio = e.target.closest("[data-cambio]");
    const quitar = e.target.closest("[data-quitar]");
    if (cambio) carrito.cambiarCantidad(cambio.dataset.item, Number(cambio.dataset.cambio));
    if (quitar) carrito.quitar(quitar.dataset.quitar);
  });

  nodos.vaciar.addEventListener("click", () => carrito.vaciar());
  nodos.nombre.addEventListener("input", actualizarEnlacePedido);
  nodos.nota.addEventListener("input", actualizarEnlacePedido);
  nodos.enviar.addEventListener("click", (e) => {
    if (carrito.items().length === 0) e.preventDefault();
  });

  // Si una foto no carga, se reemplaza por la ilustración de "Foto próximamente"
  document.addEventListener(
    "error",
    (e) => {
            const img = e.target;
      if (img.tagName !== "IMG" || img.dataset.reemplazada || img.closest("figure[data-sugerencia]")) return;
      // En una tesela de categoría, si la foto falla se vuelve al fondo liso
      if (img.classList.contains("tesela__img")) {
        img.closest(".tesela").classList.remove("tesela--foto");
        img.remove();
        return;
      }
      img.dataset.reemplazada = "si";
      img.src = ILUSTRACION;
    },
    true
  );
}

/* ---------- Inicio ---------- */

// Los datos de la pauta y del WhatsApp salen de config.js, así se cambian en un solo lugar
function completarDatosDelNegocio() {
  const { montoMinimo, porcentaje } = CONFIG.descuento;
  document.querySelectorAll('[data-pauta="monto"]').forEach((n) => (n.textContent = formatearPrecio(montoMinimo)));
  document.querySelectorAll('[data-pauta="porcentaje"]').forEach((n) => (n.textContent = `${porcentaje} %`));
  document.querySelectorAll("[data-whatsapp]").forEach((a) => (a.href = `https://wa.me/${CONFIG.whatsapp}`));
}

async function iniciar() {
  const portada = el("portada");
  marcarFotosPendientes();
  iniciarEncabezado(el("encabezado"), portada);
  conectarEventos();
  carrito.suscribir(dibujarCarrito);

  try {
    const catalogo = await cargarCatalogo();
    estado.categorias = catalogo.categorias;
    estado.productos = catalogo.productos;
    // WhatsApp y pauta mayorista se editan en el panel
    if (catalogo.configuracion) Object.assign(CONFIG, catalogo.configuracion);

  } catch (error) {
    nodos.vistaInicio.hidden = true;
    nodos.vistaLista.hidden = false;
    nodos.grilla.innerHTML = `
      <div class="vacio">
        <p class="vacio__titulo">No se pudo cargar el catálogo.</p>
        <p>${error.message} Si abriste el archivo con doble clic, levantá un servidor local (ver README).</p>
      </div>`;
    return;
  }

  completarDatosDelNegocio();
  carrito.sincronizar(estado.productos);
  leerRuta();
  dibujarCatalogo();
}

iniciar();