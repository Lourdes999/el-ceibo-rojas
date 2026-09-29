// Mientras no haya foto, cada figura muestra un recuadro que indica qué foto va ahí
export function marcarFotosPendientes() {
  document.querySelectorAll("figure[data-sugerencia] img").forEach((img) => {
    const pendiente = () => {
      const figura = img.closest("figure");
      if (figura.classList.contains("pendiente")) return;
      figura.classList.add("pendiente");
      const nota = document.createElement("figcaption");
      nota.className = "nota-foto";
      nota.innerHTML = `<span>${figura.dataset.sugerencia}</span><span class="nota-foto__ruta">${img.getAttribute("src")}</span>`;
      figura.append(nota);
    };
    if (img.complete && img.naturalWidth === 0) pendiente();
    img.addEventListener("error", pendiente);
  });
}

// El encabezado es transparente sobre la portada y se vuelve sólido al bajar
export function iniciarEncabezado(encabezado, portada) {
  const observador = new IntersectionObserver(
    ([entrada]) => encabezado.classList.toggle("encabezado--solido", !entrada.isIntersecting),
    { rootMargin: "-80px 0px 0px 0px" }
  );
  observador.observe(portada);
}
