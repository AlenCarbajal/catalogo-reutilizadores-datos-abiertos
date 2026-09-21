// Todos los textos visibles del sitio. Es el único archivo a tocar para cambiar
// la redacción: el HTML y el JS los toman de acá por su clave.
//
// Formato dentro de cada texto:
//   {n}, {total}, {valor}, {nombre}, {archivo}  se reemplazan por el dato real.
//   [texto]   se vuelve enlace (solo donde el texto lleva un enlace).
//   *texto*   se muestra en cursiva.
const TEXTOS = {
  // --- Catálogo (index.html) ---
  "catalogo.titulo_pestana": "Catálogo de usos y desarrollos",
  "catalogo.descripcion_buscadores": "Catálogo abierto de proyectos que usan datos, APIs y catálogos públicos.",
  "catalogo.sobretitulo": "Datos Abiertos · Argentina",
  "catalogo.titulo": "Catálogo de usos y desarrollos",
  "catalogo.bajada": "Proyectos que usan datos, APIs y catálogos públicos, publicados por organismos, equipos y personas.",
  "catalogo.buscar": "Buscar",
  "catalogo.buscar_placeholder": "Proyecto, organización, tecnología, fuente…",
  "catalogo.boton_sumar": "¡Quiero sumar mi proyecto!",
  "catalogo.filtrar": "Filtrar",
  "catalogo.conteo": "{n} de {total}",
  "catalogo.conteo_sufijo": "resultados",
  "catalogo.verificado": "Verificado",
  "catalogo.vacio_titulo": "Ningún proyecto coincide",
  "catalogo.vacio_texto": "Sacá algún filtro o [sumá el que falta].",
  "catalogo.error_carga_titulo": "No se pudo cargar el catálogo",
  "catalogo.error_carga_texto": "Falta data/items.json: generalo con python scripts/catalogo.py y serví la carpeta web/ por HTTP.",
  "catalogo.llamado_titulo": "¿Desarrollaste un proyecto con datos públicos?",
  "catalogo.llamado_texto": "Sumalo al catálogo. Son cinco minutos de formulario y no hace falta saber YAML ni usar GitHub.",
  "catalogo.pie": "Cada ficha es un archivo YAML en el repositorio. Contenidos bajo CC BY 4.0.",

  // --- Ficha abierta (rótulos de cada bloque) ---
  "ficha.datos": "Datos",
  "ficha.enlaces": "Enlaces",
  "ficha.contacto": "Contacto",
  "ficha.tecnologias": "Tecnologías",

  // --- Títulos del panel de filtros ---
  "faceta.tipo_organizacion": "Tipo de organización",
  "faceta.organizacion": "Organización",
  "faceta.tipo_desarrollo": "Tipo de desarrollo",
  "faceta.tecnologias": "Tecnologías",
  "faceta.etiquetas": "Etiquetas",

  // --- Formulario (agregar.html) ---
  "form.titulo_pestana": "Sumá tu proyecto · Catálogo de usos y desarrollos",
  "form.volver": "← Volver al catálogo",
  "form.titulo": "Sumá tu proyecto al catálogo",
  "form.bajada": "Completá los datos de tu proyecto y envialo como Pull Request o por correo para que el equipo de Datos Abiertos lo evalúe.",

  "form.s1_titulo": "Sobre tu proyecto",
  "form.nombre": "Nombre del proyecto",
  "form.nombre_placeholder": "Tablero de Energía Patagónica",
  "form.id": "Identificador",
  "form.id_ayuda": "Se genera automáticamente a partir del nombre. Será el nombre del archivo y la URL de la ficha.",
  "form.organizacion": "Organización, equipo o persona que lo desarrolla",
  "form.tipo_organizacion": "Tipo de organización",
  "form.descripcion": "Descripción",
  "form.descripcion_ayuda": "Párrafo breve contando qué hace y cómo usa los datos.",
  "form.tipo_desarrollo": "Tipo de desarrollo",
  "form.tipo_desarrollo_ayuda": "Elegí al menos uno.",
  "form.elegir": "Elegir…",

  "form.s2_titulo": "Datos utilizados",
  "form.s2_ayuda": "Al menos una fuente.",
  "form.fuente_rotulo": "Fuente",
  "form.fuente_nombre": "Nombre de la fuente",
  "form.fuente_nombre_placeholder": "Georef, CAMMESA…",
  "form.fuente_tipo": "Tipo",
  "form.fuente_url": "URL",
  "form.opcional": "(opcional)",
  "form.agregar_fuente": "+ Agregar fuente",

  "form.s3_titulo": "Enlaces",
  "form.s3_ayuda": "Al menos uno, para poder comprobar que el proyecto existe.",
  "form.enlace_rotulo": "Enlace",
  "form.enlace_url": "URL",
  "form.enlace_tipo": "Tipo",
  "form.agregar_enlace": "+ Agregar enlace",

  "form.s4_titulo": "Contacto",
  "form.s4_ayuda": "Al menos uno.",
  "form.contacto_rotulo": "Contacto",
  "form.contacto_valor": "Correo o URL",
  "form.contacto_tipo": "Tipo",
  "form.agregar_contacto": "+ Agregar contacto",

  "form.eliminar": "× Eliminar",

  "form.s5_titulo": "Opcional",
  "form.tecnologias": "Tecnologías",
  "form.tecnologias_ayuda": "Separadas por coma, en minúsculas y sin acentos: python, postgis, power-bi.",
  "form.etiquetas": "Etiquetas",
  "form.etiquetas_ayuda": "Separadas por coma, minúsculas y guiones: energia, geoespacial.",

  "form.generar": "Generar ficha",

  // --- Errores del formulario ---
  "error.titulo_uno": "Falta un dato para generar la ficha",
  "error.titulo_varios": "Faltan {n} datos para generar la ficha",
  "error.campos": "Hay campos obligatorios sin completar o con formato inválido (marcados en rojo).",
  "error.tipo_desarrollo": "Elegí al menos un tipo de desarrollo.",
  "error.fuente": "Agregá al menos una fuente de datos.",
  "error.enlace": "Agregá al menos un enlace.",
  "error.contacto": "Agregá al menos un contacto.",
  "error.correo": "El contacto \"{valor}\" no es un correo válido.",
  "error.url": "El contacto \"{valor}\" debe ser una URL que empiece con http:// o https://.",
  "error.formato": "\"{valor}\": usar solo minúsculas, números y guiones.",

  // --- Resultado del formulario ---
  "resultado.titulo": "Tu ficha",
  "resultado.texto": "Revisala y elegí cómo enviarla. El archivo se llamará {archivo}.",
  "resultado.pr": "Abrir Pull Request en GitHub",
  "resultado.correo": "Enviar por correo",
  "resultado.copiar": "Copiar YAML",
  "resultado.copiado": "Copiado ✓",
  "resultado.nota": "Se abre el editor de GitHub con el archivo ya cargado y sólo tenés que confirmar los dos pasos que indica la pantalla (*Propose new file* y *Create pull request*). Si no tenés cuenta, usá el correo.",
  "correo.asunto": "[Catálogo] Alta: {nombre}",
  "correo.cuerpo": "Solicito agregar esta herramienta al catálogo.",
  "correo.archivo": "Archivo",
};

// Etiquetas legibles de cada valor de vocabulario. Los valores permitidos viven
// en schemas/item.schema.json; si agregás uno ahí, agregá su etiqueta acá.
// Un valor sin etiqueta se muestra tal cual.
const ETIQUETAS = {
  tipo_organizacion: { independiente: "Independiente", academia: "Academia", empresa: "Empresa", gobierno: "Gobierno", ong: "ONG", otro: "Otro" },
  tipo_desarrollo: { tablero: "Tablero", visualizacion_datos: "Visualización de datos", web: "Sitio web", aplicacion: "Aplicación", api: "API", mapa: "Mapa", pipeline_datos: "Pipeline de datos", etl: "ETL", investigacion: "Investigación", informe: "Informe", documentacion: "Documentación", saas: "SaaS", otro: "Otro" },
  tipo_dato: { dataset: "Dataset", catalogo: "Catálogo", api: "API", servicio: "Servicio", multiple: "Múltiples fuentes", otro: "Otro" },
  tipo_enlace: { sitio_web: "Sitio web", repositorio: "Repositorio", documentacion: "Documentación", tablero: "Tablero", publicacion: "Publicación", proyecto: "Proyecto", api: "API", otro: "Enlace" },
  tipo_contacto: { email: "Correo", sitio_web: "Sitio web", github: "GitHub", linkedin: "LinkedIn", otro: "Contacto" },
};

const etiqueta = (campo, valor) => ETIQUETAS[campo]?.[valor] ?? valor;
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Texto plano con los {datos} reemplazados.
const t = (clave, datos = {}) => (TEXTOS[clave] ?? clave).replace(/\{(\w+)\}/g, (_, k) => datos[k] ?? "");

// Texto como HTML seguro: escapa, y aplica *cursiva* y [enlace] (a `href`).
const th = (clave, datos, href = "") =>
  esc(t(clave, datos)).replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/\[(.+?)\]/g, `<a href="${esc(href)}">$1</a>`);

// Completa el HTML: data-t (contenido), data-t-placeholder, data-t-content, data-t-rotulo.
function aplicarTextos(raiz = document) {
  for (const el of raiz.querySelectorAll("[data-t]")) el.innerHTML = th(el.dataset.t, {}, el.dataset.href);
  for (const el of raiz.querySelectorAll("[data-t-placeholder]")) el.placeholder = t(el.dataset.tPlaceholder);
  for (const el of raiz.querySelectorAll("[data-t-content]")) el.content = t(el.dataset.tContent);
  for (const el of raiz.querySelectorAll("[data-t-rotulo]")) el.dataset.rotulo = t(el.dataset.tRotulo);
}
