import { formatearPrecio, escaparHTML } from "./formato.js";
import { precioDesde, precioVariante, tienePreciosDistintos } from "./datos.js";

// Recuadro neutro para productos que todavía no tienen foto
function crearIlustracion() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">
    <rect width="400" height="500" fill="#E6E2DA"/>
    <g fill="none" stroke="#CBB89C" stroke-width="2">
      <path d="M200 190 L250 250 L200 310 L150 250Z"/>
      <path d="M200 215 L229 250 L200 285 L171 250Z"/>
    </g>
    <text x="200" y="360" text-anchor="middle" font-family="Georgia, serif" font-size="18" fill="#939789">Foto próximamente</text>
  </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

export const ILUSTRACION = crearIlustracion();

function imagen(producto, clase, ruta = producto.imagenes[0]) {
  const src = ruta || ILUSTRACION;
  return `<img class="${clase}" src="${escaparHTML(src)}" alt="${escaparHTML(producto.nombre)}" loading="lazy">`;
}

function textoPrecio(producto) {
  const desde = precioDesde(producto);
  if (desde == null) return formatearPrecio(null);
  return tienePreciosDistintos(producto) ? `Desde ${formatearPrecio(desde)}` : formatearPrecio(desde);
}

// Pestañas de categorías (computadora): todas visibles, en varias líneas si hace falta
export function htmlCategorias(categorias, activa, conteos) {
  return categorias
    .map(
      (c) => `
      <a class="chip" href="#catalogo/${c.id}" ${c.id === activa ? 'aria-current="page"' : ""}>
        ${escaparHTML(c.nombre)} <span class="chip__cantidad">${conteos[c.id] ?? 0}</span>
      </a>`
    )
    .join("");
}

// Desplegable de categorías (celular)
export function htmlOpcionesCategorias(categorias, activa) {
  const opciones = categorias.map(
    (c) => `<option value="${c.id}" ${c.id === activa ? "selected" : ""}>${escaparHTML(c.nombre)}</option>`
  );
  return `<option value="" ${activa ? "" : "selected"} disabled>Elegí una categoría</option>${opciones.join("")}`;
}

// Mosaico del inicio del catálogo: una tesela por categoría.
// Usa la primera foto disponible de la categoría; si no hay, queda el fondo liso.
export function htmlMosaico(categorias, productos) {
  return categorias
    .map((c) => {
      const deLaCategoria = productos.filter((p) => p.categoria === c.id);
      const conFoto = deLaCategoria.find((p) => p.imagenes.length);
      const foto = conFoto ? `<img class="tesela__img" src="${escaparHTML(conFoto.imagenes[0])}" alt="" loading="lazy">` : "";
      const cantidad = `${deLaCategoria.length} ${deLaCategoria.length === 1 ? "producto" : "productos"}`;
      return `
      <a class="tesela${foto ? " tesela--foto" : ""}" href="#catalogo/${c.id}">
        ${foto}
        <span class="tesela__texto">
          <span class="tesela__nombre">${escaparHTML(c.nombre)}</span>
          <span class="tesela__cantidad">${cantidad}</span>
        </span>
      </a>`;
    })
    .join("");
}

export function htmlGrilla(productos, nombreCategoria) {
  if (productos.length === 0) {
    return `
      <div class="vacio">
        <p class="vacio__titulo">No encontramos productos con esa búsqueda.</p>
        <p>Probá con otra palabra o elegí “Todo”. Si buscás algo que no está, consultanos por WhatsApp: muchas piezas se hacen a pedido.</p>
      </div>`;
  }

  return productos
    .map((p) => {
      const nombre = escaparHTML(p.nombre);
      let accion = `<button class="btn btn--agregar" type="button" data-accion="agregar" data-id="${p.id}">Agregar</button>`;
      if (!p.disponible) {
        accion = `<button class="btn btn--linea" type="button" data-accion="ver" data-id="${p.id}">Consultar</button>`;
      } else if (p.variantes.length) {
        accion = `<button class="btn btn--agregar" type="button" data-accion="ver" data-id="${p.id}">Elegir</button>`;
      }

      return `
      <article class="card${p.disponible ? "" : " card--agotado"}">
        <button class="card__media" type="button" data-accion="ver" data-id="${p.id}" aria-label="Ver ${nombre}">
          ${imagen(p, "card__img")}
          ${p.destacado ? `<span class="sello">Destacado</span>` : ""}
          ${p.disponible ? "" : `<span class="sello sello--agotado">Sin stock</span>`}
        </button>
        <div class="card__cuerpo">
          <p class="card__categoria">${escaparHTML(nombreCategoria(p.categoria))}</p>
          <h3 class="card__nombre">${nombre}</h3>
          <div class="card__pie">
            <span class="precio${precioDesde(p) == null ? " precio--consultar" : ""}">${textoPrecio(p)}</span>
            ${accion}
          </div>
        </div>
      </article>`;
    })
    .join("");
}

export function htmlDetalle(p, nombreCategoria, enlaceConsulta) {
  const variantes = p.variantes.length
    ? `
      <fieldset class="detalle__variantes">
        <legend>${escaparHTML(p.titulo_variantes ?? "Opción")}</legend>
        ${p.variantes
          .map(
            (v, i) => `
          <label class="opcion">
            <input type="radio" name="variante" value="${i}" ${i === 0 ? "checked" : ""}>
            <span>${escaparHTML(v.nombre)}</span>
          </label>`
          )
          .join("")}
      </fieldset>`
    : "";

  const compra = p.disponible
    ? `
      <div class="detalle__compra">
        <div class="cantidad" role="group" aria-label="Cantidad">
          <button type="button" data-cantidad="-1" aria-label="Restar uno">−</button>
          <output id="detalle-cantidad">1</output>
          <button type="button" data-cantidad="1" aria-label="Sumar uno">+</button>
        </div>
        <button class="btn btn--agregar btn--grande" type="button" id="detalle-agregar">Agregar al pedido</button>
      </div>`
    : `
      <p class="detalle__aviso">No tenemos stock ahora, pero podemos hacerlo a pedido.</p>
      <a class="btn btn--whatsapp btn--grande" href="${enlaceConsulta}" target="_blank" rel="noopener">Consultar por WhatsApp</a>`;

  return `
    <button class="modal__cerrar" type="button" data-cerrar aria-label="Cerrar">×</button>
    <div class="detalle">
      <div class="detalle__media">
        ${imagen(p, "detalle__img")}
        ${p.imagenes.length > 1 ? `
        <div class="miniaturas">
          ${p.imagenes.map((ruta, i) => `
            <button type="button" class="miniatura" data-foto="${escaparHTML(ruta)}" aria-label="Ver foto ${i + 1}" aria-pressed="${i === 0}">
              ${imagen(p, "miniatura__img", ruta)}
            </button>`).join("")}
        </div>` : ""}
      </div>
      <div class="detalle__info">
        <p class="card__categoria">${escaparHTML(nombreCategoria(p.categoria))}</p>
        <h2 class="detalle__nombre" id="detalle-titulo">${escaparHTML(p.nombre)}</h2>
        <p class="detalle__precio" id="detalle-precio">${formatearPrecio(precioVariante(p, p.variantes[0]))}</p>
        ${p.descripcion ? `<p class="detalle__descripcion">${escaparHTML(p.descripcion)}</p>` : ""}
        ${p.disponible ? variantes : ""}
        ${compra}
      </div>
    </div>`;
}

export function htmlItemsCarrito(items) {
  if (items.length === 0) {
    return `
      <div class="carrito__vacio">
        <p class="vacio__titulo">Tu pedido está vacío.</p>
        <p>Agregá productos del catálogo y te armamos el mensaje para WhatsApp.</p>
      </div>`;
  }

  return `<ul class="lista-items">${items
    .map(
      (item) => `
      <li class="item">
        <div class="item__texto">
          <p class="item__nombre">${escaparHTML(item.nombre)}</p>
          ${item.detalle || item.codigo ? `<p class="item__variante">${escaparHTML([item.detalle, item.codigo && `Cód. ${item.codigo}`].filter(Boolean).join(" · "))}</p>` : ""}
          <p class="item__precio">${item.precio == null ? "A consultar" : formatearPrecio(item.precio * item.cantidad)}</p>
        </div>
        <div class="item__acciones">
          <div class="cantidad cantidad--chica" role="group" aria-label="Cantidad de ${escaparHTML(item.nombre)}">
            <button type="button" data-item="${escaparHTML(item.clave)}" data-cambio="-1" aria-label="Restar uno">−</button>
            <output>${item.cantidad}</output>
            <button type="button" data-item="${escaparHTML(item.clave)}" data-cambio="1" aria-label="Sumar uno">+</button>
          </div>
          <button class="item__quitar" type="button" data-quitar="${escaparHTML(item.clave)}">Quitar</button>
        </div>
      </li>`
    )
    .join("")}</ul>`;
}
