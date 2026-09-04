"""M0/M1: Referenzgeometrie ist read-only und normalisierbar."""
from __future__ import annotations

import pytest

from slotcrate.geometry import reference
from slotcrate.geometry.constants import (
    BBOX_TOLERANCE_MM,
    DEFAULT_BOX_HEIGHT_MM,
    GRID_PITCH_MM,
    PLATE_OUTER_DEPTH_MM,
    PLATE_OUTER_WIDTH_MM,
    PLATE_THICKNESS_MM,
    VOLUME_TOLERANCE_PCT,
)
from slotcrate.geometry.reference import tight_bbox, tight_dimensions

from _helpers import count_solids, is_valid_solid, volume_mm3


REFERENCE_VOLUMES_MM3 = {
    "1x1": 4232.88,
    "2x2": 12174.15,
}


def _bbox_lengths(shape):
    return tight_dimensions(shape)


def test_normalized_plate_axes_and_thickness():
    plate = reference.load_normalized_plate()
    x, y, z = _bbox_lengths(plate)
    assert abs(x - PLATE_OUTER_WIDTH_MM) <= BBOX_TOLERANCE_MM
    assert abs(y - PLATE_OUTER_DEPTH_MM) <= BBOX_TOLERANCE_MM
    assert abs(z - PLATE_THICKNESS_MM) <= BBOX_TOLERANCE_MM
    assert count_solids(plate) == 1


def test_normalized_plate_origin_is_min_corner():
    plate = reference.load_normalized_plate()
    xmin, ymin, zmin, _, _, _ = tight_bbox(plate)
    assert abs(xmin) <= 1e-6
    assert abs(ymin) <= 1e-6
    assert abs(zmin) <= 1e-6


@pytest.mark.parametrize(
    "loader, expected_xy, expected_volume",
    [
        (reference.load_normalized_box_1x1, GRID_PITCH_MM, REFERENCE_VOLUMES_MM3["1x1"]),
        (reference.load_normalized_box_2x2, 2 * GRID_PITCH_MM, REFERENCE_VOLUMES_MM3["2x2"]),
    ],
)
def test_normalized_boxes_dimensions(loader, expected_xy, expected_volume):
    shape = loader()
    x, y, z = _bbox_lengths(shape)
    assert abs(x - expected_xy) <= BBOX_TOLERANCE_MM
    assert abs(y - expected_xy) <= BBOX_TOLERANCE_MM
    assert abs(z - DEFAULT_BOX_HEIGHT_MM) <= BBOX_TOLERANCE_MM
    assert count_solids(shape) == 1
    v = volume_mm3(shape)
    assert abs(v - expected_volume) / expected_volume * 100.0 <= VOLUME_TOLERANCE_PCT


def test_reference_solids_are_valid():
    for loader in (
        reference.load_normalized_plate,
        reference.load_normalized_box_1x1,
        reference.load_normalized_box_2x2,
    ):
        assert is_valid_solid(loader())
