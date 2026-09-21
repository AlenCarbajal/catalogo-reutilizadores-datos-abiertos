// Visor de proyectos con dos vistas sobre el mismo criterio de agrupación:
// - Red: cada proyecto es un nodo y aparece un nodo "grupo" por cada valor
//   (p. ej. cada tecnología); los proyectos se unen a los grupos que comparten.
// - Clusters: un racimo de puntos por valor. Un proyecto con varios valores
//   aparece una vez en cada racimo.
// Opcionalmente se colorea por una segunda variable, con su leyenda.
// Usa d3 (force, zoom, drag). El estado vive en la URL.

const CRITERIOS = ["tipo_desarrollo", "tipo_organizacion", "tecnologias", "fuentes", "etiquetas"];
const VISTAS = ["red", "clusters"];
const PALETA = ["#393793", "#B369ED", "#2E8B8B", "#D9822B", "#232D4F", "#C44F7A", "#6FA83B", "#4A90C8"];
const SIN_COLOR = "#393793", OTROS = "#A3A5B5";
const lista = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const valores = (item, c) => (c === "fuentes" ? item.datos_utilizados.map((d) => d.nombre) : lista(item[c]));
const nombreValor = (c, v) => (c === "fuentes" ? v : etiqueta(c, v));
const normalizar = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const sinMovimiento = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (id) => document.getElementById(id);

const url = new URLSearchParams(location.search);
const elegir = (v, opciones, def) => (opciones.includes(v) ? v : def);
const estado = {
  vista: elegir(url.get("vista"), VISTAS, "red"),
  criterio: elegir(url.get("por"), CRITERIOS, "tipo_desarrollo"),
  color: url.get("color") === "no" ? null : elegir(url.get("color"), CRITERIOS, "tipo_organizacion"),
};
let items = [];
let colores = new Map(); // valor → color, según estado.color

const svg = d3.select("#red");
const lienzo = svg.append("g");
const capaLinks = lienzo.append("g").attr("class", "links");
const capaNodos = lienzo.append("g").attr("class", "nodos");
const capaRotulos = lienzo.append("g").attr("class", "rotulos");
const zoom = d3.zoom().scaleExtent([0.3, 4]).on("zoom", (ev) => lienzo.attr("transform", ev.transform));
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
  .force("link", d3.forceLink().id((d) => d.id))
  .force("charge", d3.forceManyBody())
  .force("collide", d3.forceCollide((d) => d.r + (estado.vista === "red" ? 6 : 1.5)))
  .force("x", d3.forceX())
  .force("y", d3.forceY())
  .on("tick", dibujar)
  .on("end", () => encuadrarAlTerminar && encuadrar());

let nodos = [], links = [], rotulos = [], selNodos, selLinks, selRotulos;

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
const colorDe = (item) => (estado.color ? colores.get(valorColor(item)) ?? OTROS : SIN_COLOR);

function renderLeyenda() {
  const leyenda = $("leyenda");
  leyenda.hidden = !estado.color;
  if (!estado.color) return;
  const conteo = d3.rollup(items, (v) => v.length, (item) => (colores.get(valorColor(item)) === OTROS ? "__otros" : valorColor(item) ?? "__otros"));
  const filas = [...conteo].sort((a, b) => (a[0] === "__otros") - (b[0] === "__otros") || b[1] - a[1]);
  const multiple = estado.color !== "tipo_organizacion";
  leyenda.innerHTML = `<p class="visor-red__leyenda-titulo">${esc(t("red.leyenda_titulo", { variable: t("red.criterio." + estado.color) }))}</p>
    <ul>${filas.map(([v, n]) => `<li data-valor="${esc(v)}" tabindex="0"><span style="background:${v === "__otros" ? OTROS : colores.get(v)}"></span>${esc(v === "__otros" ? t("red.otros") : nombreValor(estado.color, v))} <small>${n}</small></li>`).join("")}</ul>
    ${multiple ? `<p class="visor-red__leyenda-nota">${esc(t("red.leyenda_primer_valor"))}</p>` : ""}`;
}

function resaltarColor(v) {
  const coincide = (item) => (v === "__otros" ? colores.get(valorColor(item)) === OTROS || valorColor(item) == null : valorColor(item) === v);
  selNodos.classed("tenue", (d) => v != null && (d.grupo || !coincide(d.item)));
  selRotulos?.classed("tenue", v != null);
  selLinks.classed("tenue", v != null);
}

// --- armado ------------------------------------------------------------------
function armar() {
  const { vista, criterio } = estado;
  // Conserva posiciones de los nodos que ya estaban para que la transición sea continua.
  const antes = new Map(nodos.map((n) => [n.id, n]));
  const posDe = (item) => antes.get("p:" + item.id) ?? [...antes.values()].find((n) => n.item === item) ?? {};
  const conteo = new Map();
  for (const item of items) for (const v of valores(item, criterio)) conteo.set(v, (conteo.get(v) ?? 0) + 1);
  const grupos = [...conteo].sort((a, b) => b[1] - a[1]);
  let fuerzas;

  if (vista === "red") {
    const proyectos = items.map((item) => Object.assign({ x: posDe(item).x, y: posDe(item).y }, { id: "p:" + item.id, item, r: 9 }));
    const nodosGrupo = grupos.map(([v, n]) => {
      const previo = antes.get(`g:${criterio}:${v}`);
      return Object.assign(previo ?? { x: (Math.random() - 0.5) * 300, y: (Math.random() - 0.5) * 300 },
        { id: `g:${criterio}:${v}`, grupo: true, valor: v, n, r: 14 + Math.sqrt(n) * 6 });
    });
    nodos = [...proyectos, ...nodosGrupo];
    links = items.flatMap((item) => valores(item, criterio).map((v) => ({ source: "p:" + item.id, target: `g:${criterio}:${v}` })));
    rotulos = [];
    fuerzas = () => {
      sim.force("link").distance(80).strength(0.5);
      sim.force("charge").strength((d) => (d.grupo ? -260 : -140));
      sim.force("x").x(0).strength(0.05);
      sim.force("y").y(0).strength(0.05);
    };
  } else {
    // Racimos en grilla; el tamaño de cada celda sale del racimo más grande.
    const r = 7;
    const radio = (n) => r * 1.25 * Math.sqrt(n) + r;
    const celda = 2 * radio(grupos[0]?.[1] ?? 1) + 56;
    const columnas = Math.max(1, Math.round(Math.sqrt(grupos.length * 1.4)));
    const centros = new Map(grupos.map(([v, n], i) => {
      const fila = Math.floor(i / columnas), col = i % columnas;
      const enFila = Math.min(columnas, grupos.length - fila * columnas);
      return [v, { x: (col - (enFila - 1) / 2) * celda, y: fila * celda, n }];
    }));
    nodos = items.flatMap((item) => valores(item, criterio).map((v) => {
      const id = `c:${criterio}:${v}:${item.id}`;
      const previo = antes.get(id) ?? posDe(item);
      return { x: previo.x ?? centros.get(v).x, y: previo.y ?? centros.get(v).y, id, item, valor: v, r };
    }));
    links = [];
    rotulos = grupos.map(([v, n]) => ({ id: `${criterio}:${v}`, valor: v, n, x: centros.get(v).x, y: centros.get(v).y - radio(n) - 10 }));
    fuerzas = () => {
      sim.force("charge").strength(-2);
      sim.force("x").x((d) => centros.get(d.valor).x).strength(0.18);
      sim.force("y").y((d) => centros.get(d.valor).y).strength(0.18);
    };
  }

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
  selNodos.select("text").text((d) => (d.grupo ? nombreValor(criterio, d.valor) : vista === "red" ? d.item.nombre : ""));
  selNodos.select("title").text((d) => (d.grupo ? t("red.grupo_titulo", { n: d.n }) : `${d.item.nombre} · ${d.item.organizacion}`));
  selNodos.on("click", (ev, d) => detalle(d)).on("keydown", (ev, d) => ev.key === "Enter" && detalle(d))
    .on("mouseenter focus", (ev, d) => resaltar(d)).on("mouseleave blur", () => resaltar(null))
    .call(d3.drag()
      .on("start", (ev, d) => { if (!ev.active) sim.alphaTarget(0.2).restart(); d.fx = d.x; d.fy = d.y; })
      .on("drag", (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
      .on("end", (ev, d) => { if (!ev.active) sim.alphaTarget(0); d.fx = d.fy = null; }));

  selRotulos = capaRotulos.selectAll("text").data(rotulos, (d) => d.id)
    .join(
      (enter) => enter.append("text").attr("text-anchor", "middle").attr("opacity", 0)
        .call((s) => s.transition().delay(sinMovimiento ? 0 : 300).duration(500).attr("opacity", 1)),
      (update) => update,
      (exit) => exit.transition().duration(200).attr("opacity", 0).remove(),
    )
    .attr("x", (d) => d.x).attr("y", (d) => d.y)
    .text((d) => `${nombreValor(criterio, d.valor)} · ${d.n}`);

  svg.classed("denso", vista === "red" && items.length > 20);
  // Primero los nodos: las fuerzas y los links se inicializan contra los nodos actuales.
  sim.force("x").x(0);
  sim.force("y").y(0);
  sim.nodes(nodos);
  fuerzas();
  sim.force("link").links(links);
  sim.force("collide").radius((d) => d.r + (vista === "red" ? 6 : 1.5));
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
  if (estado.vista === "clusters") for (const n of nodos) if (n.item === d.item) ids.add(n.id);
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
  selRotulos?.classed("tenue", false);
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
    const deGrupo = items.filter((item) => valores(item, estado.criterio).includes(d.valor));
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
  const p = new URLSearchParams({ vista: estado.vista, por: estado.criterio, color: estado.color ?? "no" });
  history.replaceState(null, "", "?" + p);
}

async function iniciar() {
  aplicarTextos();
  const opciones = (sel) => CRITERIOS.map((c) => `<option value="${c}" ${c === sel ? "selected" : ""}>${esc(t("red.criterio." + c))}</option>`).join("");
  $("criterio").innerHTML = opciones(estado.criterio);
  $("variable-color").innerHTML = opciones(estado.color ?? "tipo_organizacion");
  $("colorear").checked = !!estado.color;
  $("variable-color").disabled = !estado.color;
  for (const b of document.querySelectorAll("[data-vista]")) b.setAttribute("aria-pressed", b.dataset.vista === estado.vista);

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

  for (const b of document.querySelectorAll("[data-vista]")) b.addEventListener("click", () => {
    if (estado.vista === b.dataset.vista) return;
    estado.vista = b.dataset.vista;
    for (const o of document.querySelectorAll("[data-vista]")) o.setAttribute("aria-pressed", o === b);
    $("detalle").hidden = true;
    escribirURL();
    armar();
  });
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
