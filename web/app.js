// Catálogo: carga data/items.json y busca/filtra en el navegador. Sin build ni dependencias.
// El estado (búsqueda, filtros, ficha abierta) vive en la URL, así se puede compartir.
// ponytail: render completo en cada cambio; alcanza hasta varios miles de fichas.

const FACETAS = ["tipo_organizacion", "organizacion", "tipo_desarrollo", "tecnologias", "etiquetas"];
const TITULOS = { tipo_organizacion: "Tipo de organización", organizacion: "Organización", tipo_desarrollo: "Tipo de desarrollo", tecnologias: "Tecnologías", etiquetas: "Etiquetas" };

const $ = (id) => document.getElementById(id);
const normalizar = (t) => String(t ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const lista = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);

let items = [];
const estado = { q: "", filtros: {}, abierto: null }; // filtros: { campo: Set(valores) }

function leerURL() {
  const p = new URLSearchParams(location.search);
  estado.q = p.get("q") ?? "";
  for (const campo of FACETAS) if (p.get(campo)) estado.filtros[campo] = new Set(p.get(campo).split(","));
  estado.abierto = decodeURIComponent(location.hash.slice(1)) || null;
  $("q").value = estado.q;
}

function escribirURL() {
  const p = new URLSearchParams();
  if (estado.q) p.set("q", estado.q);
  for (const [campo, valores] of Object.entries(estado.filtros)) if (valores.size) p.set(campo, [...valores].join(","));
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
    return `<details ${activos.size ? "open" : ""}><summary>${TITULOS[campo]}</summary>
      ${opciones.map(([v, n]) => `<label><input type="checkbox" data-campo="${campo}" value="${esc(v)}" ${activos.has(v) ? "checked" : ""}> ${esc(etiqueta(campo, v))} <small>${n}</small></label>`).join("")}
    </details>`;
  }).join("");
}

function renderDetalle(item) {
  const seccion = (titulo, lis) => (lis.length ? `<h4>${titulo}</h4><ul>${lis.join("")}</ul>` : "");
  return `<div class="detalle">
    ${seccion("Datos utilizados", item.datos_utilizados.map((d) => `<li>${d.url ? `<a href="${esc(d.url)}" rel="noopener">${esc(d.nombre)}</a>` : esc(d.nombre)} <small>${esc(etiqueta("tipo_dato", d.tipo))}</small></li>`))}
    ${seccion("Enlaces", item.enlaces.map((e) => `<li><a href="${esc(e.url)}" rel="noopener">${esc(etiqueta("tipo_enlace", e.tipo))}</a></li>`))}
    ${seccion("Contacto", item.contactos.map((c) => `<li><a href="${esc(c.tipo === "email" ? "mailto:" + c.valor : c.valor)}" rel="noopener">${esc(etiqueta("tipo_contacto", c.tipo))}</a></li>`))}
    ${seccion("Tecnologías", (item.tecnologias ?? []).map((t) => `<li>${esc(t)}</li>`))}
  </div>`;
}

function render() {
  const visibles = items.filter(coincide);
  $("estado").textContent = `${visibles.length} de ${items.length} herramientas`;
  renderFiltros(visibles);
  $("lista").innerHTML = visibles.length
    ? visibles.map((item) => `
      <li id="${esc(item.id)}">
        <button type="button" data-id="${esc(item.id)}" aria-expanded="${estado.abierto === item.id}">
          <h3>${esc(item.nombre)}</h3>
          <p><strong>${esc(item.organizacion)}</strong> · ${esc(etiqueta("tipo_organizacion", item.tipo_organizacion))}
             · ${item.tipo_desarrollo.map((t) => esc(etiqueta("tipo_desarrollo", t))).join(", ")}
             ${item.verificacion?.estado === "verificado" ? '<span class="verificado">Verificado</span>' : ""}</p>
          <p>${esc(item.descripcion)}</p>
        </button>
        ${estado.abierto === item.id ? renderDetalle(item) : ""}
      </li>`).join("")
    : `<li class="vacio">Ninguna herramienta coincide. <a href="agregar.html">Agregá la que falta</a>.</li>`;
  escribirURL();
}

async function iniciar() {
  leerURL();
  try {
    items = await (await fetch("data/items.json")).json();
  } catch {
    $("lista").innerHTML = "<li class='vacio'>No se pudo cargar <code>data/items.json</code>. Generalo con <code>python scripts/catalogo.py</code> y serví la carpeta <code>web/</code> por HTTP.</li>";
    return;
  }
  for (const item of items) {
    item._texto = normalizar([item.nombre, item.organizacion, item.descripcion, ...item.tipo_desarrollo.map((t) => etiqueta("tipo_desarrollo", t)),
      ...(item.tecnologias ?? []), ...(item.etiquetas ?? []), ...item.datos_utilizados.map((d) => d.nombre)].join(" "));
  }

  let t;
  $("q").addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { estado.q = $("q").value.trim(); render(); }, 150); });
  $("filtros").addEventListener("change", (ev) => {
    const { campo } = ev.target.dataset, v = ev.target.value;
    const s = (estado.filtros[campo] ??= new Set());
    s.has(v) ? s.delete(v) : s.add(v);
    render();
  });
  $("lista").addEventListener("click", (ev) => {
    const b = ev.target.closest("button[data-id]");
    if (!b) return;
    estado.abierto = estado.abierto === b.dataset.id ? null : b.dataset.id;
    render();
  });

  render();
  if (estado.abierto) document.getElementById(estado.abierto)?.scrollIntoView({ block: "center" });
}

iniciar();
