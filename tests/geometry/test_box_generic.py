"""M3: Parametrische NxM-Kästen (1×1 und 2×2 kommen aus der Referenz)."""
from __future__ import annotations

import pytest

from slotcrate.geometry import features
from slotcrate.geometry.box import (
    build_box,
    build_box_parametric,
    expected_outer_dimensions_mm,
)
from slotcrate.geometry.constants import (
    BBOX_TOLERANCE_MM,
    DEFAULT_BOX_HEIGHT_MM,
    GRID_PITCH_MM,
    PICKUP_TOP_Z_MM,
)
from slotcrate.geometry.reference import tight_dimensions

from _helpers import count_solids, is_valid_solid, volume_mm3


# 2×3 = kleinster nicht-quadratischer, nicht-referenzierter Kasten.
# 3×3, 5×5 = mittlere Größen. 10×10 = worst case (100 Bodenaufnahmen).
PARAMETRIC_SIZES = [(1, 2), (2, 3), (3, 3), (5, 5), (10, 10)]


@pytest.mark.parametrize("n,m", PARAMETRIC_SIZES)
def test_parametric_box_bounding_box(n: int, m: int):
    box = build_box(n, m)
    x, y, z = tight_dimensions(box)
    ex, ey, ez = expected_outer_dimensions_mm(n, m)
    assert abs(x - ex) <= BBOX_TOLERANCE_MM, f"{n}x{m} X {x} vs {ex}"
    assert abs(y - ey) <= BBOX_TOLERANCE_MM, f"{n}x{m} Y {y} vs {ey}"
    assert abs(z - ez) <= BBOX_TOLERANCE_MM, f"{n}x{m} Z {z} vs {ez}"


@pytest.mark.parametrize("n,m", PARAMETRIC_SIZES)
def test_parametric_box_single_valid_solid(n: int, m: int):
    box = build_box(n, m)
    assert count_solids(box) == 1
    assert is_valid_solid(box)


@pytest.mark.parametrize("n,m", PARAMETRIC_SIZES)
def test_parametric_box_pickup_count(n: int, m: int):
    """Bei Z knapp unter PICKUP_TOP müssen genau N·M getrennte Solids
    entstehen. Damit ist strukturell nachgewiesen, dass jedes belegte
    Rasterfeld genau eine Bodenaufnahme trägt."""
    box = build_box(n, m)
    just_below_floor = PICKUP_TOP_Z_MM - 0.01
    below = features.slice_below(box, just_below_floor)
    assert len(features.solids(below)) == n * m


@pytest.mark.parametrize("n,m", PARAMETRIC_SIZES)
def test_parametric_pickup_size_unchanged(n: int, m: int):
    """Die Bodenaufnahmen skalieren nicht mit der Kastengröße."""
    box = build_box(n, m)
    just_below_floor = PICKUP_TOP_Z_MM - 0.01
    pickup_slices = features.solids(features.slice_below(box, just_below_floor))
    for p in pickup_slices:
        x, y, z = tight_dimensions(p)
        # Höhe = fast pickup_top - 0.01
        assert abs(z - (PICKUP_TOP_Z_MM - 0.01)) < 0.05
        # Grundriss unverändert (~18,49 mm)
        assert 18.4 <= x <= 18.6
        assert 18.4 <= y <= 18.6


def test_build_box_1x1_still_matches_reference():
    """Regression: 1×1 bleibt die Referenz, nicht die parametrische Fassung."""
    from slotcrate.geometry import reference

    box = build_box(1, 1)
    ref = reference.load_normalized_box_1x1()
    assert abs(volume_mm3(box) - volume_mm3(ref)) < 0.5


def test_parametric_box_can_use_custom_height():
    box = build_box_parametric(3, 3, height_mm=50.0)
    _, _, z = tight_dimensions(box)
    assert abs(z - 50.0) <= BBOX_TOLERANCE_MM
    assert count_solids(box) == 1


def test_parametric_box_rejects_out_of_range_cells():
    with pytest.raises(ValueError):
        build_box(0, 1)
    with pytest.raises(ValueError):
        build_box(1, 11)


def test_parametric_box_rejects_too_low_height():
    with pytest.raises(ValueError):
        build_box_parametric(2, 3, height_mm=5.0)
