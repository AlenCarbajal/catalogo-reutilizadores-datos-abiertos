// Catálogo: carga data/items.json y busca/filtra en el navegador. Sin build ni dependencias.
// El estado (búsqueda, filtros, página, ficha abierta) vive en la URL, así se puede compartir.
// Se vuelve a dibujar todo en cada cambio; alcanza hasta varios miles de fichas.

const FACETAS = ["tipo_organizacion", "organizacion", "tipo_desarrollo", "tecnologias", "etiquetas"];
const POR_PAGINA = 20;

const $ = (id) => document.getElementById(id);
const normalizar = (t) => String(t ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const lista = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);

let items = [];
const estado = { q: "", filtros: {}, pagina: 1, abierto: null }; // filtros: { campo: Set(valores) }

function leerURL() {
  const p = new URLSearchParams(location.search);
  estado.q = p.get("q") ?? "";
  for (const campo of FACETAS) if (p.get(campo)) estado.filtros[campo] = new Set(p.get(campo).split(","));
  estado.pagina = Math.max(1, parseInt(p.get("pagina"), 10) || 1);
  estado.abierto = decodeURIComponent(location.hash.slice(1)) || null;
  $("q").value = estado.q;
}

function escribirURL() {
  const p = new URLSearchParams();
  if (estado.q) p.set("q", estado.q);
  for (const [campo, valores] of Object.entries(estado.filtros)) if (valores.size) p.set(campo, [...valores].join(","));
  if (estado.pagina > 1) p.set("pagina", estado.pagina);
  const qs = p.toString();
  history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + (estado.abierto ? "#" + estado.abierto : ""));
}

function coincide(item) {
  for (const [campo, valores] of Object.entries(estado.filtros)) {
    if (valores.size && !lista(item[campo]).some((v) => valores.has(v))) return false;
  }
  const terminos = normalizar(estado.q).split(/\s+/).filter(Boolean);
  return terminos.every((t) => item._texto.includes(t));
}

function renderFiltros(visibles) {
  $("filtros").innerHTML = FACETAS.map((campo) => {
    const conteo = new Map();
    for (const item of visibles) for (const v of lista(item[campo])) conteo.set(v, (conteo.get(v) ?? 0) + 1);
    const activos = estado.filtros[campo] ?? new Set();
    for (const v of activos) if (!conteo.has(v)) conteo.set(v, 0);
    if (!conteo.size) return "";
    const opciones = [...conteo].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"));
    return `<details ${activos.size ? "open" : ""}><summary>${esc(t("faceta." + campo))}</summary><div>
      ${opciones.map(([v, n]) => `<label><input type="checkbox" data-campo="${campo}" value="${esc(v)}" ${activos.has(v) ? "checked" : ""}> <span>${esc(etiqueta(campo, v))}</span> <small>${n}</small></label>`).join("")}
    </div></details>`;
  }).join("");
}

function renderDetalle(item) {
  const bloque = (clave, cuerpo) => (cuerpo ? `<div><h4>${esc(t(clave))}</h4>${cuerpo}</div>` : "");
  const enlace = (href, texto) => `<a href="${esc(href)}" rel="noopener">${esc(texto)}</a>`;
  return `<div class="detalle">
    ${bloque("ficha.datos", item.datos_utilizados.map((d) => `<p>${d.url ? enlace(d.url, d.nombre) : `<strong>${esc(d.nombre)}</strong>`} <small>${esc(etiqueta("tipo_dato", d.tipo))}</small></p>`).join(""))}
    ${bloque("ficha.enlaces", `<p>${item.enlaces.map((e) => enlace(e.url, etiqueta("tipo_enlace", e.tipo))).join(" · ")}</p>`)}
    ${bloque("ficha.contacto", `<p>${item.contactos.map((c) => enlace(c.tipo === "email" ? "mailto:" + c.valor : c.valor, etiqueta("tipo_contacto", c.tipo))).join(" · ")}</p>`)}
    ${bloque("ficha.tecnologias", item.tecnologias?.length ? `<div class="tags">${item.tecnologias.map((t) => `<span>${esc(t)}</span>`).join("")}</div>` : "")}
  </div>`;
}

// Números de página a mostrar: la primera, la última y dos alrededor de la actual;
// los saltos se marcan con null (se dibujan como "…").
function paginasVisibles(actual, total) {
  const numeros = [...new Set([1, total, actual - 2, actual - 1, actual, actual + 1, actual + 2])]
    .filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  return numeros.flatMap((n, i) => (i && n - numeros[i - 1] > 1 ? [null, n] : [n]));
}

function renderPaginacion(total, paginas) {
  const nav = $("paginacion");
  nav.hidden = paginas <= 1;
  if (nav.hidden) return;
  const { pagina } = estado;
  const desde = (pagina - 1) * POR_PAGINA + 1, hasta = Math.min(pagina * POR_PAGINA, total);
  const boton = (n, texto, extra = "") => `<button type="button" data-pagina="${n}" ${extra}>${texto}</button>`;
  nav.innerHTML = `<p class="paginacion__rango">${esc(t("pag.rango", { desde, hasta, total }))}</p>
    <div class="paginacion__botones">
      ${boton(pagina - 1, `<span aria-hidden="true">←</span> ${esc(t("pag.anterior"))}`, pagina === 1 ? "disabled" : "")}
      ${paginasVisibles(pagina, paginas).map((n) => n === null ? `<span class="paginacion__salto" aria-hidden="true">…</span>`
        : boton(n, n, `aria-label="${esc(t("pag.pagina", { n }))}" ${n === pagina ? 'aria-current="page"' : ""}`)).join("")}
      ${boton(pagina + 1, `${esc(t("pag.siguiente"))} <span aria-hidden="true">→</span>`, pagina === paginas ? "disabled" : "")}
    </div>`;
}

function render() {
  const visibles = items.filter(coincide);
  const paginas = Math.max(1, Math.ceil(visibles.length / POR_PAGINA));
  estado.pagina = Math.min(estado.pagina, paginas);
  const pagina = visibles.slice((estado.pagina - 1) * POR_PAGINA, estado.pagina * POR_PAGINA);
  $("estado").innerHTML = `<strong>${esc(t("catalogo.conteo", { n: visibles.length, total: items.length }))}</strong> ${esc(t("catalogo.conteo_sufijo"))}`
    + (paginas > 1 ? ` · ${esc(t("pag.de", { n: estado.pagina, total: paginas }))}` : "");
  renderFiltros(visibles);
  renderPaginacion(visibles.length, paginas);
  $("lista").innerHTML = visibles.length
    ? pagina.map((item) => `
      <li id="${esc(item.id)}" class="ficha">
        <button type="button" data-id="${esc(item.id)}" aria-expanded="${estado.abierto === item.id}">
          <div>
            <h3>${esc(item.nombre)}</h3>
            <p class="ficha__meta"><strong>${esc(item.organizacion)}</strong> · ${esc(etiqueta("tipo_organizacion", item.tipo_organizacion))}
               · ${item.tipo_desarrollo.map((t) => esc(etiqueta("tipo_desarrollo", t))).join(", ")}
               ${item.verificacion?.estado === "verificado" ? `<span class="verificado">${esc(t("catalogo.verificado"))}</span>` : ""}</p>
            <p class="ficha__descripcion">${esc(item.descripcion)}</p>
          </div>
          <span class="ficha__flecha" aria-hidden="true">▾</span>
        </button>
        ${estado.abierto === item.id ? renderDetalle(item) : ""}
      </li>`).join("")
    : `<li class="vacio"><strong>${esc(t("catalogo.vacio_titulo"))}</strong> ${th("catalogo.vacio_texto", {}, "agregar.html")}</li>`;
  escribirURL();
}

async function iniciar() {
  aplicarTextos();
  leerURL();
  try {
    items = await (await fetch("data/items.json")).json();
  } catch {
    $("lista").innerHTML = `<li class="vacio"><strong>${esc(t("catalogo.error_carga_titulo"))}</strong> ${esc(t("catalogo.error_carga_texto"))}</li>`;
    return;
  }
  for (const item of items) {
    item._texto = normalizar([item.nombre, item.organizacion, item.descripcion, ...item.tipo_desarrollo.map((t) => etiqueta("tipo_desarrollo", t)),
      ...(item.tecnologias ?? []), ...(item.etiquetas ?? []), ...item.datos_utilizados.map((d) => d.nombre)].join(" "));
  }

  let espera;
  $("q").addEventListener("input", () => { clearTimeout(espera); espera = setTimeout(() => { estado.q = $("q").value.trim(); estado.pagina = 1; render(); }, 150); });
  $("filtros").addEventListener("change", (ev) => {
    const { campo } = ev.target.dataset, v = ev.target.value;
    const s = (estado.filtros[campo] ??= new Set());
    s.has(v) ? s.delete(v) : s.add(v);
    estado.pagina = 1;
    render();
  });
  $("lista").addEventListener("click", (ev) => {
    const b = ev.target.closest("button[data-id]");
    if (!b) return;
    estado.abierto = estado.abierto === b.dataset.id ? null : b.dataset.id;
    render();
  });

  $("paginacion").addEventListener("click", (ev) => {
    const b = ev.target.closest("button[data-pagina]");
    if (!b || b.disabled) return;
    estado.pagina = Number(b.dataset.pagina);
    render();
    $("estado").scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  });

  // Si la URL trae una ficha abierta, se va a la página donde está.
  if (estado.abierto) {
    const i = items.filter(coincide).findIndex((item) => item.id === estado.abierto);
    if (i >= 0) estado.pagina = Math.floor(i / POR_PAGINA) + 1;
  }
  render();
  if (estado.abierto) document.getElementById(estado.abierto)?.scrollIntoView({ block: "center" });
}

iniciar();
