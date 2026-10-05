from django.contrib import admin
from django.utils.html import format_html

from django.shortcuts import redirect

from .models import Categoria, Configuracion, Imagen, Producto, Variante

@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ["nombre", "orden", "cantidad_productos"]
    list_editable = ["orden"]
    prepopulated_fields = {"slug": ["nombre"]}

    @admin.display(description="productos")
    def cantidad_productos(self, categoria):
        return categoria.productos.count()


class VarianteInline(admin.TabularInline):
    model = Variante
    extra = 0
    fields = ["nombre", "codigo", "precio", "orden"]


class ImagenInline(admin.TabularInline):
    model = Imagen
    extra = 1
    fields = ["vista_previa", "archivo", "orden"]
    readonly_fields = ["vista_previa"]

    @admin.display(description="foto")
    def vista_previa(self, imagen):
        if not imagen.archivo:
            return "—"
        return format_html('<img src="{}" style="height:80px;border-radius:4px">', imagen.archivo.url)


@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ["miniatura", "codigo", "nombre", "categoria", "precio", "destacado", "disponible", "publicado"]
    list_display_links = ["miniatura", "nombre"]
    list_editable = ["precio", "destacado", "disponible", "publicado"]
    list_filter = ["categoria", "destacado", "disponible", "publicado"]
    search_fields = ["nombre", "codigo", "variantes__codigo", "descripcion"]
    prepopulated_fields = {"slug": ["nombre"]}
    inlines = [VarianteInline, ImagenInline]
    list_per_page = 50
    fieldsets = [
        (None, {"fields": ["nombre", "slug", "codigo", "categoria", "precio", "descripcion"]}),
        ("Variantes", {"fields": ["titulo_variantes"]}),
        ("Visibilidad", {"fields": ["publicado", "disponible", "destacado"]}),
    ]

    @admin.display(description="")
    def miniatura(self, producto):
        primera = next(iter(producto.imagenes.all()), None)  # usa las fotos ya traídas
        if not primera:
            return "—"
        return format_html('<img src="{}" style="height:44px;width:36px;object-fit:cover;border-radius:3px">', primera.archivo.url)

    def get_queryset(self, request):
        # Trae categoría y fotos de una vez, para que la lista cargue rápido
        return super().get_queryset(request).select_related("categoria").prefetch_related("imagenes").distinct()


    

@admin.register(Configuracion)
class ConfiguracionAdmin(admin.ModelAdmin):
    fieldsets = [
        ("WhatsApp", {"fields": ["whatsapp"]}),
        ("Pauta mayorista", {"fields": ["pauta_monto_minimo", "pauta_porcentaje"]}),
    ]

    def changelist_view(self, request, extra_context=None):
        # Hay una sola configuración: se abre directamente para editarla
        return redirect("admin:catalogo_configuracion_change", Configuracion.cargar().pk)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False