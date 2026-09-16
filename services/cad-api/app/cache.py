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
from typing import Sequence, Tuple

from slotcrate.geometry.constants import GEOMETRY_VERSION


def _dividers_key_part(dividers: Sequence[Tuple[str, float, float]] | None) -> str:
    if not dividers:
        return "-"
    return ";".join(
        f"{axis}:{round(offset, 4)}:{round(height, 4)}"
        for axis, offset, height in sorted(dividers)
    )


def _pockets_key_part(pockets: Sequence[Tuple[float, float, float, float]] | None) -> str:
    if not pockets:
        return "-"
    return ";".join(
        f"{round(cx, 4)}:{round(cy, 4)}:{round(dia, 4)}:{round(h, 4)}"
        for cx, cy, dia, h in sorted(pockets)
    )


def _wave_inserts_key_part(
    wave_inserts: Sequence[Tuple[str, float, float, float, int, float]] | None
) -> str:
    if not wave_inserts:
        return "-"
    return ";".join(
        f"{axis}:{round(offset, 4)}:{round(height, 4)}:{round(gd, 4)}:{gc}:{round(gdep, 4)}"
        for axis, offset, height, gd, gc, gdep in sorted(wave_inserts)
    )


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
    dividers: Sequence[Tuple[str, float, float]] | None = None,
    pockets: Sequence[Tuple[float, float, float, float]] | None = None,
    pockets_fill_outer: bool = False,
    wave_inserts: Sequence[Tuple[str, float, float, float, int, float]] | None = None,
    geometry_version: str = GEOMETRY_VERSION,
) -> str:
    payload = (
        f"{width_cells}|{depth_cells}|{round(height_mm, 4)}|"
        f"{settings_version}|{round(grid_pitch_mm, 4)}|{round(wall_thickness_mm, 4)}|"
        f"{round(inner_floor_radius_mm, 4)}|{round(outer_clearance_mm, 4)}|"
        f"{round(stl_tessellation_linear_mm, 4)}|{round(stl_tessellation_angular_rad, 4)}|"
        f"{_dividers_key_part(dividers)}|{_pockets_key_part(pockets)}|"
        f"{'1' if pockets_fill_outer else '0'}|{_wave_inserts_key_part(wave_inserts)}|{geometry_version}"
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


def _inlay_cutouts_key_part(
    cutouts: Sequence[Tuple[float, float, float]] | None,
) -> str:
    if not cutouts:
        return "-"
    return ";".join(
        f"{round(dia, 4)}:{round(cx, 4)}:{round(cy, 4)}"
        for dia, cx, cy in sorted(cutouts)
    )


def inlay_cache_key(
    level1_cutouts: Sequence[Tuple[float, float, float]] | None,
    level2_cutouts: Sequence[Tuple[float, float, float]] | None,
    settings_version: int,
    stl_tessellation_linear_mm: float,
    stl_tessellation_angular_rad: float,
    geometry_version: str = GEOMETRY_VERSION,
) -> str:
    payload = (
        f"inlay|{settings_version}|"
        f"{round(stl_tessellation_linear_mm, 4)}|{round(stl_tessellation_angular_rad, 4)}|"
        f"{_inlay_cutouts_key_part(level1_cutouts)}|"
        f"{_inlay_cutouts_key_part(level2_cutouts)}|"
        f"{geometry_version}"
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def cover_cache_key(
    text: str,
    cover_variant_id: str,
    font_name: str,
    font_size_mm: float,
    center_x_mm: float,
    center_y_mm: float,
    rotation_deg: float,
    settings_version: int,
    stl_tessellation_linear_mm: float,
    stl_tessellation_angular_rad: float,
    geometry_version: str = GEOMETRY_VERSION,
) -> str:
    payload = (
        f"cover|{cover_variant_id}|{text}|{font_name}|{round(font_size_mm, 4)}|{round(center_x_mm, 4)}|"
        f"{round(center_y_mm, 4)}|{round(rotation_deg, 4)}|{settings_version}|"
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
