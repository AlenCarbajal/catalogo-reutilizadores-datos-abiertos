// Formulario → YAML. Los valores permitidos se leen de data/schema.json (copia del
// schema hecha por scripts/catalogo.py), así el formulario nunca se desfasa del validador.

const $ = (id) => document.getElementById(id);
const form = $("form");

// --- YAML ------------------------------------------------------------------
// ponytail: serializador a mano para esta estructura fija; sin js-yaml.
const simple = (s) => /^[a-z0-9]+([-._][a-z0-9]+)*$/.test(s); // ids, enums, tecnologías
const escalar = (s) => (simple(s) ? s : JSON.stringify(s)); // JSON string == YAML double-quoted
const bloque = (s) => ">\n" + s.replace(/\s+/g, " ").trim().match(/.{1,78}(\s|$)/g).map((l) => "  " + l.trim()).join("\n");

function aYaml(f) {
  const obj = (o) => Object.entries(o).filter(([, v]) => v).map(([k, v], i) => `${i ? "    " : "  - "}${k}: ${escalar(v)}`).join("\n");
  const partes = [
    `id: ${f.id}`,
    `nombre: ${escalar(f.nombre)}`,
    `organizacion: ${escalar(f.organizacion)}`,
    `tipo_organizacion: ${f.tipo_organizacion}`,
    ``,
    `descripcion: ${bloque(f.descripcion)}`,
    ``,
    `tipo_desarrollo:\n${f.tipo_desarrollo.map((t) => `  - ${t}`).join("\n")}`,
    ``,
    `datos_utilizados:\n${f.datos_utilizados.map(obj).join("\n")}`,
    ``,
    `enlaces:\n${f.enlaces.map(obj).join("\n")}`,
    ``,
    `contactos:\n${f.contactos.map(obj).join("\n")}`,
  ];
  if (f.tecnologias.length) partes.push(``, `tecnologias:\n${f.tecnologias.map((t) => `  - ${escalar(t)}`).join("\n")}`);
  if (f.etiquetas.length) partes.push(``, `etiquetas:\n${f.etiquetas.map((t) => `  - ${escalar(t)}`).join("\n")}`);
  return partes.join("\n") + "\n";
}

// --- formulario ------------------------------------------------------------
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const separar = (s) => s.split(",").map((t) => t.trim()).filter(Boolean);

function llenarVocabularios(raiz, defs) {
  for (const el of raiz.querySelectorAll("[data-vocab]")) {
    const campo = el.dataset.vocab;
    const valores = defs[campo].enum;
    if (el.dataset.como === "checkbox") {
      el.innerHTML = valores.map((v) => `<label><input type="checkbox" name="tipo_desarrollo" value="${v}">${esc(etiqueta(campo, v))}</label>`).join("");
    } else {
      el.innerHTML = `<option value="">Elegir…</option>` + valores.map((v) => `<option value="${v}">${esc(etiqueta(campo, v))}</option>`).join("");
    }
  }
}

function agregarFila(fieldset, defs) {
  const fila = fieldset.querySelector("template").content.cloneNode(true);
  llenarVocabularios(fila, defs);
  fieldset.querySelector(".agregar").before(fila);
}

function leerFilas(fieldset) {
  return [...fieldset.querySelectorAll(".fila")].map((fila) =>
    Object.fromEntries([...fila.querySelectorAll("[name]")].map((el) => [el.name, el.value.trim()]))
  );
}

function leerFormulario() {
  const v = (n) => form.elements[n].value.trim();
  return {
    id: v("id"), nombre: v("nombre"), organizacion: v("organizacion"), tipo_organizacion: v("tipo_organizacion"),
    descripcion: v("descripcion"),
    tipo_desarrollo: [...form.querySelectorAll("input[name=tipo_desarrollo]:checked")].map((c) => c.value),
    datos_utilizados: leerFilas($("datos_utilizados")),
    enlaces: leerFilas($("enlaces")),
    contactos: leerFilas($("contactos")),
    tecnologias: separar(v("tecnologias")),
    etiquetas: separar(v("etiquetas")),
  };
}

// Validación propia de lo que HTML5 no cubre. La validación definitiva la hace el schema en CI.
function validar(f) {
  const errores = [];
  if (!form.checkValidity()) errores.push("Hay campos obligatorios sin completar o con formato inválido (marcados en rojo).");
  if (!f.tipo_desarrollo.length) errores.push("Elegí al menos un tipo de desarrollo.");
  if (!f.datos_utilizados.length) errores.push("Agregá al menos una fuente de datos.");
  if (!f.enlaces.length) errores.push("Agregá al menos un enlace.");
  if (!f.contactos.length) errores.push("Agregá al menos un contacto.");
  for (const c of f.contactos) {
    if (c.tipo === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.valor)) errores.push(`El contacto "${c.valor}" no es un correo válido.`);
    if (c.tipo && c.tipo !== "email" && !/^https?:\/\//.test(c.valor)) errores.push(`El contacto "${c.valor}" debe ser una URL que empiece con http:// o https://.`);
  }
  for (const t of [...f.tecnologias, ...f.etiquetas]) if (!simple(t)) errores.push(`"${t}": usar solo minúsculas, números y guiones.`);
  return errores;
}

async function iniciar() {
  const defs = (await (await fetch("data/schema.json")).json()).$defs;
  llenarVocabularios(form, defs);
  for (const id of ["datos_utilizados", "enlaces", "contactos"]) {
    agregarFila($(id), defs);
    $(id).querySelector(".agregar").addEventListener("click", () => agregarFila($(id), defs));
  }
  form.addEventListener("click", (ev) => {
    if (ev.target.classList.contains("quitar")) ev.target.closest(".fila").remove();
  });
  form.elements.nombre.addEventListener("input", () => {
    if (!form.elements.id.dataset.manual) form.elements.id.value = slug(form.elements.nombre.value);
  });
  form.elements.id.addEventListener("input", () => (form.elements.id.dataset.manual = "1"));

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const f = leerFormulario();
    const errores = validar(f);
    form.classList.add("validado");
    $("errores").hidden = !errores.length;
    $("errores").innerHTML = `<strong>${errores.length === 1 ? "Falta un dato" : `Faltan ${errores.length} datos`} para generar la ficha</strong><ul>${errores.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>`;
    $("resultado").hidden = !!errores.length;
    if (errores.length) return;

    const yaml = aYaml(f);
    const archivo = `items/${f.id}.yml`;
    $("archivo").textContent = archivo;
    $("yaml").textContent = yaml;
    $("pr").href = `${CONFIG.repo}/new/${CONFIG.rama}?filename=${encodeURIComponent(archivo)}&value=${encodeURIComponent(yaml)}`;
    if (CONFIG.correo) {
      $("mail").hidden = false;
      $("mail").href = `mailto:${CONFIG.correo}?subject=${encodeURIComponent(`[Catálogo] Alta: ${f.nombre}`)}&body=${encodeURIComponent(`Solicito agregar esta herramienta al catálogo.\n\nArchivo: ${archivo}\n\n${yaml}`)}`;
    }
    $("resultado").scrollIntoView({ behavior: "smooth" });
  });

  $("copiar").addEventListener("click", async () => {
    await navigator.clipboard.writeText($("yaml").textContent);
    $("copiar").textContent = "Copiado ✓";
  });
}

iniciar();
