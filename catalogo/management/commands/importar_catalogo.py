"""
Importa el catálogo desde el JSON del sistema anterior.

Uso:
    python manage.py importar_catalogo

Se puede ejecutar más de una vez: actualiza lo que ya existe en lugar de
duplicarlo. Las fotos se copian, se achican y se renombran solas.
"""

import json
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from catalogo.models import Categoria, Imagen, Producto, Variante


class Command(BaseCommand):
    help = "Importa categorías, productos, variantes y fotos desde data/productos.json"

    def add_arguments(self, parser):
        parser.add_argument("--json", default="data/productos.json", help="Ruta del JSON a importar")

    @transaction.atomic
    def handle(self, *args, **opciones):
        ruta = Path(settings.BASE_DIR) / opciones["json"]
        if not ruta.exists():
            raise CommandError(f"No encontré {ruta}")
        catalogo = json.loads(ruta.read_text(encoding="utf-8"))

        for orden, datos in enumerate(catalogo["categorias"], start=1):
            Categoria.objects.update_or_create(
                slug=datos["id"],
                defaults={"nombre": datos["nombre"], "descripcion": datos.get("descripcion", ""), "orden": orden},
            )

        fotos_copiadas, fotos_faltantes = 0, []
        for datos in catalogo["productos"]:
            producto, _ = Producto.objects.update_or_create(
                slug=datos["id"],
                defaults={
                    "codigo": datos.get("codigo") or None,
                    "categoria": Categoria.objects.get(slug=datos["categoria"]),
                    "nombre": datos["nombre"],
                    "descripcion": datos.get("descripcion", ""),
                    "precio": datos.get("precio"),
                    "titulo_variantes": datos.get("titulo_variantes", "Opción"),
                    "destacado": datos.get("destacado", False),
                    "disponible": datos.get("disponible", True),
                    "publicado": True,
                },
            )

            producto.variantes.all().delete()
            Variante.objects.bulk_create(
                Variante(producto=producto, nombre=v["nombre"], codigo=v.get("codigo") or "", precio=v.get("precio"), orden=i)
                for i, v in enumerate(datos.get("variantes", []), start=1)
            )

            # Las fotos se importan solo la primera vez, para no duplicarlas
            if producto.imagenes.exists():
                continue
            for orden, ruta_foto in enumerate(datos.get("imagenes", []), start=1):
                archivo = Path(settings.BASE_DIR) / ruta_foto
                if not archivo.exists():
                    fotos_faltantes.append(ruta_foto)
                    continue
                with archivo.open("rb") as f:
                    Imagen.objects.create(producto=producto, archivo=File(f, name=archivo.name), orden=orden)
                fotos_copiadas += 1

        for ruta_foto in fotos_faltantes:
            self.stdout.write(self.style.WARNING(f"  no encontré {ruta_foto}"))
        self.stdout.write(self.style.SUCCESS(
            f"Listo: {Categoria.objects.count()} categorías, {Producto.objects.count()} productos, "
            f"{Variante.objects.count()} variantes y {fotos_copiadas} fotos importadas."
        ))