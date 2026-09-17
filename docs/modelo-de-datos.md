# Modelo de datos

La unidad del catálogo es la **herramienta**, no la organización. Cada una es
un archivo `items/<id>.yml`. Las reglas exactas están en
`schemas/item.schema.json`; este documento las explica.

## Campos

| Campo | Obligatorio | Tipo | Descripción |
| --- | --- | --- | --- |
| `id` | Sí | texto | Minúsculas, números y guiones. Igual al nombre del archivo. Único. |
| `nombre` | Sí | texto | Nombre de la herramienta (no de la organización). |
| `organizacion` | Sí | texto | Quién la desarrolla. Escribirlo igual en todas sus fichas. |
| `tipo_organizacion` | Sí | vocabulario | Un solo valor. |
| `descripcion` | Sí | texto (20 a 1200 caracteres) | Qué hace y cómo usa los datos. |
| `tipo_desarrollo` | Sí | lista de vocabulario | Qué **es** el producto. Uno o más valores. |
| `datos_utilizados` | Sí | lista (mín. 1) | Cada uno: `nombre`, `tipo` (vocabulario) y `url` opcional. |
| `enlaces` | Sí | lista (mín. 1) | Cada uno: `url` (http/https) y `tipo` (vocabulario). |
| `contactos` | Sí | lista (mín. 1) | Cada uno: `tipo` (vocabulario) y `valor`. Si `tipo` es `email`, `valor` es un correo; si no, una URL. |
| `tecnologias` | No | lista de texto | Con **qué** está hecho. Libre, en minúsculas sin acentos: `python`, `power-bi`. |
| `etiquetas` | No | lista de texto | Libre, minúsculas y guiones. |
| `verificacion` | No | objeto | `estado` (vocabulario), `fecha` (`AAAA-MM-DD`) y `evidencia`. Si es `verificado`, los tres son obligatorios. |

`tipo_desarrollo` y `tecnologias` van separados para que el filtro no mezcle
qué es la herramienta con cómo está hecha.

## Vocabularios

Cualquier valor fuera de estas listas hace fallar la validación. Para agregar
uno: sumarlo al `enum` en `schemas/item.schema.json`, su etiqueta en
`web/config.js` y su descripción acá.

### `tipo_organizacion`

| Valor | Descripción |
| --- | --- |
| `independiente` | Personas o equipos sin marco institucional. |
| `academia` | Universidades, centros de estudio, grupos de investigación. |
| `empresa` | Organizaciones con fines de lucro. |
| `gobierno` | Organismos públicos de cualquier nivel. |
| `ong` | Sociedad civil sin fines de lucro. |
| `otro` | No encuadra en las anteriores. |

### `tipo_desarrollo`

| Valor | Descripción |
| --- | --- |
| `tablero` | Tableros de control o de monitoreo. |
| `visualizacion_datos` | Visualizaciones, gráficos, piezas interactivas. |
| `web` | Sitio web o portal. |
| `aplicacion` | Aplicación de escritorio o móvil. |
| `api` | Servicio de datos consumible por terceros. |
| `mapa` | Productos cartográficos o geoespaciales. |
| `pipeline_datos` | Procesos de ingesta y procesamiento de datos. |
| `etl` | Procesos de extracción, transformación y carga. |
| `investigacion` | Trabajos de investigación o papers. |
| `informe` | Informes o publicaciones periódicas. |
| `documentacion` | Guías, manuales, material de referencia. |
| `saas` | Producto ofrecido como servicio. |
| `otro` | No encuadra en las anteriores. |

### `datos_utilizados.tipo`

| Valor | Descripción |
| --- | --- |
| `dataset` | Conjunto de datos puntual. |
| `catalogo` | Catálogo o portal de datos completo. |
| `api` | API consultada en línea. |
| `servicio` | Servicio de datos que no es una API (WMS, feeds). |
| `multiple` | Varias fuentes que no tiene sentido enumerar. |
| `otro` | No encuadra en las anteriores. |

### `enlaces.tipo`

| Valor | Descripción |
| --- | --- |
| `sitio_web` | Sitio institucional o principal. |
| `repositorio` | Código fuente. |
| `documentacion` | Documentación técnica o de uso. |
| `tablero` | Tablero publicado. |
| `publicacion` | Paper, artículo o nota. |
| `proyecto` | Página específica del proyecto. |
| `api` | Endpoint o página de la API. |
| `otro` | No encuadra en las anteriores. |

### `contactos.tipo`

`email`, `sitio_web`, `github`, `linkedin`, `otro`.

### `verificacion.estado`

| Valor | Descripción |
| --- | --- |
| `verificado` | Se confirmó con la organización o se comprobó la evidencia. |
| `pendiente` | Verificación en curso. |
| `no_verificado` | Sin verificar. |
