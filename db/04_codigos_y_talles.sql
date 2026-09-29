-- =========================================================
-- El Ceibo: agrega códigos de la lista de precios y títulos de variantes
--
-- Ejecutar UNA VEZ si creaste la base con una versión anterior de
-- 01_esquema.sql. Si la creaste con la versión actual, no hace falta
-- (y si lo ejecutás igual, no rompe nada).
-- =========================================================

BEGIN;

ALTER TABLE productos ADD COLUMN IF NOT EXISTS codigo text UNIQUE CHECK (codigo ~ '^[0-9]+$');
ALTER TABLE productos ADD COLUMN IF NOT EXISTS titulo_variantes text NOT NULL DEFAULT 'Opción';
ALTER TABLE variantes ADD COLUMN IF NOT EXISTS codigo text CHECK (codigo ~ '^[0-9]+$');

DROP VIEW IF EXISTS vista_productos;

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

COMMIT;
