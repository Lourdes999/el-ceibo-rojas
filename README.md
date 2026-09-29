# El Ceibo · Catálogo de talabartería

Catálogo web para El Ceibo, talabartería familiar con 15 años de oficio.
El cliente navega por categorías, arma su pedido en un carrito y lo envía
por WhatsApp con un mensaje ya redactado, para cerrar la venta en una
conversación directa.

## Arquitectura

```
PostgreSQL  ──(scripts/exportar_catalogo.py)──>  data/productos.json  ──>  página estática
 (local)                                                                    (GitHub Pages)
```

Los productos viven en una base PostgreSQL local. Un script de Python los
exporta a un JSON que lee la página. La web nunca se conecta a la base, así
que puede publicarse gratis como sitio estático y la base no queda expuesta.

## Tecnologías

- PostgreSQL: modelo relacional con restricciones, triggers y vistas
- Python 3 con psycopg: exportación y validación del catálogo
- HTML, CSS y JavaScript sin frameworks (módulos ES)

## Estructura

```
index.html                  estructura de la página
css/styles.css              identidad visual
js/config.js                número de WhatsApp y datos del negocio
js/datos.js                 carga del catálogo y cálculo de precios
js/carrito.js               estado del carrito (se guarda en el navegador)
js/whatsapp.js              arma el mensaje del pedido
js/ui.js                    genera el HTML de tarjetas, detalle y carrito
js/encabezado.js            encabezado y avisos de fotos pendientes
js/app.js                   filtros, búsqueda, orden y eventos
db/01_esquema.sql           tablas, restricciones, triggers y vista
db/03_consultas_utiles.sql  consultas para cargar, editar y controlar
db/04_codigos_y_talles.sql  migración: códigos y títulos de variantes
db/05_catalogo_julio.sql    catálogo real según la lista de precios
scripts/exportar_catalogo.py
data/productos.json         generado por el script, no editar a mano
img/productos/              fotos de los productos
img/nosotros.jpg            foto de la sección Nosotros
```

## Modelo de datos

- `categorias`: id, nombre, descripción y orden de aparición
- `productos`: pertenece a una categoría y tiene el código de la lista de precios;
  precio nulo significa "a consultar"; `titulo_variantes` define si se elige
  "Talle", "Tamaño", "Material", etc.;
  `disponible` muestra "Sin stock" y `publicado` lo oculta de la web
- `variantes`: talles o modelos de un producto, con precio y código propios opcionales
- `imagenes`: varias fotos por producto, ordenadas
- `vista_productos`: un producto por fila, para buscar cómodo en pgAdmin

## Puesta en marcha (una sola vez)

1. En pgAdmin, creá una base llamada `el_ceibo`.
2. Abrí el Query Tool sobre esa base y ejecutá `db/01_esquema.sql`
   y después `db/05_catalogo_julio.sql`.
3. Copiá `.env.ejemplo` como `.env` y completá tu contraseña de PostgreSQL.
4. Instalá la dependencia de Python:
   ```
   pip install -r requirements.txt
   ```

## Flujo de trabajo

1. Cargá o editá productos en pgAdmin (hay ejemplos en `db/03_consultas_utiles.sql`).
2. Guardá las fotos en `img/productos/`.
3. Exportá:
   ```
   python scripts/exportar_catalogo.py
   ```
4. Revisá la página con `python -m http.server 8000` en http://localhost:8000

## Tipografías

Cormorant Garamond (títulos) y Jost (textos), ambas de Google Fonts.
