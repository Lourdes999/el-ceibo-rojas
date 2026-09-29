"""
Exporta el catálogo desde PostgreSQL a data/productos.json.

La web es estática y nunca se conecta a la base: lee el JSON que genera
este script. Así la base queda en tu computadora y no expuesta a internet.

Uso:
    python scripts/exportar_catalogo.py

Los datos de conexión se leen del archivo .env en la raíz del proyecto
(copiá .env.ejemplo como .env y completalo).
"""

import json
import os
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

try:
    import psycopg
    from psycopg.rows import dict_row
except ImportError:
    sys.exit("Falta instalar psycopg. Ejecutá:  pip install -r requirements.txt")

RAIZ = Path(__file__).resolve().parent.parent
ARCHIVO_ENV = RAIZ / ".env"
ARCHIVO_SALIDA = RAIZ / "data" / "productos.json"


def leer_env(ruta: Path) -> dict[str, str]:
    """Lee líneas CLAVE=valor. Las variables de entorno del sistema tienen prioridad."""
    valores = {}
    if ruta.exists():
        for linea in ruta.read_text(encoding="utf-8").splitlines():
            linea = linea.strip()
            if linea and not linea.startswith("#") and "=" in linea:
                clave, valor = linea.split("=", 1)
                valores[clave.strip()] = valor.strip().strip('"').strip("'")
    return {**valores, **{k: v for k, v in os.environ.items() if k.startswith("DB_")}}


def conectar() -> psycopg.Connection:
    env = leer_env(ARCHIVO_ENV)
    try:
        return psycopg.connect(
            host=env.get("DB_HOST", "localhost"),
            port=env.get("DB_PORT", "5432"),
            dbname=env.get("DB_NAME", "el_ceibo"),
            user=env.get("DB_USER", "postgres"),
            password=env.get("DB_PASSWORD", ""),
            row_factory=dict_row,
            connect_timeout=5,
        )
    except psycopg.OperationalError as error:
        sys.exit(
            "No me pude conectar a PostgreSQL.\n"
            "Revisá que el servicio esté iniciado y que los datos de .env sean correctos.\n"
            f"Detalle: {error}"
        )


CONSULTA_CATEGORIAS = """
    SELECT c.id, c.nombre, c.descripcion
    FROM categorias c
    WHERE EXISTS (SELECT 1 FROM productos p WHERE p.categoria_id = c.id AND p.publicado)
    ORDER BY c.orden, c.nombre
"""

CONSULTA_PRODUCTOS = """
    SELECT p.id, p.codigo, p.categoria_id AS categoria, p.nombre, p.descripcion,
           p.precio, p.titulo_variantes, p.destacado, p.disponible
    FROM productos p
    JOIN categorias c ON c.id = p.categoria_id
    WHERE p.publicado
    ORDER BY c.orden, p.nombre
"""

CONSULTA_VARIANTES = """
    SELECT v.producto_id, v.nombre, v.codigo, v.precio
    FROM variantes v
    JOIN productos p ON p.id = v.producto_id
    WHERE p.publicado
    ORDER BY v.producto_id, v.orden, v.id
"""

CONSULTA_IMAGENES = """
    SELECT i.producto_id, i.ruta
    FROM imagenes i
    JOIN productos p ON p.id = i.producto_id
    WHERE p.publicado
    ORDER BY i.producto_id, i.orden, i.id
"""


def main() -> int:
    with conectar() as conexion, conexion.cursor() as cursor:
        categorias = cursor.execute(CONSULTA_CATEGORIAS).fetchall()
        productos = cursor.execute(CONSULTA_PRODUCTOS).fetchall()

        variantes = defaultdict(list)
        for fila in cursor.execute(CONSULTA_VARIANTES):
            variantes[fila["producto_id"]].append(
                {"nombre": fila["nombre"], "codigo": fila["codigo"], "precio": fila["precio"]}
            )

        imagenes = defaultdict(list)
        for fila in cursor.execute(CONSULTA_IMAGENES):
            imagenes[fila["producto_id"]].append(fila["ruta"])

    avisos = []
    sin_fotos = 0
    for producto in productos:
        producto["variantes"] = variantes[producto["id"]]
        producto["imagenes"] = imagenes[producto["id"]]

        if not producto["imagenes"]:
            sin_fotos += 1
        for ruta in producto["imagenes"]:
            if not (RAIZ / ruta).exists():
                avisos.append(f"'{producto['id']}': no encontré el archivo {ruta}")

    catalogo = {
        "generado": datetime.now().isoformat(timespec="seconds"),
        "categorias": categorias,
        "productos": productos,
    }
    ARCHIVO_SALIDA.write_text(json.dumps(catalogo, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    for aviso in avisos:
        print(f"  aviso  {aviso}")
    print(
        f"\nListo: {len(productos)} productos en {len(categorias)} categorías "
        f"-> {ARCHIVO_SALIDA.relative_to(RAIZ)}"
    )
    if sin_fotos:
        print(f"{sin_fotos} productos todavía no tienen fotos: se muestran con 'Foto próximamente'.")
        print("Para ver cuáles:  SELECT * FROM vista_productos WHERE fotos = 0;")
    return 0


if __name__ == "__main__":
    sys.exit(main())
