#!/usr/bin/env python3
"""Genera web/data/portales.json con los portales Andino activos que cosecha datos.gob.ar.

Uso:
    python scripts/portales.py

Los toma de la API de CKAN de datos.gob.ar (harvest_source_list): fuentes activas
de tipo gobar_ckan, que son los portales Andino federados. La API no permite
consultas desde el navegador (sin CORS), por eso se consulta acá, al publicar.
Si la API no responde, escribe una lista vacía y no corta la publicación.
"""
import json
import re
import sys
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

API = "https://datos.gob.ar/api/3/action/harvest_source_list"
SALIDA = Path(__file__).resolve().parent.parent / "web" / "data" / "portales.json"


def nombre(titulo: str) -> str:
    # "Andino V1 - Ministerio de Justicia" → "Ministerio de Justicia"
    limpio = re.sub(r"^andino\s*v\d+\s*-\s*", "", titulo.strip(), flags=re.I)
    return limpio[:1].upper() + limpio[1:]


def main() -> int:
    try:
        # La API rechaza el User-Agent por defecto de urllib (403).
        pedido = urllib.request.Request(API, headers={"User-Agent": "catalogo-reutilizadores-datos-abiertos"})
        with urllib.request.urlopen(pedido, timeout=30) as r:
            fuentes = json.load(r)["result"]
    except Exception as exc:  # la publicación sigue aunque la API no responda
        print(f"::warning::No se pudo consultar {API}: {exc}")
        fuentes = []
    portales = sorted(
        ({"nombre": nombre(f["title"]), "url": f["url"].rstrip("/"), "dominio": urlparse(f["url"]).netloc}
         for f in fuentes if f.get("type") == "gobar_ckan" and f.get("active")),
        key=lambda p: p["dominio"],
    )
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text(json.dumps(portales, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"✓ {len(portales)} portal(es) Andino → {SALIDA.relative_to(SALIDA.parents[2])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
