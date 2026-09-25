// Filtros por faceta, compartidos por el catálogo (app.js) y la red (red.js).
// Los filtros son { campo: Set(valores) } y viajan en la URL con los mismos
// nombres en las dos páginas, así "Ver como red" conserva lo elegido.

const FACETAS = ["tipo_organizacion", "organizacion", "tipo_desarrollo", "tecnologias", "etiquetas"];
const valoresFaceta = (item, campo) => [item[campo] ?? []].flat();

function leerFiltros(params) {
  const filtros = {};
  for (const campo of FACETAS) if (params.get(campo)) filtros[campo] = new Set(params.get(campo).split(","));
  return filtros;
}

function escribirFiltros(params, filtros) {
  for (const [campo, valores] of Object.entries(filtros)) if (valores.size) params.set(campo, [...valores].join(","));
  return params;
}

function pasaFiltros(item, filtros) {
  return Object.entries(filtros).every(([campo, valores]) => !valores.size || valoresFaceta(item, campo).some((v) => valores.has(v)));
}

// Un <details> por faceta con los valores de `visibles` y cuántos hay de cada uno.
function renderFiltros(contenedor, visibles, filtros) {
  contenedor.innerHTML = FACETAS.map((campo) => {
    const conteo = new Map();
    for (const item of visibles) for (const v of valoresFaceta(item, campo)) conteo.set(v, (conteo.get(v) ?? 0) + 1);
    const activos = filtros[campo] ?? new Set();
    for (const v of activos) if (!conteo.has(v)) conteo.set(v, 0);
    if (!conteo.size) return "";
    const opciones = [...conteo].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"));
    return `<details ${activos.size ? "open" : ""}><summary>${esc(t("faceta." + campo))}</summary><div>
      ${opciones.map(([v, n]) => `<label><input type="checkbox" data-campo="${campo}" value="${esc(v)}" ${activos.has(v) ? "checked" : ""}> <span>${esc(etiqueta(campo, v))}</span> <small>${n}</small></label>`).join("")}
    </div></details>`;
  }).join("");
}

// Marca o desmarca el valor del checkbox que cambió.
function alternarFiltro(filtros, input) {
  const s = (filtros[input.dataset.campo] ??= new Set());
  s.has(input.value) ? s.delete(input.value) : s.add(input.value);
}
