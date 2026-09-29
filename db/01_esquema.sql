-- =========================================================
-- El Ceibo: esquema de la base de datos (PostgreSQL 13 o superior)
--
-- Ejecutar sobre una base vacía llamada el_ceibo.
-- En pgAdmin: clic derecho en la base > Query Tool > abrir este
-- archivo > Ejecutar (F5).
-- =========================================================

-- Los id de categorías y productos son "slugs": minúsculas, números y guiones.
-- Se usan en la web y en el carrito, por eso conviene que sean legibles.
CREATE DOMAIN slug AS text
  CHECK (VALUE ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

-- Precios en pesos enteros, sin centavos. NULL significa "a consultar".
CREATE DOMAIN precio_ars AS integer
  CHECK (VALUE >= 0);


-- ---------- Categorías ----------
CREATE TABLE categorias (
  id          slug    PRIMARY KEY,
  nombre      text    NOT NULL UNIQUE CHECK (btrim(nombre) <> ''),
  descripcion text    NOT NULL DEFAULT '',
  orden       integer NOT NULL DEFAULT 0      -- orden en que aparecen en la web
);


-- ---------- Productos ----------
CREATE TABLE productos (
  id           slug        PRIMARY KEY,
  codigo       text        UNIQUE CHECK (codigo ~ '^[0-9]+$'),  -- código de la lista de precios
  categoria_id slug        NOT NULL
               REFERENCES categorias (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  nombre       text        NOT NULL CHECK (btrim(nombre) <> ''),
  descripcion  text        NOT NULL DEFAULT '',
  precio       precio_ars,                    -- NULL = a consultar
  titulo_variantes text    NOT NULL DEFAULT 'Opción',  -- "Talle", "Tamaño", "Material"...
  destacado    boolean     NOT NULL DEFAULT false,
  disponible   boolean     NOT NULL DEFAULT true,   -- false = "Sin stock, consultar"
  publicado    boolean     NOT NULL DEFAULT true,   -- false = no aparece en la web
  creado       timestamptz NOT NULL DEFAULT now(),
  actualizado  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX productos_categoria_idx ON productos (categoria_id);


-- ---------- Variantes (medidas, colores, tamaños) ----------
CREATE TABLE variantes (
  id          integer    GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  producto_id slug       NOT NULL
              REFERENCES productos (id) ON UPDATE CASCADE ON DELETE CASCADE,
  nombre      text       NOT NULL CHECK (btrim(nombre) <> ''),
  codigo      text       CHECK (codigo ~ '^[0-9]+$'),  -- si la variante tiene código propio
  precio      precio_ars,                     -- NULL = usa el precio del producto
  orden       integer    NOT NULL DEFAULT 0,
  UNIQUE (producto_id, nombre)
);


-- ---------- Imágenes ----------
-- La primera según "orden" es la foto principal.
CREATE TABLE imagenes (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  producto_id slug    NOT NULL
              REFERENCES productos (id) ON UPDATE CASCADE ON DELETE CASCADE,
  ruta        text    NOT NULL CHECK (ruta ~ '^img/productos/[^/]+\.(jpe?g|png|webp)$'),
  orden       integer NOT NULL DEFAULT 0,
  UNIQUE (producto_id, ruta)
);


-- ---------- Fecha de actualización automática ----------
CREATE FUNCTION marcar_actualizado() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.actualizado := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER productos_actualizado
  BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION marcar_actualizado();

-- Si cambia una variante o una imagen, el producto también cuenta como actualizado
CREATE FUNCTION tocar_producto() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE productos SET actualizado = now()
  WHERE id = COALESCE(NEW.producto_id, OLD.producto_id);
  RETURN NULL;
END;
$$;

CREATE TRIGGER variantes_tocan_producto
  AFTER INSERT OR UPDATE OR DELETE ON variantes
  FOR EACH ROW EXECUTE FUNCTION tocar_producto();

CREATE TRIGGER imagenes_tocan_producto
  AFTER INSERT OR UPDATE OR DELETE ON imagenes
  FOR EACH ROW EXECUTE FUNCTION tocar_producto();


-- ---------- Vista para trabajar cómodo en pgAdmin ----------
-- Un producto por fila, con su categoría, variantes y fotos resumidas.
-- Uso: SELECT * FROM vista_productos WHERE nombre ILIKE '%mate%';
CREATE VIEW vista_productos AS
SELECT
  COALESCE(p.codigo, (SELECT string_agg(DISTINCT v.codigo, ', ') FROM variantes v WHERE v.producto_id = p.id)) AS codigo,
  p.id,
  p.nombre,
  c.nombre                                   AS categoria,
  COALESCE(p.precio::text, 'a consultar')    AS precio,
  COALESCE((SELECT string_agg(v.nombre || COALESCE(' ($' || v.precio || ')', ''), ' | ' ORDER BY v.orden, v.id)
            FROM variantes v WHERE v.producto_id = p.id), '')   AS variantes,
  (SELECT count(*) FROM imagenes i WHERE i.producto_id = p.id)  AS fotos,
  p.destacado,
  p.disponible,
  p.publicado,
  p.actualizado::date                        AS actualizado
FROM productos p
JOIN categorias c ON c.id = p.categoria_id
ORDER BY codigo, p.nombre;
