from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path

from catalogo import views

admin.site.site_header = "El Ceibo · Panel"
admin.site.site_title = "El Ceibo"
admin.site.index_title = "Administración"
admin.site.site_url = "/"

urlpatterns = [
    path("", views.inicio, name="inicio"),
    path("api/catalogo/", views.api_catalogo, name="api_catalogo"),
    path("panel/", admin.site.urls),
]

# En la compu, Django sirve las fotos subidas. En producción lo hará el hosting.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)