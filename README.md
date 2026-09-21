# Catálogo de usos y desarrollos

Catálogo abierto de herramientas que usan datos, APIs y catálogos públicos.
Cada herramienta es un archivo YAML en `items/`. Un script lo valida y arma un
JSON; un sitio estático lo muestra. No hay backend, base de datos ni build.

## Cómo funciona

```
items/*.yml  ──►  scripts/catalogo.py  ──►  web/data/items.json  ──►  web/ (GitHub Pages)
                  (valida contra el schema)
```

| Ruta | Qué es |
| --- | --- |
| `items/<id>.yml` | Una ficha por herramienta. `items/_plantilla.yml` es el modelo para copiar. |
| `schemas/item.schema.json` | Campos, reglas y vocabularios (valores permitidos). Única fuente de verdad. |
| `scripts/catalogo.py` | Valida las fichas y genera `web/data/`. Lo corre CI en cada PR. |
| `web/` | El sitio: `index.html` (catálogo) y `agregar.html` (formulario que arma el YAML). |
| `web/config.js` | URL del repo y correo institucional. |
| `web/textos.js` | Textos visibles del sitio y etiquetas de los vocabularios. |
| `docs/modelo-de-datos.md` | Descripción de cada campo y de cada valor de vocabulario. |
| `.github/workflows/catalogo.yml` | Valida en cada PR; en `main` publica en GitHub Pages. |

## Agregar una herramienta

La forma fácil: abrir `agregar.html` en el sitio publicado, completar el
formulario y elegir **Abrir Pull Request** (GitHub abre el editor con el
archivo ya cargado) o **Enviar por correo** (manda la ficha al correo
institucional; alguien del equipo la sube). Detalle en [CONTRIBUIR.md](CONTRIBUIR.md).

La forma manual: copiar `items/_plantilla.yml` a `items/<id>.yml`, completarlo y
abrir un PR. CI valida y, si algo falla, anota el error sobre el archivo.

## Correr en local

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r scripts/requirements.txt
python scripts/catalogo.py               # valida todo y genera web/data/
python -m http.server -d web 8000        # http://localhost:8000
```

`python scripts/catalogo.py items/mi-ficha.yml` valida solo ese archivo.
El sitio hace `fetch` de `data/items.json`, así que hay que servirlo por HTTP:
abrir `index.html` como archivo no funciona.

## Puesta en marcha (una sola vez)

1. Completar `repo` y `correo` en `web/config.js`.
2. En GitHub: Settings → Pages → Source: **GitHub Actions**.
3. Hacer push a `main`. El workflow publica el sitio.

## Mantenimiento

- **Agregar un valor de vocabulario**: sumarlo al `enum` correspondiente en
  `schemas/item.schema.json`, su etiqueta en `web/textos.js` y su descripción
  en `docs/modelo-de-datos.md`.
- **Agregar un campo**: definirlo en el schema, mostrarlo en `web/app.js`
  (`renderDetalle`) y, si lo carga el público, sumarlo a `agregar.html` y a
  `aYaml` en `web/agregar.js`.
- **Verificar una ficha**: editar su YAML y completar `verificacion`.

## Licencia

Contenidos bajo [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.es). Código bajo MIT.
