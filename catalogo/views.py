from django.http import JsonResponse
from django.shortcuts import render

from .models import Categoria, Configuracion, Producto


def inicio(request):
    """La página pública del catálogo."""
    return render(request, "index.html")


def api_catalogo(request):
    """El catálogo en JSON, armado en el momento desde la base de datos."""
    configuracion = Configuracion.cargar()
    productos = (
        Producto.objects.filter(publicado=True)
        .select_related("categoria")
        .prefetch_related("variantes", "imagenes")
    )
    categorias = Categoria.objects.filter(productos__publicado=True).distinct()

    datos = {
        "configuracion": {
            "whatsapp": configuracion.whatsapp,
            "descuento": {
                "montoMinimo": configuracion.pauta_monto_minimo,
                "porcentaje": configuracion.pauta_porcentaje,
            },
        },
        "categorias": [
            {"id": c.slug, "nombre": c.nombre, "descripcion": c.descripcion}
            for c in categorias
        ],
        "productos": [
            {
                "id": p.slug,
                "codigo": p.codigo,
                "categoria": p.categoria.slug,
                "nombre": p.nombre,
                "descripcion": p.descripcion,
                "precio": p.precio,
                "titulo_variantes": p.titulo_variantes,
                "destacado": p.destacado,
                "disponible": p.disponible,
                "variantes": [
                    {"nombre": v.nombre, "codigo": v.codigo or None, "precio": v.precio}
                    for v in p.variantes.all()
                ],
                "imagenes": [i.archivo.url for i in p.imagenes.all()],
            }
            for p in productos
        ],
    }
    return JsonResponse(datos, json_dumps_params={"ensure_ascii": False})