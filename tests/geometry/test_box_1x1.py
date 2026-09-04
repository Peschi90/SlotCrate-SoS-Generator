"""M1: Parametrischer 1×1-Kasten muss die Referenz reproduzieren."""
from __future__ import annotations

from pathlib import Path

import pytest

from slotcrate.geometry import reference
from slotcrate.geometry.box import build_box, expected_outer_dimensions_mm
from slotcrate.geometry.constants import (
    BBOX_TOLERANCE_MM,
    DEFAULT_BOX_HEIGHT_MM,
    GRID_PITCH_MM,
    VOLUME_TOLERANCE_PCT,
)
from slotcrate.geometry.export import export_stl
from slotcrate.geometry.reference import tight_dimensions

from _helpers import (
    count_solids,
    is_valid_solid,
    symmetric_volume_difference_mm3,
    volume_mm3,
)


def test_build_box_1x1_bounding_box():
    box = build_box(1, 1)
    x, y, z = tight_dimensions(box)
    ex, ey, ez = expected_outer_dimensions_mm(1, 1)
    assert abs(x - ex) <= BBOX_TOLERANCE_MM
    assert abs(y - ey) <= BBOX_TOLERANCE_MM
    assert abs(z - ez) <= BBOX_TOLERANCE_MM


def test_build_box_1x1_is_single_valid_solid():
    box = build_box(1, 1)
    assert count_solids(box) == 1
    assert is_valid_solid(box)


def test_build_box_1x1_volume_matches_reference():
    box = build_box(1, 1)
    ref = reference.load_normalized_box_1x1()
    v_box = volume_mm3(box)
    v_ref = volume_mm3(ref)
    assert abs(v_box - v_ref) / v_ref * 100.0 <= VOLUME_TOLERANCE_PCT


def test_build_box_1x1_matches_reference_symmetric_difference():
    """Volumendifferenz A\\B und B\\A dürfen jeweils vernachlässigbar sein."""
    box = build_box(1, 1)
    ref = reference.load_normalized_box_1x1()
    d_ab, d_ba = symmetric_volume_difference_mm3(box, ref)
    # M1: build_box(1,1) IST die extrahierte Referenz → beide Differenzen ≈ 0.
    assert d_ab <= 0.5, f"generated \\ reference = {d_ab:.4f} mm³"
    assert d_ba <= 0.5, f"reference \\ generated = {d_ba:.4f} mm³"


def test_build_box_1x1_default_height_uses_default_constant():
    box_default = build_box(1, 1)
    box_explicit = build_box(1, 1, height_mm=DEFAULT_BOX_HEIGHT_MM)
    assert abs(volume_mm3(box_default) - volume_mm3(box_explicit)) <= 1e-6


def test_stl_export_writes_file(tmp_path: Path):
    box = build_box(1, 1)
    out = export_stl(box, tmp_path / "SlotCrate_Box_1x1_H35.8.stl")
    assert out.is_file()
    assert out.stat().st_size > 1024


def test_build_box_grid_pitch_matches_reference():
    """Konsistenzcheck: 1×1-Außenmaß = eine Rasterteilung."""
    box = build_box(1, 1)
    x, y, _ = tight_dimensions(box)
    assert abs(x - GRID_PITCH_MM) <= BBOX_TOLERANCE_MM
    assert abs(y - GRID_PITCH_MM) <= BBOX_TOLERANCE_MM
