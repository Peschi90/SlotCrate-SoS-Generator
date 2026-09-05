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
    grid_pitch_mm: float,
    wall_thickness_mm: float,
    inner_floor_radius_mm: float,
    outer_clearance_mm: float,
    stl_tessellation_linear_mm: float,
    stl_tessellation_angular_rad: float,
    geometry_version: str = GEOMETRY_VERSION,
) -> str:
    payload = (
        f"{width_cells}|{depth_cells}|{round(height_mm, 4)}|"
        f"{settings_version}|{round(grid_pitch_mm, 4)}|{round(wall_thickness_mm, 4)}|"
        f"{round(inner_floor_radius_mm, 4)}|{round(outer_clearance_mm, 4)}|"
        f"{round(stl_tessellation_linear_mm, 4)}|{round(stl_tessellation_angular_rad, 4)}|"
        f"{geometry_version}"
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def plate_cache_key(
    plate_step_file: str,
    settings_version: int,
    stl_tessellation_linear_mm: float,
    stl_tessellation_angular_rad: float,
    geometry_version: str = GEOMETRY_VERSION,
) -> str:
    payload = (
        f"plate|{plate_step_file}|{settings_version}|"
        f"{round(stl_tessellation_linear_mm, 4)}|{round(stl_tessellation_angular_rad, 4)}|"
        f"{geometry_version}"
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
