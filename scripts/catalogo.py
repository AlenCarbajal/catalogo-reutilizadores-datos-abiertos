#!/usr/bin/env python3
"""Valida items/*.yml contra schemas/item.schema.json y genera web/data/.

Uso:
    python scripts/catalogo.py              # valida todo y genera el índice
    python scripts/catalogo.py items/x.yml  # valida solo esos archivos, sin generar

Además del schema verifica que el `id` coincida con el nombre del archivo y que
no esté repetido. Devuelve exit code 1 si hay algún error. Los errores se
imprimen con el formato `::error file=...::` para que GitHub los anote en el PR.
"""
import json
import shutil
import sys
from pathlib import Path

import yaml
from jsonschema import Draft202012Validator, FormatChecker

RAIZ = Path(__file__).resolve().parent.parent
ITEMS = RAIZ / "items"
SCHEMA = RAIZ / "schemas" / "item.schema.json"
SALIDA = RAIZ / "web" / "data"


class Loader(yaml.SafeLoader):
    """SafeLoader que deja las fechas como texto (el schema las valida como string)."""


Loader.yaml_implicit_resolvers = {
    k: [(t, r) for t, r in v if t != "tag:yaml.org,2002:timestamp"]
    for k, v in Loader.yaml_implicit_resolvers.items()
}


def cargar(ruta: Path) -> dict:
    return yaml.load(ruta.read_text(encoding="utf-8"), Loader=Loader)


def validar(rutas: list[Path]) -> tuple[list[dict], int]:
    validador = Draft202012Validator(json.loads(SCHEMA.read_text()), format_checker=FormatChecker())
    items, errores, vistos = [], 0, {}

    def error(ruta, msg):
        nonlocal errores
        errores += 1
        print(f"::error file={ruta.relative_to(RAIZ)}::{msg}")

    for ruta in rutas:
        try:
            item = cargar(ruta)
        except yaml.YAMLError as exc:
            error(ruta, f"YAML inválido: {exc}")
            continue
        if not isinstance(item, dict):
            error(ruta, "El archivo debe ser un objeto YAML con los campos de la ficha.")
            continue
        for e in sorted(validador.iter_errors(item), key=lambda e: list(e.path)):
            error(ruta, f"{'.'.join(map(str, e.path)) or '(raíz)'}: {e.message}")
        if item.get("id") != ruta.stem:
            error(ruta, f"El id '{item.get('id')}' no coincide con el nombre del archivo '{ruta.stem}'.")
        if item.get("id") in vistos:
            error(ruta, f"id repetido, ya usado en {vistos[item['id']]}.")
        vistos[item.get("id")] = ruta.name
        items.append(item)
    return items, errores


def generar(items: list[dict]) -> None:
    SALIDA.mkdir(parents=True, exist_ok=True)
    items = sorted(items, key=lambda i: i["nombre"].lower())
    (SALIDA / "items.json").write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding="utf-8")
    shutil.copy(SCHEMA, SALIDA / "schema.json")  # el formulario lee los vocabularios de acá
    print(f"✓ {len(items)} ítem(s) → web/data/")


def main(argv: list[str]) -> int:
    rutas = [Path(a).resolve() for a in argv] or sorted(p for p in ITEMS.glob("*.yml") if not p.name.startswith("_"))
    items, errores = validar(rutas)
    if errores:
        print(f"✗ {errores} error(es) en {len(rutas)} archivo(s).")
        return 1
    print(f"✓ {len(rutas)} ítem(s) válido(s).")
    if not argv:
        generar(items)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
