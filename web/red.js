// Visor en red: cada proyecto es un nodo. Al elegir un criterio aparece un nodo
// "grupo" por cada valor (p. ej. cada tecnología) y los proyectos se unen a los
// grupos que comparten, así se forman los racimos. Opcionalmente se colorea por
// una segunda variable, con su leyenda.
// Usa d3 (force, zoom, drag). El estado vive en la URL.

const CRITERIOS = ["tipo_desarrollo", "tipo_organizacion", "tecnologias", "fuentes", "etiquetas"];
const PALETA = ["#393793", "#B369ED", "#2E8B8B", "#D9822B", "#232D4F", "#C44F7A", "#6FA83B", "#4A90C8"];
const SIN_COLOR = "#393793", OTROS = "#A3A5B5", SIN_DATO = "#DDDEE6";
const lista = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const valores = (item, c) => (c === "fuentes" ? item.datos_utilizados.map((d) => d.nombre) : lista(item[c]));
// Para agrupar, un proyecto sin valores cae en el grupo "Sin dato" en vez de quedar suelto.
const grupoDe = (item, c) => (valores(item, c).length ? valores(item, c) : ["__sin"]);
const nombreValor = (c, v) => (v === "__sin" ? t("red.sin_dato") : c === "fuentes" ? v : etiqueta(c, v));
const normalizar = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const sinMovimiento = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (id) => document.getElementById(id);

const url = new URLSearchParams(location.search);
const elegir = (v, opciones, def) => (opciones.includes(v) ? v : def);
const estado = {
  criterio: elegir(url.get("por"), CRITERIOS, "tipo_desarrollo"),
  color: url.get("color") === "no" ? null : elegir(url.get("color"), CRITERIOS, "tipo_organizacion"),
};
let items = [];
let colores = new Map(); // valor → color, según estado.color

const svg = d3.select("#red");
const lienzo = svg.append("g");
const capaLinks = lienzo.append("g").attr("class", "links");
const capaNodos = lienzo.append("g").attr("class", "nodos");
// Los rótulos de los grupos mantienen su tamaño en pantalla con cualquier zoom; los
// de grupos que en pantalla quedan chicos se ocultan (se ven al pasar por encima).
let escala = 1;
const zoom = d3.zoom().scaleExtent([0.2, 4]).on("zoom", (ev) => {
  lienzo.attr("transform", ev.transform);
  if (ev.transform.k !== escala) { escala = ev.transform.k; escalarRotulos(); }
});
const escalarRotulos = () => selNodos?.filter((d) => d.grupo).classed("chico", (d) => d.r * escala < 14)
  .select("text").attr("transform", `scale(${1 / escala})`);
svg.call(zoom);

// Ajusta el zoom para que entre todo. Solo al armar, no después de arrastrar.
let encuadrarAlTerminar = false;
function encuadrar() {
  encuadrarAlTerminar = false;
  const b = lienzo.node().getBBox(), { width, height } = svg.node().getBoundingClientRect();
  if (!b.width || !b.height) return;
  const k = Math.min(1.5, 0.92 * Math.min(width / b.width, height / b.height));
  svg.transition().duration(sinMovimiento ? 0 : 700)
    .call(zoom.transform, d3.zoomIdentity.scale(k).translate(-(b.x + b.width / 2), -(b.y + b.height / 2)));
}

const sim = d3.forceSimulation()
  .force("link", d3.forceLink().id((d) => d.id).distance(80).strength(0.5))
  .force("charge", d3.forceManyBody().strength((d) => (d.grupo ? -260 : -140)))
  .force("collide", d3.forceCollide((d) => d.r + 6))
  .force("x", d3.forceX(0).strength(0.05))
  .force("y", d3.forceY(0).strength(0.05))
  .on("tick", dibujar)
  .on("end", () => encuadrarAlTerminar && encuadrar());

let nodos = [], links = [], selNodos, selLinks;

// --- color -------------------------------------------------------------------
// Con variables de varios valores se usa el primero. Los valores menos
// frecuentes (más allá de la paleta) van a "Otros".
function calcularColores() {
  colores = new Map();
  if (!estado.color) return;
  const conteo = d3.rollup(items, (v) => v.length, (item) => valores(item, estado.color)[0]);
  const orden = [...conteo].filter(([v]) => v != null).sort((a, b) => b[1] - a[1]);
  orden.forEach(([v], i) => colores.set(v, i < PALETA.length - 1 || orden.length === PALETA.length ? PALETA[i] : OTROS));
}
const valorColor = (item) => (estado.color ? valores(item, estado.color)[0] : null);
const colorDe = (item) => (!estado.color ? SIN_COLOR : valorColor(item) == null ? SIN_DATO : colores.get(valorColor(item)) ?? OTROS);
// Clave de leyenda de cada proyecto: su valor, "__otros" o "__sin" (no tiene dato).
const claveLeyenda = (item) => (valorColor(item) == null ? "__sin" : colores.get(valorColor(item)) === OTROS ? "__otros" : valorColor(item));
const ESPECIALES = { __otros: [OTROS, "red.otros"], __sin: [SIN_DATO, "red.sin_dato"] };

function renderLeyenda() {
  const leyenda = $("leyenda");
  leyenda.hidden = !estado.color;
  if (!estado.color) return;
  const conteo = d3.rollup(items, (v) => v.length, claveLeyenda);
  const filas = [...conteo].sort((a, b) => (a[0] in ESPECIALES) - (b[0] in ESPECIALES) || b[1] - a[1]);
  const multiple = estado.color !== "tipo_organizacion";
  leyenda.innerHTML = `<p class="visor-red__leyenda-titulo">${esc(t("red.leyenda_titulo", { variable: t("red.criterio." + estado.color) }))}</p>
    <ul>${filas.map(([v, n]) => `<li data-valor="${esc(v)}" tabindex="0"><span style="background:${ESPECIALES[v]?.[0] ?? colores.get(v)}"></span>${esc(ESPECIALES[v] ? t(ESPECIALES[v][1]) : nombreValor(estado.color, v))} <small>${n}</small></li>`).join("")}</ul>
    ${multiple ? `<p class="visor-red__leyenda-nota">${esc(t("red.leyenda_primer_valor"))}</p>` : ""}`;
}

function resaltarColor(v) {
  selNodos.classed("tenue", (d) => v != null && (d.grupo || claveLeyenda(d.item) !== v));
  selLinks.classed("tenue", v != null);
}

// --- armado ------------------------------------------------------------------
function armar() {
  const { criterio } = estado;
  // Conserva posiciones de los nodos que ya estaban para que la transición sea continua.
  const antes = new Map(nodos.map((n) => [n.id, n]));
  const conteo = new Map();
  for (const item of items) for (const v of grupoDe(item, criterio)) conteo.set(v, (conteo.get(v) ?? 0) + 1);

  const proyectos = items.map((item) => Object.assign(antes.get("p:" + item.id) ?? {}, { id: "p:" + item.id, item, r: 9 }));
  const grupos = [...conteo].map(([v, n]) => {
    const previo = antes.get(`g:${criterio}:${v}`);
    return Object.assign(previo ?? { x: (Math.random() - 0.5) * 300, y: (Math.random() - 0.5) * 300 },
      { id: `g:${criterio}:${v}`, grupo: true, valor: v, n, r: 14 + Math.sqrt(n) * 6 });
  });
  nodos = [...proyectos, ...grupos];
  links = items.flatMap((item) => grupoDe(item, criterio).map((v) => ({ source: "p:" + item.id, target: `g:${criterio}:${v}` })));

  selLinks = capaLinks.selectAll("line").data(links, (d) => `${d.source.id ?? d.source}>${d.target.id ?? d.target}`)
    .join(
      (enter) => enter.append("line").attr("stroke-opacity", 0).call((s) => s.transition().duration(600).attr("stroke-opacity", 1)),
      (update) => update,
      (exit) => exit.transition().duration(300).attr("stroke-opacity", 0).remove(),
    );

  selNodos = capaNodos.selectAll("g.nodo").data(nodos, (d) => d.id)
    .join(
      (enter) => {
        const g = enter.append("g").attr("class", (d) => "nodo" + (d.grupo ? " nodo--grupo" : "")).attr("tabindex", 0).attr("role", "button");
        g.append("circle").attr("r", 0).attr("fill", (d) => (d.grupo ? null : colorDe(d.item)))
          .transition().duration(600).attr("r", (d) => d.r);
        g.append("text").attr("dy", (d) => (d.grupo ? "0.35em" : d.r + 14)).attr("text-anchor", "middle");
        g.append("title");
        return g;
      },
      (update) => update,
      (exit) => exit.call((s) => s.select("circle").transition().duration(300).attr("r", 0)).transition().duration(300).remove(),
    );
  selNodos.attr("aria-label", (d) => (d.grupo ? `${nombreValor(criterio, d.valor)} (${d.n})` : d.item.nombre));
  selNodos.select("text").text((d) => (d.grupo ? nombreValor(criterio, d.valor) : d.item.nombre));
  selNodos.select("title").text((d) => (d.grupo ? t("red.grupo_titulo", { n: d.n }) : `${d.item.nombre} · ${d.item.organizacion}`));
  selNodos.on("click", (ev, d) => detalle(d)).on("keydown", (ev, d) => ev.key === "Enter" && detalle(d))
    .on("mouseenter focus", (ev, d) => resaltar(d)).on("mouseleave blur", () => resaltar(null))
    .call(d3.drag()
      .on("start", (ev, d) => { if (!ev.active) sim.alphaTarget(0.2).restart(); d.fx = d.x; d.fy = d.y; })
      .on("drag", (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
      .on("end", (ev, d) => { if (!ev.active) sim.alphaTarget(0); d.fx = d.fy = null; }));

  escalarRotulos();
  svg.classed("denso", items.length > 20);
  // Primero los nodos: los links se resuelven por id contra los nodos actuales.
  sim.nodes(nodos);
  sim.force("link").links(links);
  encuadrarAlTerminar = true;
  if (sinMovimiento) { sim.alpha(1).stop(); for (let i = 0; i < 300; i++) sim.tick(); dibujar(); encuadrar(); }
  else sim.alpha(0.9).restart();
  buscar();
}

function recolorear() {
  calcularColores();
  renderLeyenda();
  selNodos?.filter((d) => !d.grupo).select("circle").transition().duration(sinMovimiento ? 0 : 500).attr("fill", (d) => colorDe(d.item));
}

function dibujar() {
  selLinks?.attr("x1", (d) => d.source.x).attr("y1", (d) => d.source.y).attr("x2", (d) => d.target.x).attr("y2", (d) => d.target.y);
  selNodos?.attr("transform", (d) => `translate(${d.x},${d.y})`);
}

// --- interacción -------------------------------------------------------------
function vecinos(d) {
  const ids = new Set([d.id]);
  for (const l of links) {
    if (l.source.id === d.id) ids.add(l.target.id);
    if (l.target.id === d.id) ids.add(l.source.id);
  }
  return ids;
}

function resaltar(d) {
  const ids = d && vecinos(d);
  selNodos.classed("tenue", (n) => ids && !ids.has(n.id)).classed("foco", (n) => ids && ids.has(n.id));
  selLinks.classed("activo", (l) => ids && (l.source.id === d.id || l.target.id === d.id)).classed("tenue", false);
}

function buscar() {
  const terminos = normalizar($("q").value).split(/\s+/).filter(Boolean);
  selNodos.classed("descartado", (d) => !d.grupo && terminos.length > 0 &&
    !terminos.every((q) => normalizar([d.item.nombre, d.item.organizacion, d.item.descripcion, ...valores(d.item, estado.criterio)].join(" ")).includes(q)));
}

function detalle(d) {
  const panel = $("detalle");
  panel.hidden = false;
  if (d.grupo) {
    const deGrupo = items.filter((item) => grupoDe(item, estado.criterio).includes(d.valor));
    panel.innerHTML = `<p class="rotulo">${esc(t("red.criterio." + estado.criterio))}</p><h2>${esc(nombreValor(estado.criterio, d.valor))}</h2>
      <p>${esc(t("red.grupo_titulo", { n: d.n }))}</p>
      <ul>${deGrupo.map((item) => `<li><a href="./#${esc(item.id)}">${esc(item.nombre)}</a></li>`).join("")}</ul>`;
  } else {
    const item = d.item;
    panel.innerHTML = `<p class="rotulo">${esc(etiqueta("tipo_organizacion", item.tipo_organizacion))}</p><h2>${esc(item.nombre)}</h2>
      <p class="detalle-red__org">${esc(item.organizacion)}</p><p>${esc(item.descripcion)}</p>
      <a class="boton" href="./#${esc(item.id)}">${esc(t("red.ver_ficha"))} <span aria-hidden="true">→</span></a>`;
  }
}

function escribirURL() {
  const p = new URLSearchParams({ por: estado.criterio, color: estado.color ?? "no" });
  history.replaceState(null, "", "?" + p);
}

async function iniciar() {
  aplicarTextos();
  const opciones = (sel) => CRITERIOS.map((c) => `<option value="${c}" ${c === sel ? "selected" : ""}>${esc(t("red.criterio." + c))}</option>`).join("");
  $("criterio").innerHTML = opciones(estado.criterio);
  $("variable-color").innerHTML = opciones(estado.color ?? "tipo_organizacion");
  $("colorear").checked = !!estado.color;
  $("variable-color").disabled = !estado.color;

  try {
    items = await (await fetch("data/items.json")).json();
  } catch {
    $("detalle").hidden = false;
    $("detalle").innerHTML = `<h2>${esc(t("catalogo.error_carga_titulo"))}</h2><p>${esc(t("catalogo.error_carga_texto"))}</p>`;
    return;
  }
  const ajustar = () => { const { width, height } = svg.node().getBoundingClientRect(); svg.attr("viewBox", [-width / 2, -height / 2, width, height]); };
  ajustar();
  addEventListener("resize", ajustar);

  $("criterio").addEventListener("change", (ev) => {
    estado.criterio = ev.target.value;
    $("detalle").hidden = true;
    escribirURL();
    armar();
  });
  const cambiarColor = () => {
    estado.color = $("colorear").checked ? $("variable-color").value : null;
    $("variable-color").disabled = !estado.color;
    escribirURL();
    recolorear();
  };
  $("colorear").addEventListener("change", cambiarColor);
  $("variable-color").addEventListener("change", cambiarColor);
  $("leyenda").addEventListener("mouseover", (ev) => { const li = ev.target.closest("li[data-valor]"); if (li) resaltarColor(li.dataset.valor); });
  $("leyenda").addEventListener("focusin", (ev) => { const li = ev.target.closest("li[data-valor]"); if (li) resaltarColor(li.dataset.valor); });
  $("leyenda").addEventListener("mouseleave", () => resaltarColor(null));
  $("leyenda").addEventListener("focusout", () => resaltarColor(null));
  $("q").addEventListener("input", buscar);

  calcularColores();
  renderLeyenda();
  armar();
}

iniciar();
