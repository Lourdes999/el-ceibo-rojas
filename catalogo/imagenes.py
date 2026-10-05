"""Optimización de fotos: las achica y comprime antes de guardarlas."""

from io import BytesIO

from django.core.files.base import ContentFile
from PIL import Image, ImageOps

LADO_MAXIMO = 1600  # píxeles del lado más largo
CALIDAD_JPEG = 82   # buen equilibrio entre peso y calidad


def optimizar(archivo) -> ContentFile:
    """Devuelve la foto como JPEG liviano, derecha y sin datos de la cámara."""
    with Image.open(archivo) as imagen:
        imagen = ImageOps.exif_transpose(imagen)  # respeta la orientación del celular
        imagen.thumbnail((LADO_MAXIMO, LADO_MAXIMO))
        if imagen.mode != "RGB":
            imagen = imagen.convert("RGB")
        salida = BytesIO()
        imagen.save(salida, format="JPEG", quality=CALIDAD_JPEG, optimize=True, progressive=True)
    return ContentFile(salida.getvalue())