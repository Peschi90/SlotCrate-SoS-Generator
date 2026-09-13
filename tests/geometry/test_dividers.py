"""Tests für Unterteilungsstege (freie mm-Position, Dicke = Wandstärke)."""
from __future__ import annotations

import pytest

from slotcrate.geometry.box import build_box, build_box_parametric
from slotcrate.geometry.constants import (
    BBOX_TOLERANCE_MM,
    DEFAULT_BOX_HEIGHT_MM,
    DEFAULT_WALL_THICKNESS_MM,
    GRID_PITCH_MM,
    PICKUP_TOP_Z_MM,
    DEFAULT_FLOOR_THICKNESS_MM,
)
from slotcrate.geometry.reference import tight_dimensions

from _helpers import count_solids, is_valid_solid, volume_mm3


def _inner_width(n: int) -> float:
    return n * GRID_PITCH_MM - 2.0 * DEFAULT_WALL_THICKNESS_MM


def test_empty_dividers_matches_open_box() -> None:
    """Leere Dividerliste ändert die Geometrie nicht (Referenz-Cache erhalten)."""
    reference = build_box(2, 2)
    with_empty = build_box(2, 2, dividers=[])
    assert abs(volume_mm3(reference) - volume_mm3(with_empty)) < 1e-6


def test_single_x_divider_produces_valid_solid() -> None:
    inner_w = _inner_width(3)
    box = build_box_parametric(3, 3, dividers=[("x", inner_w / 2.0, 20.0)])
    assert count_solids(box) == 1
    assert is_valid_solid(box)


def test_two_orthogonal_dividers_produce_valid_solid() -> None:
    inner_w = _inner_width(3)
    inner_d = _inner_width(3)
    box = build_box_parametric(
        3,
        3,
        dividers=[
            ("x", inner_w / 2.0, DEFAULT_BOX_HEIGHT_MM - PICKUP_TOP_Z_MM - DEFAULT_FLOOR_THICKNESS_MM),
            ("y", inner_d / 2.0, DEFAULT_BOX_HEIGHT_MM - PICKUP_TOP_Z_MM - DEFAULT_FLOOR_THICKNESS_MM),
        ],
    )
    assert count_solids(box) == 1
    assert is_valid_solid(box)


def test_divider_does_not_change_outer_bbox() -> None:
    inner_w = _inner_width(2)
    box = build_box_parametric(2, 3, dividers=[("x", inner_w / 2.0, 10.0)])
    x, y, z = tight_dimensions(box)
    assert abs(x - 2 * GRID_PITCH_MM) <= BBOX_TOLERANCE_MM
    assert abs(y - 3 * GRID_PITCH_MM) <= BBOX_TOLERANCE_MM
    assert abs(z - DEFAULT_BOX_HEIGHT_MM) <= BBOX_TOLERANCE_MM


def test_divider_increases_volume_over_open_box() -> None:
    inner_w = _inner_width(3)
    open_box = build_box_parametric(3, 3)
    with_divider = build_box_parametric(3, 3, dividers=[("x", inner_w / 2.0, 20.0)])
    assert volume_mm3(with_divider) > volume_mm3(open_box)


def test_divider_offset_out_of_range_is_rejected() -> None:
    inner_w = _inner_width(2)
    # Offset zu weit rechts (jenseits Innenraum minus halbe Wandstärke).
    with pytest.raises(ValueError):
        build_box_parametric(2, 2, dividers=[("x", inner_w + 10.0, 10.0)])
    # Offset an der Innenwand (unterhalb halbe Wandstärke).
    with pytest.raises(ValueError):
        build_box_parametric(2, 2, dividers=[("x", 0.05, 10.0)])


def test_divider_unknown_axis_is_rejected() -> None:
    with pytest.raises(ValueError):
        build_box_parametric(2, 2, dividers=[("z", 10.0, 10.0)])  # type: ignore[list-item]


def test_divider_height_clamped_to_cavity() -> None:
    """Überhöhter Steg wird auf Innenraumhöhe gedeckelt, Box bleibt valide."""
    inner_w = _inner_width(3)
    box = build_box_parametric(3, 3, dividers=[("y", inner_w / 2.0, 500.0)])
    assert is_valid_solid(box)
    _, _, z = tight_dimensions(box)
    assert abs(z - DEFAULT_BOX_HEIGHT_MM) <= BBOX_TOLERANCE_MM
