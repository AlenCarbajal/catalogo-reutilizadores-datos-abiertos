// Ecosistema datos.gob.ar: los servicios que mantiene la Dirección, dibujados como
// una constelación alrededor del portal. La ubicación es fija (sin simulación):
// cada familia orbita el centro y sus servicios orbitan a la familia.
// Solo datos públicos: nombre, familia, estado y URL.

// En orden horario desde arriba. Las familias con pocos servicios van arriba y
// abajo (donde las etiquetas tienen menos lugar) y Georef, la más grande, a un costado.
const FAMILIAS = [
  { id: "andino", nombre: "Andino", logo: "andino" },
  { id: "georef", nombre: "Georef", logo: "georef" },
  { id: "series", nombre: "Series de Tiempo", logo: "series-de-tiempo" },
  { id: "apertura", nombre: "Apertura de datos", logo: "paquete-apertura" },
  { id: "metas", nombre: "Metas", glifo: "✓" },
  { id: "infra", nombre: "Infraestructura de datos", glifo: "Σ" },
  { id: "portales", nombre: "Portales", glifo: "•••" },
];

// estado: "online" | "offline" | "instalable" (bibliotecas y plugins que se instalan).
const SERVICIOS = [
  { familia: "portales", nombre: "Portal Nacional de Datos Públicos", estado: "online", url: "https://datos.gob.ar" },
  { familia: "portales", nombre: "Portal Nacional de Datos Públicos (versión anterior)", corto: "Versión anterior", estado: "online", url: "https://old.datos.gob.ar" },
  { familia: "portales", nombre: "Consulta Pública", estado: "online" },
  { familia: "andino", nombre: "Portal Andino (entorno de pruebas)", corto: "Entorno de pruebas", estado: "online", url: "https://andino-v2.datos.gob.ar" },
  { familia: "georef", nombre: "API Georef 1.0", corto: "API 1.0", estado: "online" },
  { familia: "georef", nombre: "API Georef 2.0", corto: "API 2.0", estado: "online" },
  { familia: "georef", nombre: "API Georef 2.1", corto: "API 2.1", estado: "online" },
  { familia: "georef", nombre: "georef-ux", estado: "online" },
  { familia: "georef", nombre: "Librería Python Georef", corto: "Python", estado: "instalable" },
  { familia: "georef", nombre: "Librería R Georef", corto: "R", estado: "instalable" },
  { familia: "georef", nombre: "Plugin QGIS Georef", corto: "Plugin QGIS", estado: "instalable" },
  { familia: "series", nombre: "API Series de Tiempo", corto: "API", estado: "online" },
  { familia: "series", nombre: "API Series de Tiempo V2", corto: "API V2", estado: "online" },
  { familia: "apertura", nombre: "Paquete de apertura de datos", corto: "Paquete de apertura", estado: "online" },
  { familia: "apertura", nombre: "DATOB", estado: "online" },
  { familia: "apertura", nombre: "Vocabularios y codelists", corto: "Vocabularios", estado: "online", url: "https://infra.datos.gob.ar/vocabulario/" },
  { familia: "metas", nombre: "Metas del 5.º plan", corto: "5.º plan", estado: "online" },
  { familia: "metas", nombre: "Metas del 6.º plan", corto: "6.º plan", estado: "online" },
  { familia: "metas", nombre: "Metas (desarrollo)", corto: "Desarrollo", estado: "online" },
  { familia: "infra", nombre: "Data Warehouse", estado: "online" },
  { familia: "infra", nombre: "Monitoreo", estado: "online" },
  { familia: "infra", nombre: "Nombres", estado: "offline", url: "https://nombres.datos.gob.ar" },
  { familia: "infra", nombre: "Catálogo de desarrollos basados en datos", corto: "Catálogo de desarrollos", estado: "offline" },
];

const SVGNS = "http://www.w3.org/2000/svg";
const $ = (id) => document.getElementById(id);
const sinMovimiento = matchMedia("(prefers-reduced-motion: reduce)").matches;
const logo = (nombre, variante) => `img/logos/${nombre}-${variante}.png`;

function el(nombre, attrs = {}, padre) {
  const e = document.createElementNS(SVGNS, nombre);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  padre?.append(e);
  return e;
}

// Curva suave entre dos puntos: el control se corre hacia un costado, siempre
// para el mismo lado, así el conjunto gira como una espiral.
function curva(a, b, k = 0.2) {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const dx = b.x - a.x, dy = b.y - a.y;
  return `M${a.x},${a.y} Q${mx - dy * k},${my + dx * k} ${b.x},${b.y}`;
}

// Punto a `d` de distancia de `a`, en dirección a `b`.
function hacia(a, b, d) {
  const dx = b.x - a.x, dy = b.y - a.y, n = Math.hypot(dx, dy) || 1;
  return { x: a.x + (dx / n) * d, y: a.y + (dy / n) * d };
}

// Generador pseudoaleatorio con semilla: el cielo de fondo es siempre el mismo.
function azar(semilla) {
  return () => ((semilla = (semilla * 16807) % 2147483647) - 1) / 2147483646;
}

function dibujar() {
  const svg = $("constelacion");
  const angosto = svg.clientWidth < 640;
  // Escena lógica: apaisada en pantallas anchas, vertical en las angostas.
  const W = angosto ? 720 : 1240, H = angosto ? 1100 : 820;
  svg.setAttribute("viewBox", `${-W / 2} ${-H / 2} ${W} ${H}`);
  svg.classList.toggle("angosto", angosto);
  svg.replaceChildren();

  const defs = el("defs", {}, svg);
  const grad = el("linearGradient", { id: "eco-trazo", gradientUnits: "userSpaceOnUse", x1: -W / 2, y1: 0, x2: W / 2, y2: 0 }, defs);
  el("stop", { offset: "0", "stop-color": "#8C8AF0" }, grad);
  el("stop", { offset: "1", "stop-color": "#B369ED" }, grad);
  const halo = el("radialGradient", { id: "eco-halo" }, defs);
  el("stop", { offset: "0", "stop-color": "#6D6BD6", "stop-opacity": ".55" }, halo);
  el("stop", { offset: "1", "stop-color": "#393793", "stop-opacity": "0" }, halo);
  const brillo = el("radialGradient", { id: "eco-brillo" }, defs);
  el("stop", { offset: "0", "stop-color": "#F3D28C", "stop-opacity": ".7" }, brillo);
  el("stop", { offset: "1", "stop-color": "#E7BA61", "stop-opacity": "0" }, brillo);

  // Cielo de fondo.
  const r = azar(7);
  const cielo = el("g", { class: "eco-cielo", "aria-hidden": "true" }, svg);
  for (let i = 0; i < 110; i++) el("circle", { cx: (r() - 0.5) * W, cy: (r() - 0.5) * H, r: r() * 1.2 + 0.3, opacity: (r() * 0.35 + 0.1).toFixed(2) }, cielo);

  const trazos = el("g", { class: "eco-trazos", "aria-hidden": "true" }, svg);
  const nodos = el("g", { class: "eco-nodos" }, svg);
  const centro = { x: 0, y: 0 };
  const rx = W / 2 - (angosto ? 150 : 230), ry = H / 2 - (angosto ? 200 : 170);
  const rHijo = angosto ? 95 : 118;

  // Centro: el portal.
  const gCentro = el("g", { class: "eco-centro eco-aparece", style: "--demora:0ms" }, nodos);
  el("circle", { r: angosto ? 150 : 190, fill: "url(#eco-halo)" }, gCentro);
  const anchoCentro = angosto ? 250 : 300;
  el("image", { href: logo("datos-gob-ar", "blanco"), width: anchoCentro, height: anchoCentro * 160 / 823, x: -anchoCentro / 2, y: -anchoCentro * 80 / 823 }, gCentro);

  FAMILIAS.forEach((fam, i) => {
    const ang = -Math.PI / 2 + (i / FAMILIAS.length) * Math.PI * 2;
    const hub = { x: Math.cos(ang) * rx, y: Math.sin(ang) * ry };
    const demoraHub = 150 + i * 90;
    // Las curvas salen del borde del logo central (una elipse) y llegan al borde de la familia.
    const u = hacia(centro, hub, 1), borde = 1 / Math.hypot(u.x / (anchoCentro * 0.56), u.y / (anchoCentro * 0.16));
    el("path", { d: curva(hacia(centro, hub, borde), hacia(hub, centro, 58), 0.16), class: "eco-trazo eco-trazo--familia", "data-familia": fam.id, pathLength: 1, style: `--demora:${demoraHub - 150}ms` }, trazos);

    const gFam = el("g", { class: "eco-familia eco-aparece", "data-familia": fam.id, tabindex: 0, role: "button", "aria-label": fam.nombre,
      transform: `translate(${hub.x},${hub.y})`, style: `--demora:${demoraHub + 250}ms` }, nodos);
    el("circle", { r: 62, fill: "url(#eco-halo)" }, gFam);
    if (fam.logo) {
      const alto = 64, img = new Image();
      const im = el("image", { href: logo(fam.logo, "blanco"), height: alto, y: -alto / 2 }, gFam);
      img.onload = () => { const ancho = alto * img.width / img.height; im.setAttribute("width", ancho); im.setAttribute("x", -ancho / 2); };
      img.src = logo(fam.logo, "blanco");
    } else {
      el("text", { class: "eco-glifo", "text-anchor": "middle", dy: "0.1em" }, gFam).textContent = fam.glifo;
      // Los nombres largos van en dos líneas.
      const nombre = el("text", { class: "eco-nombre-familia", "text-anchor": "middle", y: 44 }, gFam);
      const partes = fam.nombre.length > 14 ? fam.nombre.split(/ (?=de )/) : [fam.nombre];
      partes.forEach((texto, k) => { el("tspan", { x: 0, dy: k ? "1.2em" : 0 }, nombre).textContent = texto; });
    }
    gFam.addEventListener("click", () => ficha({ familia: fam }));

    const hijos = SERVICIOS.filter((s) => s.familia === fam.id);
    const paso = (angosto ? 34 : 27) * Math.PI / 180;
    hijos.forEach((s, j) => {
      const a = ang + (j - (hijos.length - 1) / 2) * paso;
      // Rayos casi verticales: las etiquetas van centradas y a dos alturas para no pisarse.
      const vertical = Math.abs(Math.cos(a)) < 0.45;
      const radio = rHijo + (vertical && j % 2 ? 44 : 0);
      const p = { x: hub.x + Math.cos(a) * radio, y: hub.y + Math.sin(a) * radio };
      const demora = demoraHub + 500 + j * 70;
      el("path", { d: curva(hacia(hub, p, 50), p, 0.12), class: "eco-trazo", "data-familia": fam.id, pathLength: 1, style: `--demora:${demora - 250}ms` }, trazos);
      const g = el("g", { class: `eco-servicio eco-aparece eco-servicio--${s.estado}`, "data-familia": fam.id, tabindex: 0, role: "button",
        "aria-label": `${s.nombre}: ${t("eco.estado." + s.estado)}`, transform: `translate(${p.x},${p.y})`, style: `--demora:${demora}ms` }, nodos);
      if (s.estado === "online") el("circle", { r: 14, fill: "url(#eco-brillo)", class: "eco-titila", style: `--fase:${(j * 0.7 + i) % 4}s` }, g);
      const k = angosto ? 1.6 : 1; // puntos más grandes cuando la escena se achica
      if (s.estado === "instalable") el("rect", { x: -4.5 * k, y: -4.5 * k, width: 9 * k, height: 9 * k, transform: "rotate(45)", class: "eco-punto" }, g);
      else el("circle", { r: (s.estado === "online" ? 4.5 : 5) * k, class: "eco-punto" }, g);
      el("circle", { r: 16, class: "eco-blanco-toque" }, g); // área de toque más grande que el punto
      const derecha = Math.cos(a) >= 0;
      const etiqueta = vertical
        ? { x: 0, y: Math.sin(a) < 0 ? -14 : 22, "text-anchor": "middle" }
        : { x: derecha ? 12 : -12, dy: "0.35em", "text-anchor": derecha ? "start" : "end" };
      el("text", { class: "eco-etiqueta", ...etiqueta }, g).textContent = s.corto ?? s.nombre;
      g.addEventListener("click", () => ficha({ servicio: s, familia: fam }));
    });
  });

  for (const g of nodos.querySelectorAll("[data-familia]")) {
    g.addEventListener("keydown", (ev) => (ev.key === "Enter" || ev.key === " ") && (ev.preventDefault(), g.dispatchEvent(new Event("click"))));
    g.addEventListener("mouseenter", () => resaltar(g.dataset.familia));
    g.addEventListener("focus", () => resaltar(g.dataset.familia));
    g.addEventListener("mouseleave", () => resaltar(null));
    g.addEventListener("blur", () => resaltar(null));
  }
  if (!sinMovimiento) requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.add("eco-listo")));
  else svg.classList.add("eco-listo");
}

function resaltar(familia) {
  const svg = $("constelacion");
  svg.classList.toggle("eco-foco", !!familia);
  for (const e of svg.querySelectorAll("[data-familia]")) e.classList.toggle("eco-activo", e.dataset.familia === familia);
}

function ficha({ servicio, familia }) {
  const panel = $("eco-ficha");
  const cabeza = familia.logo
    ? `<img src="${logo(familia.logo, "color")}" alt="${esc(familia.nombre)}" class="eco-ficha__logo">`
    : `<p class="eco-ficha__familia">${esc(familia.nombre)}</p>`;
  if (servicio) {
    $("eco-ficha-contenido").innerHTML = `${cabeza}<h2>${esc(servicio.nombre)}</h2>
      <p class="eco-estado eco-estado--${servicio.estado}">${esc(t("eco.estado." + servicio.estado))}</p>
      ${servicio.url ? `<a class="boton" href="${esc(servicio.url)}" rel="noopener">${esc(t("eco.abrir"))} <span aria-hidden="true">↗</span></a>` : ""}`;
  } else {
    const hijos = SERVICIOS.filter((s) => s.familia === familia.id);
    $("eco-ficha-contenido").innerHTML = `${cabeza}<h2>${esc(familia.nombre)}</h2>
      <ul>${hijos.map((s) => `<li><span class="eco-estado eco-estado--${s.estado}">${esc(s.nombre)}</span></li>`).join("")}</ul>`;
  }
  panel.hidden = false;
}

function lista() {
  $("eco-lista").innerHTML = FAMILIAS.map((fam) => {
    const hijos = SERVICIOS.filter((s) => s.familia === fam.id);
    const titulo = fam.logo
      ? `<img src="${logo(fam.logo, "color")}" alt="" class="eco-lista__logo"><span>${esc(fam.nombre)}</span>`
      : `<span class="eco-lista__glifo" aria-hidden="true">${esc(fam.glifo)}</span><span>${esc(fam.nombre)}</span>`;
    return `<section class="eco-lista__familia"><h3>${titulo}</h3><ul>${hijos.map((s) => `<li>
      <span class="eco-estado eco-estado--${s.estado}" title="${esc(t("eco.estado." + s.estado))}"><span class="visually-hidden">${esc(t("eco.estado." + s.estado))}: </span>${esc(s.nombre)}</span>
      ${s.url ? `<a href="${esc(s.url)}" rel="noopener">${esc(s.url.replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a>` : ""}</li>`).join("")}</ul></section>`;
  }).join("");
}

aplicarTextos();
lista();
dibujar();
$("eco-cerrar").addEventListener("click", () => ($("eco-ficha").hidden = true));
addEventListener("keydown", (ev) => ev.key === "Escape" && ($("eco-ficha").hidden = true));
let ancho = $("constelacion").clientWidth;
addEventListener("resize", () => {
  const nuevo = $("constelacion").clientWidth;
  if ((nuevo < 640) !== (ancho < 640)) dibujar(); // solo cambia la escena al cruzar el corte
  ancho = nuevo;
});
