# Cómo contribuir

Una ficha es una herramienta o desarrollo, no una organización. Si tu equipo
tiene un tablero y un informe, son dos fichas.

## Agregar una herramienta

### Opción A: formulario (recomendada)

1. Entrar a `agregar.html` en el sitio del catálogo.
2. Completar los campos. El formulario arma el archivo YAML por vos.
3. Elegir una salida:
   - **Abrir Pull Request en GitHub**: se abre el editor de GitHub con el
     archivo ya cargado. Hacé clic en *Propose new file* y luego en
     *Create pull request*. Hace falta cuenta de GitHub.
   - **Enviar por correo**: abre tu cliente de correo con la ficha en el cuerpo.
     Alguien del equipo la revisa y la sube.
   - **Copiar YAML**: para pegarlo donde quieras.

### Opción B: a mano

```bash
cp items/_plantilla.yml items/<id>.yml
```

Completar siguiendo [docs/modelo-de-datos.md](docs/modelo-de-datos.md) y abrir
un PR. Un archivo por herramienta.

## Criterios de aceptación

- La herramienta usa efectivamente datos, APIs o catálogos públicos.
- Hay al menos un enlace público que permita comprobarlo.
- La descripción explica qué hace la herramienta con los datos.
- No está ya cargada (buscar por nombre antes).
- `organizacion` se escribe igual que en las otras fichas de esa organización:
  el catálogo agrupa por coincidencia exacta.

## El `id`

- Minúsculas, números y guiones: `tablero-energia-patagonica`.
- Igual al nombre del archivo (`items/tablero-energia-patagonica.yml`).
- No se cambia una vez publicado: es la URL de la ficha.

## Corregir una ficha

Editar el YAML y abrir un PR. Si sos parte de la organización catalogada,
decilo en el PR: alcanza para pasar `verificacion.estado` a `verificado`.

## Proponer un valor de vocabulario

Abrir un issue con el campo, el valor propuesto y una herramienta real que lo
necesite. `tecnologias` y `etiquetas` son libres: no hace falta issue.

## Validación

Cada PR corre `python scripts/catalogo.py`. Si falla, el error aparece anotado
sobre la línea del archivo. Para reproducirlo en local, ver el README.

## Baja de una ficha

Abrir un issue o escribir al correo institucional. Se resuelve sin justificación.
