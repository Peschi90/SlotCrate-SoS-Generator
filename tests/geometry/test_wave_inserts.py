"""Tests für Wannen-Einsätze (wellenförmige Rinnen für runde Werkzeuge)."""
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


def test_empty_wave_inserts_matches_open_box() -> None:
    reference = build_box(2, 2)
    with_empty = build_box(2, 2, wave_inserts=[])
    assert abs(volume_mm3(reference) - volume_mm3(with_empty)) < 1e-6


def test_single_wave_insert_valid_single_solid() -> None:
    inner = _inner_span(3)
    box = build_box_parametric(
        3, 3, wave_inserts=[("x", inner / 2.0, 20.0, 12.0, 3, 6.0)]
    )
    assert count_solids(box) == 1
    assert is_valid_solid(box)


def test_wave_insert_position_out_of_range_rejected() -> None:
    inner = _inner_span(2)
    with pytest.raises(ValueError):
        build_box_parametric(
            2, 2, wave_inserts=[("x", inner + 5.0, 20.0, 10.0, 1, 3.0)]
        )


def test_wave_insert_depth_exceeding_radius_rejected() -> None:
    inner = _inner_span(3)
    with pytest.raises(ValueError):
        build_box_parametric(
            3, 3, wave_inserts=[("x", inner / 2.0, 20.0, 10.0, 1, 10.0)]
        )


def test_wave_insert_depth_exceeding_cavity_rejected() -> None:
    inner = _inner_span(3)
    with pytest.raises(ValueError):
        build_box_parametric(
            3, 3, wave_inserts=[("x", inner / 2.0, 3.0, 10.0, 1, 4.0)]
        )


def test_wave_insert_height_clamped_to_cavity() -> None:
    inner = _inner_span(3)
    box = build_box_parametric(
        3, 3, wave_inserts=[("x", inner / 2.0, 500.0, 10.0, 1, 3.0)]
    )
    assert is_valid_solid(box)
    _, _, z = tight_dimensions(box)
    assert abs(z - DEFAULT_BOX_HEIGHT_MM) <= BBOX_TOLERANCE_MM


def test_wave_insert_does_not_change_outer_bbox() -> None:
    inner_w = _inner_span(2)
    box = build_box_parametric(
        2, 3, wave_inserts=[("x", inner_w / 2.0, 20.0, 10.0, 2, 3.0)]
    )
    x, y, z = tight_dimensions(box)
    assert abs(x - 2 * GRID_PITCH_MM) <= BBOX_TOLERANCE_MM
    assert abs(y - 3 * GRID_PITCH_MM) <= BBOX_TOLERANCE_MM
    assert abs(z - DEFAULT_BOX_HEIGHT_MM) <= BBOX_TOLERANCE_MM


def test_wave_insert_combined_with_divider_and_pocket() -> None:
    inner = _inner_span(4)
    box = build_box_parametric(
        4,
        4,
        dividers=[("x", inner / 2.0, 20.0)],
        pockets=[(inner / 4.0, inner / 4.0, 8.0, 12.0)],
        wave_inserts=[("y", inner / 4.0 * 3, 20.0, 10.0, 2, 3.0)],
    )
    assert count_solids(box) == 1
    assert is_valid_solid(box)


def test_wave_insert_axis_y() -> None:
    inner = _inner_span(3)
    box = build_box_parametric(
        3, 3, wave_inserts=[("y", inner / 2.0, 20.0, 12.0, 2, 5.0)]
    )
    assert count_solids(box) == 1
    assert is_valid_solid(box)
