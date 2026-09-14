"""Tests für runde Taschen (Becher/Rundwand, Boden = Kastenboden)."""
from __future__ import annotations

import pytest

from slotcrate.geometry.box import build_box, build_box_parametric
from slotcrate.geometry.constants import (
    BBOX_TOLERANCE_MM,
    DEFAULT_BOX_HEIGHT_MM,
    DEFAULT_WALL_THICKNESS_MM,
    GRID_PITCH_MM,
)
from slotcrate.geometry.reference import tight_dimensions

from _helpers import count_solids, is_valid_solid, volume_mm3


def _inner_span(n: int) -> float:
    return n * GRID_PITCH_MM - 2.0 * DEFAULT_WALL_THICKNESS_MM


def test_empty_pockets_matches_open_box() -> None:
    reference = build_box(2, 2)
    with_empty = build_box(2, 2, pockets=[])
    assert abs(volume_mm3(reference) - volume_mm3(with_empty)) < 1e-6


def test_single_pocket_valid_single_solid() -> None:
    inner = _inner_span(3)
    box = build_box_parametric(
        3, 3, pockets=[(inner / 2.0, inner / 2.0, 12.0, 15.0)]
    )
    assert count_solids(box) == 1
    assert is_valid_solid(box)


def test_pocket_center_out_of_range_rejected() -> None:
    inner = _inner_span(2)
    with pytest.raises(ValueError):
        build_box_parametric(2, 2, pockets=[(inner + 5.0, inner / 2.0, 8.0, 10.0)])


def test_pocket_diameter_unaffected_by_wall_thickness() -> None:
    """diameterMm ist der Innendurchmesser: bleibt gültig auch bei dicker Wand,
    die mit alten (Außendurchmesser-)Semantiken hier fehlgeschlagen wäre."""
    inner = _inner_span(3)
    box = build_box_parametric(
        3,
        3,
        wall_thickness_mm=4.0,
        pockets=[(inner / 2.0, inner / 2.0, 6.0, 10.0)],
    )
    assert is_valid_solid(box)


def test_pocket_position_respects_outer_footprint_margin() -> None:
    inner = _inner_span(2)
    wall = DEFAULT_WALL_THICKNESS_MM
    diameter = 10.0  # Innendurchmesser
    outer_radius = diameter / 2.0 + wall
    # Zu nah am Rand: Außenfuß (Innenradius + Wandstärke) würde den Kasten verlassen.
    with pytest.raises(ValueError):
        build_box_parametric(2, 2, pockets=[(outer_radius - 1.0, inner / 2.0, diameter, 10.0)])
    # Mit ausreichend Abstand ist dieselbe Tasche gültig.
    box = build_box_parametric(
        2, 2, pockets=[(round(outer_radius, 4), inner / 2.0, diameter, 10.0)]
    )
    assert is_valid_solid(box)


def test_pocket_height_clamped_to_cavity() -> None:
    inner = _inner_span(3)
    box = build_box_parametric(
        3, 3, pockets=[(inner / 2.0, inner / 2.0, 10.0, 500.0)]
    )
    assert is_valid_solid(box)
    _, _, z = tight_dimensions(box)
    assert abs(z - DEFAULT_BOX_HEIGHT_MM) <= BBOX_TOLERANCE_MM


def test_pocket_does_not_change_outer_bbox() -> None:
    inner_w = _inner_span(2)
    inner_d = _inner_span(3)
    box = build_box_parametric(
        2, 3, pockets=[(inner_w / 2.0, inner_d / 2.0, 10.0, 15.0)]
    )
    x, y, z = tight_dimensions(box)
    assert abs(x - 2 * GRID_PITCH_MM) <= BBOX_TOLERANCE_MM
    assert abs(y - 3 * GRID_PITCH_MM) <= BBOX_TOLERANCE_MM
    assert abs(z - DEFAULT_BOX_HEIGHT_MM) <= BBOX_TOLERANCE_MM


def test_multiple_pockets_in_grid_yield_single_solid() -> None:
    # 3×3-Kasten, Innenraum ~60,87 mm; ein 3×3-Raster mit ⌀ 15 mm passt.
    inner = _inner_span(3)
    diameter = 15.0
    r = diameter / 2.0
    positions = []
    for iy in range(3):
        for ix in range(3):
            cx = (inner - 3 * diameter) / 2 + r + ix * diameter
            cy = (inner - 3 * diameter) / 2 + r + iy * diameter
            positions.append((cx, cy, diameter, 10.0))
    box = build_box_parametric(3, 3, pockets=positions)
    assert count_solids(box) == 1
    assert is_valid_solid(box)


def test_pocket_combined_with_divider() -> None:
    inner = _inner_span(3)
    box = build_box_parametric(
        3,
        3,
        dividers=[("x", inner / 2.0, 20.0)],
        pockets=[(inner / 4.0, inner / 2.0, 8.0, 12.0)],
    )
    assert count_solids(box) == 1
    assert is_valid_solid(box)


def test_pocket_fill_outer_mode_yields_valid_solid() -> None:
    inner = _inner_span(3)
    diameter = 15.0
    r = diameter / 2.0
    positions = []
    for iy in range(3):
        for ix in range(3):
            cx = (inner - 3 * diameter) / 2 + r + ix * diameter
            cy = (inner - 3 * diameter) / 2 + r + iy * diameter
            positions.append((cx, cy, diameter, 12.0))
    filled = build_box_parametric(3, 3, pockets=positions, pockets_fill_outer=True)
    framed = build_box_parametric(3, 3, pockets=positions, pockets_fill_outer=False)
    assert count_solids(filled) == 1
    assert is_valid_solid(filled)
    # Fill-Modus füllt die Zwischenräume massiv → deutlich mehr Volumen.
    assert volume_mm3(filled) > volume_mm3(framed) + 500.0


def test_pocket_fill_outer_ignored_when_no_pockets() -> None:
    plain = build_box(2, 2)
    with_flag = build_box(2, 2, pockets=[], pockets_fill_outer=True)
    assert abs(volume_mm3(plain) - volume_mm3(with_flag)) < 1e-6
