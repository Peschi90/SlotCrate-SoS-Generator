"""Geometrie-Generator für den Maintenance-Modul Einschub (SC_MM_Inlay).

Laufzeit: Lädt das unveränderliche Referenz-STEP SC_MM_Inlay.step,
schließt die 11 Referenz-Bohrungen zu einem sauberen Rohkörper (Blank Base)
und schneidet die vom Benutzer frei konfigurierten runden Aussparungen
auf Ebene 1 (unten) und Ebene 2 (oben) ein.
"""
from __future__ import annotations

from functools import lru_cache
from typing import Sequence, Tuple

import cadquery as cq

from slotcrate.geometry.constants import (
    INLAY_LEVEL1_SHELF_Z_MM,
    INLAY_LEVEL2_SHELF_Z_MM,
    INLAY_STEP_FILE,
)
from slotcrate.geometry.export import shape_to_stl_bytes
from slotcrate.geometry.reference import REFERENCE_DIR, _load_step, _normalize_z_up

# Die 11 Referenz-Bohrungen aus SC_MM_Inlay.step in normalisierten Z-Up-Koordinaten:
# (radius_mm, center_x_mm, center_y_mm, shelf_z_mm)
REFERENCE_HOLES_LEVEL1: Tuple[Tuple[float, float, float], ...] = (
    (25.0, 28.70, 26.10),   # dia 25
    (32.0, 28.70, 61.10),   # dia 32
    (41.0, 28.70, 105.10),  # dia 41
    (41.0, 28.70, 150.10),  # dia 41
    (41.0, 28.70, 195.10),  # dia 41
)

REFERENCE_HOLES_LEVEL2: Tuple[Tuple[float, float, float], ...] = (
    (25.0, 23.70, 28.70),   # dia 25
    (25.0, 33.70, 56.70),   # dia 25
    (25.0, 23.70, 84.70),   # dia 25
    (32.0, 28.70, 119.70),  # dia 32
    (32.0, 28.70, 154.70),  # dia 32
    (32.0, 28.70, 189.70),  # dia 32
)


@lru_cache(maxsize=1)
def load_blank_inlay_base() -> cq.Shape:
    """Erzeugt und cached den ungelochten Rohling des Maintenance-Modul Einschubs.

    Verschließt die 11 Referenzbohrungen auf den beiden Regalböden.
    """
    step_path = REFERENCE_DIR / INLAY_STEP_FILE
    inlay_norm = _normalize_z_up(_load_step(step_path))

    cylinders_to_fill = [
        # Level 1 (Z ~ 28.60)
        (20.5, 28.70, 105.10, INLAY_LEVEL1_SHELF_Z_MM),
        (20.5, 28.70, 150.10, INLAY_LEVEL1_SHELF_Z_MM),
        (16.0, 28.70, 61.10, INLAY_LEVEL1_SHELF_Z_MM),
        (20.5, 28.70, 195.10, INLAY_LEVEL1_SHELF_Z_MM),
        (12.5, 28.70, 26.10, INLAY_LEVEL1_SHELF_Z_MM),
        # Level 2 (Z ~ 128.90)
        (12.5, 23.70, 84.70, INLAY_LEVEL2_SHELF_Z_MM),
        (16.0, 28.70, 189.70, INLAY_LEVEL2_SHELF_Z_MM),
        (12.5, 33.70, 56.70, INLAY_LEVEL2_SHELF_Z_MM),
        (16.0, 28.70, 119.70, INLAY_LEVEL2_SHELF_Z_MM),
        (16.0, 28.70, 154.70, INLAY_LEVEL2_SHELF_Z_MM),
        (12.5, 23.70, 28.70, INLAY_LEVEL2_SHELF_Z_MM),
    ]

    wp = cq.Workplane("XY").add(inlay_norm)
    for r, x, y, z in cylinders_to_fill:
        # Zylinder durch die Regalplatte (Höhe 10mm zentriert um Z)
        plug = cq.Solid.makeCylinder(r + 0.05, 10.0, cq.Vector(x, y, z - 5.0), cq.Vector(0, 0, 1))
        wp = wp.union(cq.Workplane("XY").add(plug))

    return wp.val()


def build_inlay_shape(
    level1_cutouts: Sequence[Tuple[float, float, float]] = (),
    level2_cutouts: Sequence[Tuple[float, float, float]] = (),
) -> cq.Shape:
    """Schneidet benutzerdefinierte zylindrische Aussparungen in Ebene 1 und Ebene 2 ein.

    ``level1_cutouts`` und ``level2_cutouts`` sind Sequenzen von
    ``(diameter_mm, center_x_mm, center_y_mm)``.
    """
    base = load_blank_inlay_base()
    if not level1_cutouts and not level2_cutouts:
        return base

    wp = cq.Workplane("XY").add(base)

    # Ebene 1: Aussparungen durch Z = 15..35 mm
    for dia_mm, cx_mm, cy_mm in level1_cutouts:
        radius = dia_mm / 2.0
        cutter = cq.Solid.makeCylinder(
            radius, 20.0, cq.Vector(cx_mm, cy_mm, INLAY_LEVEL1_SHELF_Z_MM - 10.0), cq.Vector(0, 0, 1)
        )
        wp = wp.cut(cq.Workplane("XY").add(cutter))

    # Ebene 2: Aussparungen durch Z = 115..135 mm
    for dia_mm, cx_mm, cy_mm in level2_cutouts:
        radius = dia_mm / 2.0
        cutter = cq.Solid.makeCylinder(
            radius, 20.0, cq.Vector(cx_mm, cy_mm, INLAY_LEVEL2_SHELF_Z_MM - 10.0), cq.Vector(0, 0, 1)
        )
        wp = wp.cut(cq.Workplane("XY").add(cutter))

    return wp.val()


def stl_bytes_for_inlay(
    level1_cutouts: Sequence[Tuple[float, float, float]] = (),
    level2_cutouts: Sequence[Tuple[float, float, float]] = (),
    stl_tessellation_linear_mm: float = 0.05,
    stl_tessellation_angular_rad: float = 0.5,
) -> bytes:
    """Erzeugt STL-Binärdaten für den konfigurierten Maintenance-Modul Einschub."""
    shape = build_inlay_shape(level1_cutouts, level2_cutouts)
    return shape_to_stl_bytes(
        shape,
        linear_deflection_mm=stl_tessellation_linear_mm,
        angular_deflection_rad=stl_tessellation_angular_rad,
    )
