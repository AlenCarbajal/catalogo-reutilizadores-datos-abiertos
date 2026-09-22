// Ecosistema datos.gob.ar, en dos niveles:
// - Vista general: datos.gob.ar en el centro y, en una órbita, las tres
//   herramientas centrales (Portal Andino, API Georef, API Series de Tiempo).
// - Al tocar una herramienta la vista se acerca y aparece lo que la orbita:
//   los portales Andino activos (data/portales.json, que genera
//   scripts/portales.py desde la API de datos.gob.ar), las librerías de Georef
//   y el explorador de series.
// Debajo, la lista completa de servicios. Solo datos públicos.

// Lo que orbita a cada herramienta. Los portales de Andino se cargan aparte.
const SISTEMAS = [
  { id: "georef", nombre: "API Georef", logo: "georef", angulo: -38, satelites: [
    { nombre: "Librería Python Georef", corto: "Python" },
    { nombre: "Librería R Georef", corto: "R" },
    { nombre: "Plugin QGIS Georef", corto: "Plugin QGIS" },
    { nombre: "georef-ux" },
  ] },
  { id: "series", nombre: "API Series de Tiempo", logo: "series-de-tiempo", angulo: 42, satelites: [
    { nombre: "Explorador de series", url: "https://datos.gob.ar/series" },
  ] },
  { id: "andino", nombre: "Portal Andino", logo: "andino", angulo: 188, satelites: [] },
];

// Lista completa, por familia. estado: "online" | "offline" | "instalable".
const FAMILIAS = [
  { id: "portales", nombre: "Portales", glifo: "•••" },
  { id: "andino", nombre: "Andino", logo: "andino" },
  { id: "georef", nombre: "Georef", logo: "georef" },
  { id: "series", nombre: "Series de Tiempo", logo: "series-de-tiempo" },
  { id: "apertura", nombre: "Apertura de datos", logo: "paquete-apertura" },
  { id: "metas", nombre: "Metas", glifo: "✓" },
  { id: "infra", nombre: "Infraestructura de datos", glifo: "Σ" },
];
const SERVICIOS = [
  { familia: "portales", nombre: "Portal Nacional de Datos Públicos", estado: "online", url: "https://datos.gob.ar" },
  { familia: "portales", nombre: "Portal Nacional de Datos Públicos (versión anterior)", estado: "online", url: "https://old.datos.gob.ar" },
  { familia: "portales", nombre: "Consulta Pública", estado: "online" },
  { familia: "andino", nombre: "Portal Andino (entorno de pruebas)", estado: "online", url: "https://andino-v2.datos.gob.ar" },
  { familia: "georef", nombre: "API Georef 1.0", estado: "online" },
  { familia: "georef", nombre: "API Georef 2.0", estado: "online" },
  { familia: "georef", nombre: "API Georef 2.1", estado: "online" },
  { familia: "georef", nombre: "georef-ux", estado: "online" },
  { familia: "georef", nombre: "Librería Python Georef", estado: "instalable" },
  { familia: "georef", nombre: "Librería R Georef", estado: "instalable" },
  { familia: "georef", nombre: "Plugin QGIS Georef", estado: "instalable" },
  { familia: "series", nombre: "API Series de Tiempo", estado: "online" },
  { familia: "series", nombre: "API Series de Tiempo V2", estado: "online" },
  { familia: "series", nombre: "Explorador de series", estado: "online", url: "https://datos.gob.ar/series" },
  { familia: "apertura", nombre: "Paquete de apertura de datos", estado: "online" },
  { familia: "apertura", nombre: "DATOB", estado: "online" },
  { familia: "apertura", nombre: "Vocabularios y codelists", estado: "online", url: "https://infra.datos.gob.ar/vocabulario/" },
  { familia: "metas", nombre: "Metas del 5.º plan", estado: "online" },
  { familia: "metas", nombre: "Metas del 6.º plan", estado: "online" },
  { familia: "metas", nombre: "Metas (desarrollo)", estado: "online" },
  { familia: "infra", nombre: "Data Warehouse", estado: "online" },
  { familia: "infra", nombre: "Monitoreo", estado: "online" },
  { familia: "infra", nombre: "Nombres", estado: "offline", url: "https://nombres.datos.gob.ar" },
  { familia: "infra", nombre: "Catálogo de desarrollos basados en datos", estado: "offline" },
];

const SVGNS = "http://www.w3.org/2000/svg";
const $ = (id) => document.getElementById(id);
const sinMovimiento = matchMedia("(prefers-reduced-motion: reduce)").matches;
const logo = (nombre, variante) => `img/logos/${nombre}-${variante}.png`;
const rad = (g) => (g * Math.PI) / 180;

function el(nombre, attrs = {}, padre) {
  const e = document.createElementNS(SVGNS, nombre);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  padre?.append(e);
  return e;
}

// Generador pseudoaleatorio con semilla: el cielo de fondo es siempre el mismo.
function azar(semilla) {
  return () => ((semilla = (semilla * 16807) % 2147483647) - 1) / 2147483646;
}

// Imagen de logo con ancho según su proporción real, centrada en (0, 0).
function imagenLogo(padre, nombre, alto, y = -alto / 2) {
  const im = el("image", { href: logo(nombre, "blanco"), height: alto, y }, padre);
  const img = new Image();
  img.onload = () => { const ancho = alto * img.width / img.height; im.setAttribute("width", ancho); im.setAttribute("x", -ancho / 2); };
  img.src = logo(nombre, "blanco");
  return im;
}

// Radio del anillo de satélites de cada herramienta.
const radioSistema = (sis, angosto) => (sis.satelites.length > 8 ? (angosto ? 150 : 190) : angosto ? 120 : 150);
const recortar = (texto, max) => (texto.length > max ? texto.slice(0, max - 1).trimEnd() + "…" : texto);

// --- escena ------------------------------------------------------------------
const escena = { W: 0, H: 0, R: 0, giro: 0, enfocado: null, vista: null, animando: null };

function dibujar() {
  const svg = $("constelacion");
  const angosto = svg.clientWidth < 640;
  escena.W = angosto ? 720 : 1200;
  escena.H = angosto ? 1000 : 760;
  escena.R = angosto ? 250 : 270;
  svg.classList.toggle("angosto", angosto);
  svg.replaceChildren();
  escena.vista = [-escena.W / 2, -escena.H / 2, escena.W, escena.H];
  svg.setAttribute("viewBox", escena.vista.join(" "));

  const defs = el("defs", {}, svg);
  const halo = el("radialGradient", { id: "eco-halo" }, defs);
  el("stop", { offset: "0", "stop-color": "#6D6BD6", "stop-opacity": ".55" }, halo);
  el("stop", { offset: "1", "stop-color": "#393793", "stop-opacity": "0" }, halo);
  const sol = el("radialGradient", { id: "eco-sol" }, defs);
  el("stop", { offset: "0", "stop-color": "#E7BA61", "stop-opacity": ".22" }, sol);
  el("stop", { offset: "1", "stop-color": "#E7BA61", "stop-opacity": "0" }, sol);

  // Cielo de fondo, más amplio que la vista para que no se corte al acercarse.
  const r = azar(7);
  const cielo = el("g", { class: "eco-cielo", "aria-hidden": "true" }, svg);
  for (let i = 0; i < 170; i++) el("circle", { cx: (r() - 0.5) * escena.W * 1.4, cy: (r() - 0.5) * escena.H * 1.4, r: r() * 1.2 + 0.3, opacity: (r() * 0.35 + 0.1).toFixed(2) }, cielo);

  // Centro: datos.gob.ar dentro de su anillo dorado, como en el diagrama del equipo.
  const centro = el("g", { class: "eco-centro eco-aparece", style: "--demora:0ms" }, svg);
  el("circle", { r: escena.R * 0.62, fill: "url(#eco-sol)" }, centro);
  el("circle", { r: escena.R * 0.5, class: "eco-anillo-sol" }, centro);
  imagenLogo(centro, "datos-gob-ar", angosto ? 44 : 40);

  // Órbita de las herramientas.
  el("circle", { r: escena.R, class: "eco-orbita eco-aparece", style: "--demora:200ms" }, svg);

  const giro = el("g", { id: "eco-giro" }, svg);
  SISTEMAS.forEach((sis, i) => {
    const a = rad(sis.angulo);
    const planeta = el("g", { class: "eco-planeta eco-aparece", "data-sistema": sis.id,
      transform: `translate(${Math.cos(a) * escena.R},${Math.sin(a) * escena.R})`, style: `--demora:${450 + i * 150}ms` }, giro);
    const contra = el("g", { class: "eco-contra" }, planeta); // mantiene derecho lo que gira
    dibujarSistema(contra, sis, angosto);
    const cuerpo = el("g", { class: "eco-cuerpo", tabindex: 0, role: "button", "aria-label": t("eco.acercar", { nombre: sis.nombre }) }, contra);
    el("circle", { r: 66, fill: "url(#eco-halo)" }, cuerpo);
    el("circle", { r: 7, class: "eco-planeta__punto" }, cuerpo);
    imagenLogo(cuerpo, sis.logo, 58, -74);
    el("text", { class: "eco-planeta__nombre", "text-anchor": "middle", y: 30 }, cuerpo).textContent = sis.nombre;
    cuerpo.addEventListener("click", () => enfocar(sis.id));
    cuerpo.addEventListener("keydown", (ev) => (ev.key === "Enter" || ev.key === " ") && (ev.preventDefault(), enfocar(sis.id)));
  });

  svg.classList.toggle("eco-listo", sinMovimiento);
  if (!sinMovimiento) requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.add("eco-listo")));
  aplicarGiro();
  if (escena.enfocado) enfocar(escena.enfocado, true);
}

// Lo que orbita a una herramienta: un anillo propio y sus satélites, ocultos
// hasta que se la enfoca.
function dibujarSistema(padre, sis, angosto) {
  const sistema = el("g", { class: "eco-sistema", "data-sistema": sis.id }, padre);
  const n = sis.satelites.length;
  const radio = radioSistema(sis, angosto);
  el("circle", { r: radio, class: "eco-orbita eco-orbita--sistema" }, sistema);
  if (!n) {
    el("text", { class: "eco-satelite__etiqueta", "text-anchor": "middle", y: radio + 34 }, sistema).textContent = t("eco.sin_portales");
    return;
  }
  sis.satelites.forEach((s, j) => {
    const a = rad(-90 + (360 / n) * j + (n === 1 ? 45 : 0));
    const x = Math.cos(a) * radio, y = Math.sin(a) * radio;
    const g = el("g", { class: "eco-satelite", transform: `translate(${x},${y})`, style: `--demora:${j * 45}ms`,
      tabindex: -1, role: "button", "aria-label": s.nombre }, sistema);
    el("circle", { r: 16, class: "eco-blanco-toque" }, g);
    el("circle", { r: angosto ? 7 : 5.5, class: "eco-satelite__punto" }, g);
    const derecha = Math.cos(a) > 0.2, izquierda = Math.cos(a) < -0.2;
    el("text", { class: "eco-satelite__etiqueta", x: derecha ? 12 : izquierda ? -12 : 0, y: derecha || izquierda ? 0 : Math.sin(a) < 0 ? -14 : 22,
      dy: derecha || izquierda ? "0.35em" : 0, "text-anchor": derecha ? "start" : izquierda ? "end" : "middle" }, g).textContent =
      angosto ? recortar(s.corto ?? s.nombre, 16) : s.corto ?? s.dominio ?? s.nombre; // en pantallas angostas, el nombre corto
    g.addEventListener("click", () => ficha(s, sis));
    g.addEventListener("keydown", (ev) => (ev.key === "Enter" || ev.key === " ") && (ev.preventDefault(), ficha(s, sis)));
  });
}

// Giro lento de la órbita; las herramientas se mantienen derechas.
function aplicarGiro() {
  $("eco-giro")?.setAttribute("transform", `rotate(${escena.giro})`);
  for (const c of document.querySelectorAll(".eco-contra")) c.setAttribute("transform", `rotate(${-escena.giro})`);
}
let ultimo = null, pausado = false;
function girar(ahora) {
  if (ultimo !== null && !pausado && !escena.enfocado) {
    escena.giro = (escena.giro + (ahora - ultimo) * 0.0012) % 360; // una vuelta cada 5 minutos
    aplicarGiro();
  }
  ultimo = ahora;
  requestAnimationFrame(girar);
}

// Anima el viewBox hacia un destino.
function moverVista(destino, instantaneo) {
  const svg = $("constelacion"), inicio = escena.vista.slice(), t0 = performance.now(), dur = 900;
  cancelAnimationFrame(escena.animando);
  const paso = (ahora) => {
    const p = instantaneo || sinMovimiento ? 1 : Math.min(1, (ahora - t0) / dur);
    const e = p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2;
    escena.vista = inicio.map((v, i) => v + (destino[i] - v) * e);
    svg.setAttribute("viewBox", escena.vista.join(" "));
    if (p < 1) escena.animando = requestAnimationFrame(paso);
  };
  paso(t0);
}

function enfocar(id, instantaneo = false) {
  const sis = SISTEMAS.find((s) => s.id === id);
  if (!sis) return;
  escena.enfocado = id;
  const a = rad(sis.angulo + escena.giro);
  const cx = Math.cos(a) * escena.R, cy = Math.sin(a) * escena.R;
  const angosto = escena.W < escena.H, radio = radioSistema(sis, angosto);
  const ancho = (radio + (angosto ? 150 : 200)) * 2, alto = Math.max(ancho * escena.H / escena.W, (radio + 110) * 2);
  const svg = $("constelacion");
  svg.classList.add("eco-enfocado");
  for (const g of svg.querySelectorAll("[data-sistema]")) g.classList.toggle("eco-activo", g.dataset.sistema === id);
  for (const s of svg.querySelectorAll(".eco-satelite")) s.setAttribute("tabindex", s.closest(".eco-activo") ? 0 : -1);
  moverVista([cx - ancho / 2, cy - alto / 2, ancho, alto], instantaneo);
  $("eco-volver").hidden = false;
  $("eco-sistema-titulo").textContent = t("eco.orbita_de", { nombre: sis.nombre });
  $("eco-ficha").hidden = true;
  if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
}

function alejar() {
  if (!escena.enfocado) return;
  escena.enfocado = null;
  const svg = $("constelacion");
  svg.classList.remove("eco-enfocado");
  for (const g of svg.querySelectorAll(".eco-activo")) g.classList.remove("eco-activo");
  for (const s of svg.querySelectorAll(".eco-satelite")) s.setAttribute("tabindex", -1);
  moverVista([-escena.W / 2, -escena.H / 2, escena.W, escena.H]);
  $("eco-volver").hidden = true;
  $("eco-sistema-titulo").textContent = "";
  $("eco-ficha").hidden = true;
  history.replaceState(null, "", location.pathname + location.search);
}

function ficha(s, sis) {
  $("eco-ficha-contenido").innerHTML = `<img src="${logo(sis.logo, "color")}" alt="${esc(sis.nombre)}" class="eco-ficha__logo">
    <h2>${esc(s.nombre)}</h2>
    ${s.dominio ? `<p class="eco-ficha__dominio">${esc(s.dominio)}</p>` : ""}
    ${s.url ? `<a class="boton" href="${esc(s.url)}" rel="noopener">${esc(t("eco.abrir"))} <span aria-hidden="true">↗</span></a>` : ""}`;
  $("eco-ficha").hidden = false;
}

// --- lista -------------------------------------------------------------------
function lista(portales) {
  const item = (nombre, estado, url) => `<li>
    <span class="eco-estado eco-estado--${estado}"><span class="visually-hidden">${esc(t("eco.estado." + estado))}: </span>${esc(nombre)}</span>
    ${url ? `<a href="${esc(url)}" rel="noopener">${esc(url.replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a>` : ""}</li>`;
  const titulo = (fam) => fam.logo
    ? `<img src="${logo(fam.logo, "color")}" alt="" class="eco-lista__logo"><span>${esc(fam.nombre)}</span>`
    : `<span class="eco-lista__glifo" aria-hidden="true">${esc(fam.glifo)}</span><span>${esc(fam.nombre)}</span>`;
  $("eco-lista").innerHTML = FAMILIAS.map((fam) => `<section class="eco-lista__familia"><h3>${titulo(fam)}</h3><ul>
      ${SERVICIOS.filter((s) => s.familia === fam.id).map((s) => item(s.nombre, s.estado, s.url)).join("")}</ul></section>`).join("")
    + (portales.length ? `<section class="eco-lista__familia"><h3><span class="eco-lista__glifo" aria-hidden="true">${portales.length}</span>
      <span class="eco-lista__visible">${esc(t("eco.portales_andino"))}</span></h3><ul>${portales.map((p) => item(p.nombre, "online", p.url)).join("")}</ul></section>` : "");
}

async function iniciar() {
  aplicarTextos();
  let portales = [];
  try { portales = await (await fetch("data/portales.json")).json(); } catch { /* sin portales: el sistema de Andino lo avisa */ }
  SISTEMAS.find((s) => s.id === "andino").satelites = portales;
  lista(portales);
  escena.enfocado = SISTEMAS.some((s) => "#" + s.id === location.hash) ? location.hash.slice(1) : null;
  dibujar();
  if (!sinMovimiento) requestAnimationFrame(girar);

  const svg = $("constelacion");
  svg.addEventListener("mouseenter", () => (pausado = true));
  svg.addEventListener("mouseleave", () => (pausado = false));
  svg.addEventListener("click", (ev) => ev.target === svg && ($("eco-ficha").hidden ? alejar() : ($("eco-ficha").hidden = true)));
  $("eco-volver").addEventListener("click", alejar);
  $("eco-cerrar").addEventListener("click", () => ($("eco-ficha").hidden = true));
  addEventListener("keydown", (ev) => {
    if (ev.key !== "Escape") return;
    if (!$("eco-ficha").hidden) $("eco-ficha").hidden = true;
    else alejar();
  });
  // Enlaces directos a una herramienta (#andino, #georef, #series).
  addEventListener("hashchange", () => {
    const id = location.hash.slice(1);
    if (SISTEMAS.some((s) => s.id === id)) enfocar(id);
    else alejar();
  });
  let angosto = svg.clientWidth < 640;
  addEventListener("resize", () => {
    if ((svg.clientWidth < 640) !== angosto) { angosto = !angosto; dibujar(); } // solo al cruzar el corte
  });
}

iniciar();
