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
  filtros: leerFiltros(url),
};
let todos = [], items = []; // items: los que pasan los filtros
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
// Rótulos con tamaño fijo en pantalla. En los grupos el nombre se parte en líneas dentro del
// círculo y, si sobra lugar, va la cantidad debajo; si alguna palabra no entra en el ancho del
// círculo, el nombre queda oculto hasta pasar por encima. En los proyectos, debajo del punto.
const medidor = document.createElement("canvas").getContext("2d");
const anchoTexto = (s) => { medidor.font = "700 11px Montserrat, system-ui, sans-serif"; return medidor.measureText(s).width; };
const LINEA = 13; // alto de línea en px de pantalla
function partirEnLineas(nombre, ancho) {
  const lineas = [];
  for (const palabra of nombre.split(/\s+/)) {
    if (anchoTexto(palabra) > ancho) return null;
    const ultima = lineas.at(-1);
    if (ultima && anchoTexto(ultima + " " + palabra) <= ancho) lineas[lineas.length - 1] = ultima + " " + palabra;
    else lineas.push(palabra);
  }
  return lineas;
}
const escalarRotulos = () => {
  selNodos?.filter((d) => d.grupo).each(function (d) {
    const diametro = d.r * escala * 2, nombre = nombreValor(estado.criterio, d.valor);
    const lineas = partirEnLineas(nombre, diametro);
    const entra = !!lineas && lineas.length * LINEA <= diametro * 0.85;
    const conCuenta = entra && (lineas.length + 1) * LINEA <= diametro * 0.7;
    const filas = entra ? lineas : [nombre];
    const total = filas.length + (conCuenta ? 1 : 0);
    const arriba = -((total - 1) * LINEA) / 2;
    const g = d3.select(this).classed("no-entra", !entra).classed("con-cuenta", conCuenta);
    g.select("text.nombre").attr("transform", `scale(${1 / escala})`)
      .selectAll("tspan").data(filas).join("tspan")
      .attr("x", 0).attr("y", (_, i) => arriba + i * LINEA).attr("dy", "0.35em").text((s) => s);
    g.select("text.cuenta").attr("transform", `scale(${1 / escala})`)
      .attr("y", arriba + filas.length * LINEA).attr("dy", "0.35em");
  });
  selNodos?.filter((d) => !d.grupo).select("text.nombre").attr("dy", "1em")
    .attr("transform", (d) => `translate(0,${d.r + 4 / escala}) scale(${1 / escala})`);
};
// Si dos rótulos de grupo se pisan en pantalla queda el del grupo más grande; el otro
// aparece al pasar por encima (como la grilla de rótulos de Sigma.js o Gephi).
function despejarRotulos() {
  if (!selNodos) return;
  const grupos = selNodos.filter((d) => d.grupo).classed("pisado", false);
  // También cuentan como ocupados los círculos de los grupos: un rótulo no va debajo de otro círculo.
  const circulos = grupos.nodes().map((n) => [n, n.querySelector("circle").getBoundingClientRect()]);
  const puestos = [];
  grupos.filter(function () { return !this.classList.contains("no-entra"); }).nodes()
    .sort((a, b) => d3.select(b).datum().n - d3.select(a).datum().n)
    .forEach((nodo) => {
      const r = nodo.querySelector("text.nombre").getBoundingClientRect();
      if (!r.width) return;
      const pisa = (p) => r.left < p.right + 4 && r.right > p.left - 4 && r.top < p.bottom + 2 && r.bottom > p.top - 2;
      const choca = puestos.some(pisa) || circulos.some(([otro, c]) => otro !== nodo && pisa(c));
      if (choca) nodo.classList.add("pisado"); else puestos.push(r);
    });
  // Los grupos con rótulo visible van al frente, así ningún círculo los tapa.
  grupos.filter(function () { return !this.classList.contains("pisado"); }).raise();
}
// Al terminar cada acercamiento o desplazamiento se vuelve a ver qué rótulos entran.
zoom.on("end.rotulos", () => despejarRotulos());
svg.call(zoom);

// Ajusta el zoom para que entre todo. Solo al armar, no después de arrastrar.
let encuadrarAlTerminar = false;
function encuadrar() {
  encuadrarAlTerminar = false;
  $("ver-todo").hidden = true;
  const b = lienzo.node().getBBox(), { width, height } = svg.node().getBoundingClientRect();
  if (!b.width || !b.height) return;
  const k = Math.min(1.5, 0.92 * Math.min(width / b.width, height / b.height));
  svg.transition().duration(sinMovimiento ? 0 : 700)
    .call(zoom.transform, d3.zoomIdentity.scale(k).translate(-(b.x + b.width / 2), -(b.y + b.height / 2)));
}

// Los proyectos de un solo valor quedan cerca de su grupo; los de varios, entre sus
// grupos con enlaces más largos y flojos, así cruzan menos por encima de los racimos.
const enGrupos = (l) => grupoDe(l.source.item ?? l.target.item, estado.criterio).length;
const sim = d3.forceSimulation()
  .force("link", d3.forceLink().id((d) => d.id).distance((l) => (enGrupos(l) > 1 ? 90 : 45)).strength((l) => (enGrupos(l) > 1 ? 0.25 : 0.8)))
  .force("charge", d3.forceManyBody().strength((d) => (d.grupo ? -200 : -80)))
  .force("collide", d3.forceCollide((d) => d.r + 6))
  // Centrado firme: acerca los racimos sueltos para que el encuadre no achique la red.
  .force("x", d3.forceX(0).strength(0.14))
  .force("y", d3.forceY(0).strength(0.14))
  .on("tick", dibujar)
  .on("end", () => { if (encuadrarAlTerminar) encuadrar(); else despejarRotulos(); });

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

  const proyectos = items.map((item) => Object.assign(antes.get("p:" + item.id) ?? {}, { id: "p:" + item.id, item, r: 6 }));
  const grupos = [...conteo].map(([v, n]) => {
    const previo = antes.get(`g:${criterio}:${v}`);
    return Object.assign(previo ?? { x: (Math.random() - 0.5) * 300, y: (Math.random() - 0.5) * 300 },
      { id: `g:${criterio}:${v}`, grupo: true, valor: v, n, r: 14 + Math.sqrt(n) * 4.5 });
  });
  nodos = [...proyectos, ...grupos];
  links = items.flatMap((item) => grupoDe(item, criterio).map((v) => ({ source: "p:" + item.id, target: `g:${criterio}:${v}` })));

  selLinks = capaLinks.selectAll("path").data(links, (d) => `${d.source.id ?? d.source}>${d.target.id ?? d.target}`)
    .join(
      (enter) => enter.append("path").attr("stroke-opacity", 0).call((s) => s.transition().duration(600).attr("stroke-opacity", 1)),
      (update) => update,
      (exit) => exit.transition().duration(300).attr("stroke-opacity", 0).remove(),
    );

  selNodos = capaNodos.selectAll("g.nodo").data(nodos, (d) => d.id)
    .join(
      (enter) => {
        const g = enter.append("g").attr("class", (d) => "nodo" + (d.grupo ? " nodo--grupo" : "")).attr("tabindex", 0).attr("role", "button");
        g.append("circle").attr("r", 0).attr("fill", (d) => (d.grupo ? null : colorDe(d.item)))
          .transition().duration(600).attr("r", (d) => d.r);
        // Grupo: el nombre adentro del círculo y, si hay lugar, la cantidad debajo de él. Proyecto: su nombre debajo.
        g.append("text").attr("class", "nombre").attr("text-anchor", "middle");
        g.filter((d) => d.grupo).append("text").attr("class", "cuenta").attr("text-anchor", "middle");
        return g;
      },
      (update) => update,
      (exit) => exit.call((s) => s.select("circle").transition().duration(300).attr("r", 0)).transition().duration(300).remove(),
    );
  selNodos.attr("aria-label", (d) => (d.grupo ? `${nombreValor(criterio, d.valor)} (${d.n})` : d.item.nombre));
  // Los nombres de grupo se escriben en escalarRotulos, partidos en líneas.
  selNodos.filter((d) => !d.grupo).select("text.nombre").text((d) => d.item.nombre);
  selNodos.select("text.cuenta").text((d) => d.n);
  selNodos.on("click", (ev, d) => detalle(d)).on("keydown", (ev, d) => ev.key === "Enter" && detalle(d))
    .on("mouseenter focus", (ev, d) => { d3.select(ev.currentTarget).raise(); resaltar(d); mostrarTooltip(ev, d); })
    .on("mouseleave blur", () => { resaltar(null); ocultarTooltip(); })
    .call(d3.drag()
      .on("start", (ev, d) => { if (!ev.active) sim.alphaTarget(0.2).restart(); d.fx = d.x; d.fy = d.y; })
      .on("drag", (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
      .on("end", (ev, d) => { if (!ev.active) sim.alphaTarget(0); d.fx = d.fy = null; }));

  escalarRotulos();
  // Mientras la red se acomoda se ven todos los rótulos; al terminar se despejan.
  selNodos.classed("pisado", false);
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
  selLinks?.attr("d", (d) => `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`);
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
  selNodos.classed("tenue", (n) => ids && !ids.has(n.id)).classed("foco", (n) => ids && ids.has(n.id)).classed("hover", (n) => n === d);
  selLinks.classed("activo", (l) => ids && (l.source.id === d.id || l.target.id === d.id)).classed("tenue", false);
}

function buscar() {
  const terminos = normalizar($("q").value).split(/\s+/).filter(Boolean);
  selNodos.classed("descartado", (d) => !d.grupo && terminos.length > 0 &&
    !terminos.every((q) => normalizar([d.item.nombre, d.item.organizacion, d.item.descripcion, ...valores(d.item, estado.criterio)].join(" ")).includes(q)));
}

// Al pasar por un grupo: su nombre, la cantidad y cómo se reparte una variable que no está
// en el gráfico (ni agrupa ni colorea), con sus tres valores más frecuentes; los proyectos sin
// ese dato cuentan como un valor más ("Sin dato"). Al pasar por un proyecto: su nombre y organización.
const PREFERIDAS = ["tecnologias", "tipo_organizacion", "tipo_desarrollo", "etiquetas", "fuentes"];
const conDato = (item, c) => valores(item, c).filter((v) => !(c === "fuentes" && v.startsWith("No especificado")));
function mostrarTooltip(ev, d) {
  const tip = $("tooltip");
  if (!d.grupo) {
    tip.innerHTML = `<strong>${esc(d.item.nombre)}</strong><small>${esc(d.item.organizacion)}</small>`;
    ubicarTooltip(ev);
    return;
  }
  const deGrupo = items.filter((item) => grupoDe(item, estado.criterio).includes(d.valor));
  const otra = PREFERIDAS.find((c) => c !== estado.criterio && c !== estado.color);
  const conteo = d3.rollups(deGrupo.flatMap((item) => { const v = [...new Set(conDato(item, otra))]; return v.length ? v : ["__sin"]; }),
    (v) => v.length, (v) => v).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const pct = (n) => Math.round((n / deGrupo.length) * 100);
  const variable = t("red.criterio." + otra);
  tip.innerHTML = `<strong>${esc(nombreValor(estado.criterio, d.valor))}</strong>
    <small>${esc(t(d.n === 1 ? "red.grupo_titulo_uno" : "red.grupo_titulo", { n: d.n }))}</small>
    <p>${esc(variable)}</p>
    <ul>${conteo.map(([v, n]) => `<li><span>${esc(nombreValor(otra, v))}</span><i><b style="width:${pct(n)}%"></b></i><span>${pct(n)} %</span></li>`).join("")}</ul>`;
  ubicarTooltip(ev);
}
function ubicarTooltip(ev) {
  const tip = $("tooltip");
  tip.hidden = false;
  // Junto al grupo, del lado donde haya lugar dentro de la escena.
  const escena = tip.parentElement.getBoundingClientRect(), nodo = ev.currentTarget.getBoundingClientRect();
  const x = nodo.right - escena.left + 8, y = nodo.top - escena.top;
  tip.style.left = `${Math.max(8, Math.min(x, escena.width - tip.offsetWidth - 8))}px`;
  tip.style.top = `${Math.max(8, Math.min(y, escena.height - tip.offsetHeight - 8))}px`;
}
const ocultarTooltip = () => { $("tooltip").hidden = true; };

// Acerca la vista a un grupo y sus proyectos; "Ver todo" vuelve al encuadre completo.
function enfocar(d) {
  const ids = vecinos(d), dentro = nodos.filter((n) => ids.has(n.id));
  const x0 = d3.min(dentro, (n) => n.x - n.r), x1 = d3.max(dentro, (n) => n.x + n.r);
  const y0 = d3.min(dentro, (n) => n.y - n.r), y1 = d3.max(dentro, (n) => n.y + n.r);
  const { width, height } = svg.node().getBoundingClientRect();
  const k = Math.min(3, 0.8 * Math.min(width / (x1 - x0 || 1), height / (y1 - y0 || 1)));
  svg.transition().duration(sinMovimiento ? 0 : 600)
    .call(zoom.transform, d3.zoomIdentity.scale(k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2));
  $("ver-todo").hidden = false;
}

// --- tarjeta de detalle ------------------------------------------------------
function abrirDetalle(html, d = null) {
  $("detalle-contenido").innerHTML = html;
  $("detalle").hidden = false;
  $("detalle").scrollTop = 0;
  selNodos?.classed("elegido", (n) => n === d);
  // En pantallas chicas la tarjeta va debajo de la red: se la lleva a la vista.
  if (matchMedia("(max-width: 720px)").matches) $("detalle").scrollIntoView({ behavior: sinMovimiento ? "auto" : "smooth", block: "nearest" });
}

function cerrarDetalle() {
  $("detalle").hidden = true;
  selNodos?.classed("elegido", false);
}

function detalle(d) {
  const bloque = (clave, cuerpo) => (cuerpo ? `<div class="detalle-red__bloque"><h3>${esc(t(clave))}</h3>${cuerpo}</div>` : "");
  if (d.grupo) {
    enfocar(d);
    const deGrupo = items.filter((item) => grupoDe(item, estado.criterio).includes(d.valor))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    abrirDetalle(`<p class="rotulo">${esc(t("red.criterio." + estado.criterio))}</p>
      <h2>${esc(nombreValor(estado.criterio, d.valor))}</h2>
      <p class="detalle-red__org">${esc(t(d.n === 1 ? "red.grupo_titulo_uno" : "red.grupo_titulo", { n: d.n }))}</p>
      <ul class="detalle-red__lista">${deGrupo.map((item) =>
        `<li><a href="./#${esc(item.id)}">${esc(item.nombre)}</a><small>${esc(item.organizacion)}</small></li>`).join("")}</ul>`, d);
    return;
  }
  const item = d.item;
  abrirDetalle(`<p class="rotulo">${esc(etiqueta("tipo_organizacion", item.tipo_organizacion))}</p>
    <h2>${esc(item.nombre)}</h2>
    <p class="detalle-red__org">${esc(item.organizacion)}</p>
    <p class="detalle-red__descripcion">${esc(item.descripcion)}</p>
    ${bloque("faceta.tipo_desarrollo", `<p>${item.tipo_desarrollo.map((v) => esc(etiqueta("tipo_desarrollo", v))).join(" · ")}</p>`)}
    ${bloque("ficha.datos", `<p>${item.datos_utilizados.map((f) => esc(f.nombre)).join(" · ")}</p>`)}
    ${bloque("ficha.tecnologias", item.tecnologias?.length ? `<div class="tags">${item.tecnologias.map((v) => `<span>${esc(v)}</span>`).join("")}</div>` : "")}
    <a class="boton" href="./#${esc(item.id)}">${esc(t("red.ver_ficha"))} <span aria-hidden="true">→</span></a>`, d);
}

function escribirURL() {
  const p = escribirFiltros(new URLSearchParams({ por: estado.criterio, color: estado.color ?? "no" }), estado.filtros);
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
    todos = await (await fetch("data/items.json")).json();
  } catch {
    abrirDetalle(`<h2>${esc(t("catalogo.error_carga_titulo"))}</h2><p>${esc(t("catalogo.error_carga_texto"))}</p>`);
    return;
  }
  const ajustar = () => { const { width, height } = svg.node().getBoundingClientRect(); svg.attr("viewBox", [-width / 2, -height / 2, width, height]); };
  ajustar();
  addEventListener("resize", ajustar);

  // Agrupar y colorear nunca usan la misma variable: cada select deshabilita la del otro.
  const sincronizarOpciones = () => {
    for (const op of $("variable-color").options) op.disabled = op.value === estado.criterio;
    for (const op of $("criterio").options) op.disabled = !!estado.color && op.value === estado.color;
  };
  if (estado.color === estado.criterio) estado.color = CRITERIOS.find((c) => c !== estado.criterio);
  $("variable-color").value = estado.color ?? CRITERIOS.find((c) => c !== estado.criterio);
  sincronizarOpciones();

  $("criterio").addEventListener("change", (ev) => {
    estado.criterio = ev.target.value;
    // Si se elige para agrupar la variable con la que se colorea, el color pasa a otra.
    if ($("variable-color").value === estado.criterio) {
      $("variable-color").value = CRITERIOS.find((c) => c !== estado.criterio);
      if (estado.color) { estado.color = $("variable-color").value; recolorear(); }
    }
    sincronizarOpciones();
    cerrarDetalle();
    escribirURL();
    armar();
  });
  const cambiarColor = () => {
    estado.color = $("colorear").checked ? $("variable-color").value : null;
    $("variable-color").disabled = !estado.color;
    sincronizarOpciones();
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
  $("ver-todo").addEventListener("click", encuadrar);
  $("alternar-filtros").addEventListener("click", (ev) => {
    const ocultos = $("disposicion").classList.toggle("disposicion--sin-filtros");
    ev.currentTarget.setAttribute("aria-pressed", ocultos);
    ev.currentTarget.textContent = t(ocultos ? "red.mostrar_filtros" : "red.ocultar_filtros");
    ajustar();
    encuadrar();
  });
  // La tarjeta se cierra con la X, con Escape o tocando el fondo de la red.
  $("cerrar-detalle").addEventListener("click", cerrarDetalle);
  addEventListener("keydown", (ev) => ev.key === "Escape" && !$("detalle").hidden && cerrarDetalle());
  svg.on("click.cerrar", (ev) => ev.target === svg.node() && cerrarDetalle());

  $("filtros").addEventListener("change", (ev) => {
    alternarFiltro(estado.filtros, ev.target);
    cerrarDetalle();
    escribirURL();
    filtrar();
  });
  filtrar();
}

// Rearma la red solo con los proyectos que pasan los filtros.
function filtrar() {
  items = todos.filter((item) => pasaFiltros(item, estado.filtros));
  renderFiltros($("filtros"), items, estado.filtros);
  calcularColores();
  renderLeyenda();
  armar();
}

iniciar();
