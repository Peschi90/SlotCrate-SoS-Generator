"""Ergebnis-Cache für die STL-Erzeugung.

Der Schlüssel ist ein SHA-256 aus:
    widthCells | depthCells | heightMm(4 Nachkommastellen) | settingsVersion |
    geometryVersion

Dateien werden atomar über eine temporäre .part-Datei geschrieben.
"""
from __future__ import annotations

import hashlib
import os
import tempfile
from pathlib import Path

from slotcrate.geometry.constants import GEOMETRY_VERSION


def cache_key(
    width_cells: int,
    depth_cells: int,
    height_mm: float,
    settings_version: int,
    scale_factor: float,
    geometry_version: str = GEOMETRY_VERSION,
) -> str:
    payload = (
        f"{width_cells}|{depth_cells}|{round(height_mm, 4)}|"
        f"{settings_version}|{round(scale_factor, 4)}|{geometry_version}"
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


class StlCache:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        return self.root / f"{key}.stl"

    def get(self, key: str) -> Path | None:
        p = self._path(key)
        return p if p.is_file() else None

    def store_bytes(self, key: str, data: bytes) -> Path:
        target = self._path(key)
        with tempfile.NamedTemporaryFile(
            dir=self.root, prefix=f"{key}.", suffix=".part", delete=False
        ) as tmp:
            tmp.write(data)
            tmp_path = Path(tmp.name)
        os.replace(tmp_path, target)
        return target
