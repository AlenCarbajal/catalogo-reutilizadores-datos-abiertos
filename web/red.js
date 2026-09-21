// Visor en red: cada proyecto es un nodo. Al elegir un criterio aparece un nodo
// "grupo" por cada valor (p. ej. cada tecnología) y los proyectos se atraen hacia
// los grupos que comparten, así se forman los racimos. Usa d3 (force, zoom, drag).

const CRITERIOS = ["tipo_desarrollo", "tipo_organizacion", "tecnologias", "fuentes", "etiquetas"];
const COLORES = { independiente: "#B369ED", academia: "#393793", empresa: "#2E8B8B", gobierno: "#232D4F", ong: "#D9822B", otro: "#8A8CA0" };
const lista = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const valores = (item, c) => (c === "fuentes" ? item.datos_utilizados.map((d) => d.nombre) : lista(item[c]));
const nombreValor = (c, v) => (c === "fuentes" ? v : etiqueta(c, v));
const normalizar = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const sinMovimiento = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (id) => document.getElementById(id);

let items = [];
let criterio = new URLSearchParams(location.search).get("por");
if (!CRITERIOS.includes(criterio)) criterio = CRITERIOS[0];

const svg = d3.select("#red");
const lienzo = svg.append("g");
const capaLinks = lienzo.append("g").attr("class", "links");
const capaNodos = lienzo.append("g").attr("class", "nodos");
const zoom = d3.zoom().scaleExtent([0.3, 4]).on("zoom", (ev) => lienzo.attr("transform", ev.transform));
svg.call(zoom);

// Ajusta el zoom para que entre toda la red. Solo al armar, no después de arrastrar.
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

function armar() {
  // Conserva posiciones de los nodos que ya estaban para que la transición sea continua.
  const antes = new Map(nodos.map((n) => [n.id, n]));
  const proyectos = items.map((item) => Object.assign(antes.get("p:" + item.id) ?? {}, { id: "p:" + item.id, item, r: 9 }));
  const conteo = new Map();
  for (const item of items) for (const v of valores(item, criterio)) conteo.set(v, (conteo.get(v) ?? 0) + 1);
  const grupos = [...conteo].map(([v, n]) => {
    const previo = antes.get(`g:${criterio}:${v}`);
    const nuevo = previo ?? { x: (Math.random() - 0.5) * 300, y: (Math.random() - 0.5) * 300 };
    return Object.assign(nuevo, { id: `g:${criterio}:${v}`, grupo: true, valor: v, n, r: 14 + Math.sqrt(n) * 6 });
  });
  nodos = [...proyectos, ...grupos];
  links = items.flatMap((item) => valores(item, criterio).map((v) => ({ source: "p:" + item.id, target: `g:${criterio}:${v}` })));

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
        g.append("circle").attr("r", 0).attr("fill", (d) => (d.grupo ? null : COLORES[d.item.tipo_organizacion] ?? COLORES.otro))
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

  sim.nodes(nodos);
  sim.force("link").links(links);
  encuadrarAlTerminar = true;
  if (sinMovimiento) { sim.alpha(1).stop(); for (let i = 0; i < 300; i++) sim.tick(); dibujar(); encuadrar(); }
  else sim.alpha(0.9).restart();
  buscar();
}

function dibujar() {
  selLinks?.attr("x1", (d) => d.source.x).attr("y1", (d) => d.source.y).attr("x2", (d) => d.target.x).attr("y2", (d) => d.target.y);
  selNodos?.attr("transform", (d) => `translate(${d.x},${d.y})`);
}

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
  selLinks.classed("activo", (l) => ids && (l.source.id === d.id || l.target.id === d.id));
}

function buscar() {
  const terminos = normalizar($("q").value).split(/\s+/).filter(Boolean);
  selNodos.classed("descartado", (d) => !d.grupo && terminos.length > 0 &&
    !terminos.every((q) => normalizar([d.item.nombre, d.item.organizacion, d.item.descripcion, ...valores(d.item, criterio)].join(" ")).includes(q)));
}

function detalle(d) {
  const panel = $("detalle");
  panel.hidden = false;
  if (d.grupo) {
    const deGrupo = items.filter((item) => valores(item, criterio).includes(d.valor));
    panel.innerHTML = `<p class="rotulo">${esc(t("red.criterio." + criterio))}</p><h2>${esc(nombreValor(criterio, d.valor))}</h2>
      <p>${esc(t("red.grupo_titulo", { n: d.n }))}</p>
      <ul>${deGrupo.map((item) => `<li><a href="./#${esc(item.id)}">${esc(item.nombre)}</a></li>`).join("")}</ul>`;
  } else {
    const item = d.item;
    panel.innerHTML = `<p class="rotulo">${esc(etiqueta("tipo_organizacion", item.tipo_organizacion))}</p><h2>${esc(item.nombre)}</h2>
      <p class="detalle-red__org">${esc(item.organizacion)}</p><p>${esc(item.descripcion)}</p>
      <a class="boton" href="./#${esc(item.id)}">${esc(t("red.ver_ficha"))} <span aria-hidden="true">→</span></a>`;
  }
}

async function iniciar() {
  aplicarTextos();
  $("criterio").innerHTML = CRITERIOS.map((c) => `<option value="${c}" ${c === criterio ? "selected" : ""}>${esc(t("red.criterio." + c))}</option>`).join("");
  $("leyenda").innerHTML = Object.entries(COLORES).map(([v, color]) => `<li><span style="background:${color}"></span>${esc(etiqueta("tipo_organizacion", v))}</li>`).join("");
  try {
    items = await (await fetch("data/items.json")).json();
  } catch {
    $("detalle").hidden = false;
    $("detalle").innerHTML = `<h2>${esc(t("catalogo.error_carga_titulo"))}</h2><p>${esc(t("catalogo.error_carga_texto"))}</p>`;
    return;
  }
  // Con muchos proyectos los nombres se pisan: se muestran solo al pasar por encima.
  svg.classed("denso", items.length > 20);
  const ajustar = () => { const { width, height } = svg.node().getBoundingClientRect(); svg.attr("viewBox", [-width / 2, -height / 2, width, height]); };
  ajustar();
  addEventListener("resize", ajustar);
  $("criterio").addEventListener("change", (ev) => {
    criterio = ev.target.value;
    history.replaceState(null, "", "?por=" + criterio);
    $("detalle").hidden = true;
    armar();
  });
  $("q").addEventListener("input", buscar);
  armar();
}

iniciar();
