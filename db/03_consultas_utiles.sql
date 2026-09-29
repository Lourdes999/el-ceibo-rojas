-- =========================================================
-- El Ceibo: consultas útiles para el día a día
--
-- No se ejecuta entero: seleccioná la consulta que necesites
-- en el Query Tool de pgAdmin y apretá F5 (ejecuta solo lo seleccionado).
-- =========================================================


-- ---------- BUSCAR ----------

-- Todo el catálogo, un producto por fila
SELECT * FROM vista_productos;

-- Buscar por nombre (ILIKE no distingue mayúsculas)
SELECT * FROM vista_productos WHERE nombre ILIKE '%mate%';

-- Productos de una categoría
SELECT * FROM vista_productos WHERE categoria = 'Mates y bombillas';


-- ---------- CARGAR UN PRODUCTO NUEVO ----------
-- Todo junto dentro de una transacción: si algo falla, no se guarda nada a medias.

BEGIN;

INSERT INTO productos (id, categoria_id, nombre, descripcion, precio, destacado)
VALUES ('cinto-guarda-pampa', 'cintos-y-rastras', 'Cinto con guarda pampa',
        'Cinto de suela con guarda pampa tejida en el centro.', 31000, false);

INSERT INTO variantes (producto_id, nombre, orden) VALUES
  ('cinto-guarda-pampa', '90 cm', 1),
  ('cinto-guarda-pampa', '100 cm', 2),
  ('cinto-guarda-pampa', '110 cm', 3);

INSERT INTO imagenes (producto_id, ruta, orden) VALUES
  ('cinto-guarda-pampa', 'img/productos/cinto-guarda-pampa.jpg', 1);

COMMIT;


-- ---------- EDITAR ----------

-- Cambiar un precio
UPDATE productos SET precio = 30000 WHERE id = 'cinto-trenzado-crudo';

-- Aumentar un 10 % toda una categoría (redondeado a la centena)
UPDATE productos
SET precio = round(precio * 1.10 / 100) * 100
WHERE categoria_id = 'mates' AND precio IS NOT NULL;

-- Marcar sin stock / con stock
UPDATE productos SET disponible = false WHERE id = 'bozal-crudo';

-- Ocultar de la web sin borrarlo
UPDATE productos SET publicado = false WHERE id = 'tabaquera-cuero';

-- Dar precio propio a una variante (NULL vuelve a usar el del producto)
UPDATE variantes SET precio = 44000
WHERE producto_id = 'cuchillo-criollo' AND nombre = 'Hoja 16 cm';


-- ---------- CONTROLES ANTES DE PUBLICAR ----------

-- Productos publicados sin ninguna foto
SELECT * FROM vista_productos WHERE publicado AND fotos = 0;

-- Productos a consultar (sin precio)
SELECT * FROM vista_productos WHERE precio = 'a consultar';

-- Categorías sin productos publicados
SELECT c.*
FROM categorias c
WHERE NOT EXISTS (
  SELECT 1 FROM productos p WHERE p.categoria_id = c.id AND p.publicado
);

-- Lo último que modificaste
SELECT * FROM vista_productos ORDER BY actualizado DESC LIMIT 10;


-- ---------- EMPEZAR DE CERO ----------
-- Borra TODOS los productos de ejemplo, con sus variantes y fotos.
-- Las categorías quedan; editalas o borralas aparte.

-- DELETE FROM productos;
