"""Tests für die Inlay-Geometrie des Maintenance-Moduls (SC_MM_Inlay)."""
from __future__ import annotations

import pytest

from slotcrate.geometry.constants import (
    INLAY_DEPTH_MM,
    INLAY_HEIGHT_MM,
    INLAY_WIDTH_MM,
)
from slotcrate.geometry.inlay import (
    REFERENCE_HOLES_LEVEL1,
    REFERENCE_HOLES_LEVEL2,
    build_inlay_shape,
    load_blank_inlay_base,
    stl_bytes_for_inlay,
)
from slotcrate.geometry.reference import tight_bbox, tight_dimensions, volume_mm3


def test_blank_inlay_base_dimensions():
    base = load_blank_inlay_base()
    dx, dy, dz = tight_dimensions(base)
    assert abs(dx - INLAY_WIDTH_MM) < 0.1
    assert abs(dy - INLAY_DEPTH_MM) < 0.1
    assert abs(dz - INLAY_HEIGHT_MM) < 0.1
    assert volume_mm3(base) > 150_000


def test_inlay_with_reference_cutouts():
    shape = build_inlay_shape(
        level1_cutouts=REFERENCE_HOLES_LEVEL1,
        level2_cutouts=REFERENCE_HOLES_LEVEL2,
    )
    dx, dy, dz = tight_dimensions(shape)
    assert abs(dx - INLAY_WIDTH_MM) < 0.1
    assert abs(dy - INLAY_DEPTH_MM) < 0.1
    assert abs(dz - INLAY_HEIGHT_MM) < 0.1
    # Das Shape mit Bohrungen muss weniger Volumen haben als der Rohling
    base = load_blank_inlay_base()
    assert volume_mm3(shape) < volume_mm3(base)


def test_inlay_with_custom_cutouts():
    custom_l1 = ((30.0, 28.7, 50.0), (20.0, 28.7, 120.0))
    custom_l2 = ((25.0, 28.7, 80.0),)
    shape = build_inlay_shape(level1_cutouts=custom_l1, level2_cutouts=custom_l2)
    dx, dy, dz = tight_dimensions(shape)
    assert abs(dx - INLAY_WIDTH_MM) < 0.1
    assert volume_mm3(shape) > 100_000


def test_inlay_stl_export():
    data = stl_bytes_for_inlay(
        level1_cutouts=REFERENCE_HOLES_LEVEL1[:2],
        level2_cutouts=REFERENCE_HOLES_LEVEL2[:2],
        stl_tessellation_linear_mm=0.1,
        stl_tessellation_angular_rad=0.5,
    )
    assert len(data) > 1000
    assert data.startswith(b"solid") or len(data) >= 84
