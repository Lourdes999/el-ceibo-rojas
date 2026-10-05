import uuid

from django.core.validators import MaxValueValidator, RegexValidator
from django.db import models

from .imagenes import optimizar

solo_numeros = RegexValidator(r"^[0-9]+$", "El código solo puede tener números.")


class Categoria(models.Model):
    slug = models.SlugField("identificador", unique=True, help_text="Se usa en el link: #catalogo/mates")
    nombre = models.CharField(max_length=80, unique=True)
    descripcion = models.CharField("descripción", max_length=200, blank=True)
    orden = models.PositiveIntegerField(default=0, help_text="Orden en que aparece en la página.")

    class Meta:
        ordering = ["orden", "nombre"]
        verbose_name = "categoría"
        verbose_name_plural = "categorías"

    def __str__(self):
        return self.nombre


class Producto(models.Model):
    slug = models.SlugField("identificador", unique=True)
    codigo = models.CharField(
        "código", max_length=10, unique=True, null=True, blank=True, validators=[solo_numeros],
        help_text="Código de la lista de precios. Vacío si cada talle tiene el suyo.",
    )
    categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT, related_name="productos", verbose_name="categoría")
    nombre = models.CharField(max_length=120)
    descripcion = models.TextField("descripción", blank=True)
    precio = models.PositiveIntegerField(null=True, blank=True, help_text="En pesos. Vacío = a consultar.")
    titulo_variantes = models.CharField(
        "título de las variantes", max_length=30, default="Talle",
        help_text="Lo que elige el cliente: Talle, Tamaño, Material…",
    )
    destacado = models.BooleanField(default=False)
    disponible = models.BooleanField(default=True, help_text="Si se desmarca, se muestra como Sin stock.")
    publicado = models.BooleanField(default=True, help_text="Si se desmarca, no aparece en la página.")
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["categoria__orden", "nombre"]

    def __str__(self):
        return f"{self.codigo} · {self.nombre}" if self.codigo else self.nombre


class Variante(models.Model):
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name="variantes")
    nombre = models.CharField(max_length=40, help_text="Ej.: 42, XL, Alpaca")
    codigo = models.CharField("código", max_length=10, blank=True, validators=[solo_numeros])
    precio = models.PositiveIntegerField(null=True, blank=True, help_text="Vacío = usa el precio del producto.")
    orden = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["orden", "id"]
        constraints = [
            models.UniqueConstraint(fields=["producto", "nombre"], name="variante_unica_por_producto"),
        ]

    def __str__(self):
        return f"{self.producto.nombre} · {self.nombre}"


class Imagen(models.Model):
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name="imagenes")
    archivo = models.ImageField(upload_to="productos/")
    orden = models.PositiveIntegerField(default=0, help_text="La de menor número es la principal.")

    class Meta:
        ordering = ["orden", "id"]
        verbose_name = "imagen"
        verbose_name_plural = "imágenes"

    def __str__(self):
        return self.archivo.name

    def save(self, *args, **kwargs):
        # Cada foto nueva se achica y se renombra sola: nada de nombres tipeados a mano
        if self.archivo and not self.archivo._committed:
            nombre = f"{self.producto.slug}-{uuid.uuid4().hex[:8]}.jpg"
            self.archivo.save(nombre, optimizar(self.archivo), save=False)
        super().save(*args, **kwargs)



class Configuracion(models.Model):
    """Datos del negocio que se editan desde el panel. Siempre hay una sola."""

    whatsapp = models.CharField(
        max_length=20, validators=[solo_numeros],
        help_text="Formato internacional sin espacios: 549 + característica + número. Ej.: 5492474468603",
    )
    pauta_monto_minimo = models.PositiveIntegerField(
        "monto mínimo de la pauta mayorista", default=200000,
        help_text="El descuento se aplica a compras mayores a este monto, en pesos.",
    )
    pauta_porcentaje = models.PositiveSmallIntegerField(
        "porcentaje de descuento", default=15, validators=[MaxValueValidator(100)],
    )

    class Meta:
        verbose_name = "configuración"
        verbose_name_plural = "configuración"

    def __str__(self):
        return "Configuración del negocio"

    def save(self, *args, **kwargs):
        self.pk = 1  # siempre la misma fila
        super().save(*args, **kwargs)

    @classmethod
    def cargar(cls):
        configuracion, _ = cls.objects.get_or_create(pk=1, defaults={"whatsapp": "5492474468603"})
        return configuracion