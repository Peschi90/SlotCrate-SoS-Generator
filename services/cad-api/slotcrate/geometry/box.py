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
from typing import Sequence, Tuple

import cadquery as cq

from . import features, reference
from .constants import (
    DEFAULT_BOX_HEIGHT_MM,
    DEFAULT_FLOOR_THICKNESS_MM,
    DEFAULT_INNER_FLOOR_RADIUS_MM,
    DEFAULT_WALL_THICKNESS_MM,
    GRID_PITCH_MM,
    MIN_DIVIDER_HEIGHT_MM,
    MIN_DIVIDER_OFFSET_MM,
    MIN_POCKET_DIAMETER_MM,
    MIN_POCKET_HEIGHT_MM,
    MIN_WAVE_GROOVE_DEPTH_MM,
    MIN_WAVE_GROOVE_DIAMETER_MM,
    MIN_WAVE_HEIGHT_MM,
    PICKUP_TOP_Z_MM,
)

# (axis, offset_mm, height_mm): axis ∈ {"x","y"}. Offset gemessen vom
# Innenraum-Ursprung (x=wall_thickness, y=wall_thickness).
Divider = Tuple[str, float, float]

# (center_x_mm, center_y_mm, diameter_mm, height_mm): Position vom
# Innenraum-Ursprung, Becherwand = wall_thickness.
Pocket = Tuple[float, float, float, float]

# (axis, offset_mm, height_mm, groove_diameter_mm, groove_count, groove_depth_mm):
# axis ∈ {"x","y"} wie bei Divider (Position/Dicke entlang dieser Achse,
# Spannweite über die volle Innentiefe/-breite). Rinnen laufen entlang der
# Spannweite, ihr Kreisbogen-Radius = groove_diameter_mm/2.
WaveInsert = Tuple[str, float, float, float, int, float]


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
    dividers: Sequence[Divider] = (),
    pockets: Sequence[Pocket] = (),
    pockets_fill_outer: bool = False,
    wave_inserts: Sequence[WaveInsert] = (),
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

    normalized_dividers = _normalize_dividers(dividers)
    normalized_pockets = _normalize_pockets(pockets)
    normalized_waves = _normalize_wave_inserts(wave_inserts)
    effective_fill = bool(pockets_fill_outer) and bool(normalized_pockets)

    if (
        _is_default_height(height_mm)
        and not normalized_dividers
        and not normalized_pockets
        and not normalized_waves
    ):
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
        normalized_dividers,
        normalized_pockets,
        effective_fill,
        normalized_waves,
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
    dividers: Tuple[Divider, ...],
    pockets: Tuple[Pocket, ...],
    pockets_fill_outer: bool,
    wave_inserts: Tuple[WaveInsert, ...],
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
        dividers=dividers,
        pockets=pockets,
        pockets_fill_outer=pockets_fill_outer,
        wave_inserts=wave_inserts,
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
    dividers: Sequence[Divider] = (),
    pockets: Sequence[Pocket] = (),
    pockets_fill_outer: bool = False,
    wave_inserts: Sequence[WaveInsert] = (),
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

    divider_solids = _build_divider_solids(
        _normalize_dividers(dividers),
        inner_w=inner_w,
        inner_d=inner_d,
        wall_thickness_mm=wall_thickness_mm,
        cavity_z0=cavity_z0,
        cavity_h=cavity_h,
    )
    if divider_solids:
        hollow_body = hollow_body.fuse(*divider_solids)

    normalized_pockets_tuple = _normalize_pockets(pockets)
    if pockets_fill_outer and normalized_pockets_tuple:
        hollow_body = _apply_pockets_fill_mode(
            hollow_body,
            normalized_pockets_tuple,
            inner_w=inner_w,
            inner_d=inner_d,
            wall_thickness_mm=wall_thickness_mm,
            cavity_z0=cavity_z0,
            cavity_h=cavity_h,
        )
    else:
        outer_cyls, inner_cyls = _build_pocket_solids(
            normalized_pockets_tuple,
            inner_w=inner_w,
            inner_d=inner_d,
            wall_thickness_mm=wall_thickness_mm,
            cavity_z0=cavity_z0,
            cavity_h=cavity_h,
        )
        if outer_cyls:
            hollow_body = hollow_body.fuse(*outer_cyls)
        if inner_cyls:
            hollow_body = hollow_body.cut(cq.Compound.makeCompound(inner_cyls))

    wave_solids = _build_wave_insert_solids(
        _normalize_wave_inserts(wave_inserts),
        inner_w=inner_w,
        inner_d=inner_d,
        wall_thickness_mm=wall_thickness_mm,
        cavity_z0=cavity_z0,
        cavity_h=cavity_h,
    )
    if wave_solids:
        hollow_body = hollow_body.fuse(*wave_solids)

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


def _normalize_dividers(dividers: Sequence[Divider]) -> Tuple[Divider, ...]:
    if not dividers:
        return ()
    normalized: list[Divider] = []
    for entry in dividers:
        axis, offset_mm, height_mm = entry
        if axis not in ("x", "y"):
            raise ValueError(f"divider.axis muss 'x' oder 'y' sein, war {axis!r}")
        normalized.append((axis, round(float(offset_mm), 4), round(float(height_mm), 4)))
    return tuple(sorted(normalized))


def _build_divider_solids(
    dividers: Tuple[Divider, ...],
    *,
    inner_w: float,
    inner_d: float,
    wall_thickness_mm: float,
    cavity_z0: float,
    cavity_h: float,
) -> list[cq.Solid]:
    if not dividers:
        return []
    half_t = wall_thickness_mm / 2.0
    solids: list[cq.Solid] = []
    for axis, offset_mm, height_mm in dividers:
        if height_mm < MIN_DIVIDER_HEIGHT_MM:
            raise ValueError(
                f"divider.heightMm={height_mm} unter Minimum {MIN_DIVIDER_HEIGHT_MM}"
            )
        if offset_mm < MIN_DIVIDER_OFFSET_MM:
            raise ValueError(
                f"divider.offsetMm={offset_mm} unter Minimum {MIN_DIVIDER_OFFSET_MM}"
            )
        eff_h = min(height_mm, cavity_h)
        if axis == "x":
            max_offset = inner_w - half_t
            if offset_mm < half_t or offset_mm > max_offset:
                raise ValueError(
                    f"divider.offsetMm={offset_mm} außerhalb Innenbreite [{half_t}, {max_offset}]"
                )
            x0 = wall_thickness_mm + offset_mm - half_t
            solids.append(
                cq.Solid.makeBox(
                    wall_thickness_mm, inner_d, eff_h,
                    cq.Vector(x0, wall_thickness_mm, cavity_z0),
                )
            )
        else:  # axis == "y"
            max_offset = inner_d - half_t
            if offset_mm < half_t or offset_mm > max_offset:
                raise ValueError(
                    f"divider.offsetMm={offset_mm} außerhalb Innentiefe [{half_t}, {max_offset}]"
                )
            y0 = wall_thickness_mm + offset_mm - half_t
            solids.append(
                cq.Solid.makeBox(
                    inner_w, wall_thickness_mm, eff_h,
                    cq.Vector(wall_thickness_mm, y0, cavity_z0),
                )
            )
    return solids


def _normalize_pockets(pockets: Sequence[Pocket]) -> Tuple[Pocket, ...]:
    if not pockets:
        return ()
    normalized: list[Pocket] = []
    for entry in pockets:
        cx, cy, diameter, height_mm = entry
        normalized.append(
            (
                round(float(cx), 4),
                round(float(cy), 4),
                round(float(diameter), 4),
                round(float(height_mm), 4),
            )
        )
    return tuple(sorted(normalized))


def _build_pocket_solids(
    pockets: Tuple[Pocket, ...],
    *,
    inner_w: float,
    inner_d: float,
    wall_thickness_mm: float,
    cavity_z0: float,
    cavity_h: float,
) -> tuple[list[cq.Solid], list[cq.Solid]]:
    if not pockets:
        return [], []
    outer_solids: list[cq.Solid] = []
    inner_solids: list[cq.Solid] = []
    for cx, cy, diameter, height_mm in pockets:
        if diameter < MIN_POCKET_DIAMETER_MM:
            raise ValueError(
                f"pocket.diameterMm={diameter} unter Minimum {MIN_POCKET_DIAMETER_MM}"
            )
        if height_mm < MIN_POCKET_HEIGHT_MM:
            raise ValueError(
                f"pocket.heightMm={height_mm} unter Minimum {MIN_POCKET_HEIGHT_MM}"
            )
        # diameterMm ist der Innendurchmesser (nutzbarer Raum); der Becher
        # wächst nach außen um die Wandstärke.
        inner_radius = diameter / 2.0
        radius = inner_radius + wall_thickness_mm
        if cx < radius or cx > inner_w - radius:
            raise ValueError(
                f"pocket.centerXMm={cx} außerhalb Innenbreite [{radius}, {inner_w - radius}]"
            )
        if cy < radius or cy > inner_d - radius:
            raise ValueError(
                f"pocket.centerYMm={cy} außerhalb Innentiefe [{radius}, {inner_d - radius}]"
            )
        eff_h = min(height_mm, cavity_h)
        origin = cq.Vector(
            wall_thickness_mm + cx,
            wall_thickness_mm + cy,
            cavity_z0,
        )
        outer_solids.append(cq.Solid.makeCylinder(radius, eff_h, origin))
        # Innenzylinder schließt oben mit 0,01 mm Überlauf, damit der Cut die Bechermündung sauber öffnet.
        inner_solids.append(
            cq.Solid.makeCylinder(inner_radius, eff_h + 0.01, origin)
        )
    return outer_solids, inner_solids


def _apply_pockets_fill_mode(
    hollow_body: cq.Shape,
    pockets: Tuple[Pocket, ...],
    *,
    inner_w: float,
    inner_d: float,
    wall_thickness_mm: float,
    cavity_z0: float,
    cavity_h: float,
) -> cq.Shape:
    """Fill-Modus: massive Innenplatte auf max. Taschenhöhe, danach uniforme Wells."""
    max_h = min(max(p[3] for p in pockets), cavity_h)
    inner_solids: list[cq.Solid] = []
    for cx, cy, diameter, _height in pockets:
        # diameterMm ist der Innendurchmesser; Fußabdruck reicht bis zur Wandstärke nach außen.
        inner_radius = diameter / 2.0
        radius = inner_radius + wall_thickness_mm
        if cx < radius or cx > inner_w - radius:
            raise ValueError(
                f"pocket.centerXMm={cx} außerhalb Innenbreite [{radius}, {inner_w - radius}]"
            )
        if cy < radius or cy > inner_d - radius:
            raise ValueError(
                f"pocket.centerYMm={cy} außerhalb Innentiefe [{radius}, {inner_d - radius}]"
            )
        origin = cq.Vector(
            wall_thickness_mm + cx,
            wall_thickness_mm + cy,
            cavity_z0,
        )
        inner_solids.append(
            cq.Solid.makeCylinder(inner_radius, max_h + 0.01, origin)
        )
    slab = cq.Solid.makeBox(
        inner_w, inner_d, max_h,
        cq.Vector(wall_thickness_mm, wall_thickness_mm, cavity_z0),
    )
    hollow_body = hollow_body.fuse(slab)
    if inner_solids:
        hollow_body = hollow_body.cut(cq.Compound.makeCompound(inner_solids))
    return hollow_body


def _normalize_wave_inserts(wave_inserts: Sequence[WaveInsert]) -> Tuple[WaveInsert, ...]:
    if not wave_inserts:
        return ()
    normalized: list[WaveInsert] = []
    for entry in wave_inserts:
        axis, offset_mm, height_mm, groove_diameter_mm, groove_count, groove_depth_mm = entry
        if axis not in ("x", "y"):
            raise ValueError(f"waveInsert.axis muss 'x' oder 'y' sein, war {axis!r}")
        normalized.append(
            (
                axis,
                round(float(offset_mm), 4),
                round(float(height_mm), 4),
                round(float(groove_diameter_mm), 4),
                int(groove_count),
                round(float(groove_depth_mm), 4),
            )
        )
    return tuple(sorted(normalized))


def _build_wave_insert_solids(
    wave_inserts: Tuple[WaveInsert, ...],
    *,
    inner_w: float,
    inner_d: float,
    wall_thickness_mm: float,
    cavity_z0: float,
    cavity_h: float,
) -> list[cq.Shape]:
    """Wannen-Einsatz: rechteckiger Sockel mit N parallelen Rinnen (Kreisbogen-
    Profil), damit runde Werkzeuge in einem festen Bogen liegen. `axis`
    folgt derselben Konvention wie bei Divider: Position/Dicke entlang dieser
    Achse, volle Spannweite über die jeweils andere Innenraum-Dimension."""
    if not wave_inserts:
        return []
    solids: list[cq.Shape] = []
    for axis, offset_mm, height_mm, groove_diameter_mm, groove_count, groove_depth_mm in wave_inserts:
        if height_mm < MIN_WAVE_HEIGHT_MM:
            raise ValueError(f"waveInsert.heightMm={height_mm} unter Minimum {MIN_WAVE_HEIGHT_MM}")
        if groove_diameter_mm < MIN_WAVE_GROOVE_DIAMETER_MM:
            raise ValueError(
                f"waveInsert.grooveDiameterMm={groove_diameter_mm} unter Minimum {MIN_WAVE_GROOVE_DIAMETER_MM}"
            )
        if groove_count < 1:
            raise ValueError(f"waveInsert.grooveCount={groove_count} muss >= 1 sein")
        groove_radius = groove_diameter_mm / 2.0
        if groove_depth_mm < MIN_WAVE_GROOVE_DEPTH_MM or groove_depth_mm > groove_radius:
            raise ValueError(
                f"waveInsert.grooveDepthMm={groove_depth_mm} außerhalb (0, {groove_radius}]"
            )
        eff_h = min(height_mm, cavity_h)
        if groove_depth_mm > eff_h:
            raise ValueError(
                f"waveInsert.grooveDepthMm={groove_depth_mm} > verfügbare Höhe {eff_h}"
            )
        block_span = groove_count * groove_diameter_mm
        half_span = block_span / 2.0

        if axis == "x":
            span_len = inner_d
            if offset_mm - half_span < 0 or offset_mm + half_span > inner_w:
                raise ValueError(
                    f"waveInsert.offsetMm={offset_mm} mit Breite {block_span} außerhalb "
                    f"Innenbreite [0, {inner_w}]"
                )
            block_x0 = wall_thickness_mm + offset_mm - half_span
            block = cq.Solid.makeBox(
                block_span, span_len, eff_h,
                cq.Vector(block_x0, wall_thickness_mm, cavity_z0),
            )
            groove_dir = cq.Vector(0.0, 1.0, 0.0)
            groove_len = span_len + 0.02
            groove_start_offset = -0.01
        else:  # axis == "y"
            span_len = inner_w
            if offset_mm - half_span < 0 or offset_mm + half_span > inner_d:
                raise ValueError(
                    f"waveInsert.offsetMm={offset_mm} mit Breite {block_span} außerhalb "
                    f"Innentiefe [0, {inner_d}]"
                )
            block_y0 = wall_thickness_mm + offset_mm - half_span
            block = cq.Solid.makeBox(
                span_len, block_span, eff_h,
                cq.Vector(wall_thickness_mm, block_y0, cavity_z0),
            )
            groove_dir = cq.Vector(1.0, 0.0, 0.0)
            groove_len = span_len + 0.02
            groove_start_offset = -0.01

        top_z = cavity_z0 + eff_h
        groove_center_z = top_z + (groove_radius - groove_depth_mm)
        grooves: list[cq.Solid] = []
        for i in range(groove_count):
            u = (offset_mm - half_span) + groove_radius + i * groove_diameter_mm
            if axis == "x":
                origin = cq.Vector(
                    wall_thickness_mm + u,
                    wall_thickness_mm + groove_start_offset,
                    groove_center_z,
                )
            else:
                origin = cq.Vector(
                    wall_thickness_mm + groove_start_offset,
                    wall_thickness_mm + u,
                    groove_center_z,
                )
            grooves.append(
                cq.Solid.makeCylinder(groove_radius, groove_len, origin, groove_dir)
            )
        notched = block.cut(cq.Compound.makeCompound(grooves))
        solids.append(notched)
    return solids


def expected_outer_dimensions_mm(
    width_cells: int, depth_cells: int, height_mm: float = DEFAULT_BOX_HEIGHT_MM
) -> tuple[float, float, float]:
    return (
        width_cells * GRID_PITCH_MM,
        depth_cells * GRID_PITCH_MM,
        height_mm,
    )
