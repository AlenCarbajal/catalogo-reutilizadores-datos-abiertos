// Configuración del sitio. Único archivo a tocar para adaptar el catálogo.
const CONFIG = {
  // Repositorio en GitHub. Lo usa el formulario para abrir el PR prefillado.
  repo: "https://github.com/OWNER/REPO",
  rama: "main",
  // Correo institucional que recibe solicitudes de alta. Vacío = no se muestra el botón.
  correo: "",
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
