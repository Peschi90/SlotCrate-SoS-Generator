"""Parametrischer Aufbau der SlotCrate-Kästen.

M1: Für 1×1 mit Standardhöhe wird die aus SlotCrate_1x1.step extrahierte
Referenzgeometrie 1:1 wiederverwendet.

M2: Für 2×2 mit Standardhöhe wird die Referenz ebenfalls 1:1 genutzt.

M3: Für alle anderen NxM (1 ≤ N,M ≤ 10, außer 1×1 und 2×2 bei Standardhöhe)
wird der Kasten parametrisch aus:
  - einer rechteckigen Außenschale (N·pitch × M·pitch × H),
  - einem rechteckigen Innenraum (durchgehend, ohne Trennwände),
  - N·M unveränderten Bodenaufnahmen aus `features.pickup_template()`
konstruiert. Das Ergebnis ist ein einzelner geschlossener Solid.
"""
from __future__ import annotations

import math
from functools import lru_cache

import cadquery as cq

from . import features, reference
from .constants import (
    DEFAULT_BOX_HEIGHT_MM,
    DEFAULT_FLOOR_THICKNESS_MM,
    DEFAULT_INNER_FLOOR_RADIUS_MM,
    DEFAULT_WALL_THICKNESS_MM,
    GRID_PITCH_MM,
    PICKUP_TOP_Z_MM,
)


class UnsupportedBoxSize(NotImplementedError):
    """Größe wird erst in einem späteren Meilenstein umgesetzt."""


def _is_default_height(h: float) -> bool:
    return math.isclose(h, DEFAULT_BOX_HEIGHT_MM, abs_tol=1e-6)


def _validate_cells(width_cells: int, depth_cells: int) -> None:
    if width_cells < 1 or depth_cells < 1:
        raise ValueError("widthCells und depthCells müssen ≥ 1 sein")
    if width_cells > 10 or depth_cells > 10:
        raise ValueError("Maximal 10 Rasterfelder je Achse")


def build_box(
    width_cells: int,
    depth_cells: int,
    height_mm: float = DEFAULT_BOX_HEIGHT_MM,
    grid_pitch_mm: float = GRID_PITCH_MM,
    wall_thickness_mm: float = DEFAULT_WALL_THICKNESS_MM,
    inner_floor_radius_mm: float = DEFAULT_INNER_FLOOR_RADIUS_MM,
    outer_clearance_mm: float = 0.0,
) -> cq.Shape:
    _validate_cells(width_cells, depth_cells)
    if grid_pitch_mm <= 0:
        raise ValueError("grid_pitch_mm muss > 0 sein")
    if wall_thickness_mm <= 0:
        raise ValueError("wall_thickness_mm muss > 0 sein")
    if inner_floor_radius_mm < 0:
        raise ValueError("inner_floor_radius_mm muss >= 0 sein")
    if outer_clearance_mm < 0:
        raise ValueError("outer_clearance_mm muss >= 0 sein")

    pitch_scale = grid_pitch_mm / GRID_PITCH_MM
    floor_thickness_mm = DEFAULT_FLOOR_THICKNESS_MM * pitch_scale

    if _is_default_height(height_mm):
        default_geometry = (
            abs(grid_pitch_mm - GRID_PITCH_MM) < 1e-9
            and abs(wall_thickness_mm - DEFAULT_WALL_THICKNESS_MM) < 1e-9
            and abs(inner_floor_radius_mm - DEFAULT_INNER_FLOOR_RADIUS_MM) < 1e-9
            and abs(outer_clearance_mm) < 1e-9
        )
        if default_geometry:
            if width_cells == 1 and depth_cells == 1:
                return reference.load_normalized_box_1x1()
            if width_cells == 2 and depth_cells == 2:
                return reference.load_normalized_box_2x2()

    shape = _build_parametric_cached(
        width_cells,
        depth_cells,
        round(height_mm, 4),
        round(grid_pitch_mm, 4),
        round(wall_thickness_mm, 4),
        round(inner_floor_radius_mm, 4),
        round(outer_clearance_mm, 4),
        round(floor_thickness_mm, 4),
    )
    return shape


@lru_cache(maxsize=64)
def _build_parametric_cached(
    width_cells: int,
    depth_cells: int,
    height_mm: float,
    grid_pitch_mm: float,
    wall_thickness_mm: float,
    inner_floor_radius_mm: float,
    outer_clearance_mm: float,
    floor_thickness_mm: float,
) -> cq.Shape:
    return build_box_parametric(
        width_cells,
        depth_cells,
        height_mm=height_mm,
        grid_pitch_mm=grid_pitch_mm,
        wall_thickness_mm=wall_thickness_mm,
        inner_floor_radius_mm=inner_floor_radius_mm,
        outer_clearance_mm=outer_clearance_mm,
        floor_thickness_mm=floor_thickness_mm,
    )


def build_box_parametric(
    width_cells: int,
    depth_cells: int,
    height_mm: float = DEFAULT_BOX_HEIGHT_MM,
    grid_pitch_mm: float = GRID_PITCH_MM,
    wall_thickness_mm: float = DEFAULT_WALL_THICKNESS_MM,
    inner_floor_radius_mm: float = DEFAULT_INNER_FLOOR_RADIUS_MM,
    outer_clearance_mm: float = 0.0,
    floor_thickness_mm: float = DEFAULT_FLOOR_THICKNESS_MM,
) -> cq.Shape:
    _validate_cells(width_cells, depth_cells)
    if height_mm <= PICKUP_TOP_Z_MM + floor_thickness_mm + 1.0:
        raise ValueError(
            f"height_mm={height_mm} zu niedrig für Bodenaufnahme + Boden + Wand"
        )

    outer_w = width_cells * grid_pitch_mm - 2.0 * outer_clearance_mm
    outer_d = depth_cells * grid_pitch_mm - 2.0 * outer_clearance_mm
    if outer_w <= 0 or outer_d <= 0:
        raise ValueError("outer_clearance_mm ist zu groß für die gewählte Größe")
    body_z0 = PICKUP_TOP_Z_MM * (grid_pitch_mm / GRID_PITCH_MM)
    body_h = height_mm - body_z0

    outer = cq.Solid.makeBox(
        outer_w, outer_d, body_h, cq.Vector(0.0, 0.0, body_z0)
    )
    inner_w = outer_w - 2.0 * wall_thickness_mm
    inner_d = outer_d - 2.0 * wall_thickness_mm
    if inner_w <= 0 or inner_d <= 0:
        raise ValueError("Wandstärke > halber Kastengröße")
    cavity_z0 = body_z0 + floor_thickness_mm
    cavity_h = height_mm - cavity_z0
    # +0.001 mm oben, damit der Boolean-Schnitt topologisch sauber die Oberseite öffnet.
    cavity = cq.Solid.makeBox(
        inner_w, inner_d, cavity_h + 0.001,
        cq.Vector(wall_thickness_mm, wall_thickness_mm, cavity_z0),
    )
    max_inner_radius = max(0.0, min(inner_w, inner_d) / 2.0 - 0.01)
    fillet_radius = min(inner_floor_radius_mm, max_inner_radius)
    if fillet_radius > 1e-6:
        cavity = cq.Workplane(obj=cavity).edges("|Z").fillet(fillet_radius).val()
    hollow_body = outer.cut(cavity)

    pickup = features.pickup_template()
    if abs(grid_pitch_mm - GRID_PITCH_MM) > 1e-9:
        pickup = cq.Workplane(obj=pickup).scale(grid_pitch_mm / GRID_PITCH_MM).val()
    pickups = [
        pickup.translate((cx - outer_clearance_mm, cy - outer_clearance_mm, 0.0))
        for cx, cy in features.expected_pickup_positions_mm(
            width_cells,
            depth_cells,
            grid_pitch_mm=grid_pitch_mm,
        )
    ]
    if not pickups:
        return hollow_body.clean()
    return hollow_body.fuse(*pickups).clean()


def expected_outer_dimensions_mm(
    width_cells: int, depth_cells: int, height_mm: float = DEFAULT_BOX_HEIGHT_MM
) -> tuple[float, float, float]:
    return (
        width_cells * GRID_PITCH_MM,
        depth_cells * GRID_PITCH_MM,
        height_mm,
    )
