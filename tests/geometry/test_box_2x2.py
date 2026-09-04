"""M2: Bodenaufnahmen freischneiden und strukturell verifizieren."""
from __future__ import annotations

import math

import pytest

from slotcrate.geometry import features, reference
from slotcrate.geometry.constants import (
    BBOX_TOLERANCE_MM,
    DEFAULT_BOX_HEIGHT_MM,
    GRID_PITCH_MM,
    PICKUP_FOOTPRINT_MM,
    PICKUP_TOP_Z_MM,
    PICKUP_VOLUME_MM3,
    VOLUME_TOLERANCE_PCT,
)
from slotcrate.geometry.reference import tight_bbox, tight_dimensions

from _helpers import (
    count_solids,
    is_valid_solid,
    symmetric_volume_difference_mm3,
    volume_mm3,
)


# ---------------------------------------------------------------------------
# build_box(2,2) reproduziert die Referenz (Identität)
# ---------------------------------------------------------------------------


def test_build_box_2x2_bounding_box():
    from slotcrate.geometry.box import build_box, expected_outer_dimensions_mm

    box = build_box(2, 2)
    x, y, z = tight_dimensions(box)
    ex, ey, ez = expected_outer_dimensions_mm(2, 2)
    assert abs(x - ex) <= BBOX_TOLERANCE_MM
    assert abs(y - ey) <= BBOX_TOLERANCE_MM
    assert abs(z - ez) <= BBOX_TOLERANCE_MM


def test_build_box_2x2_single_valid_solid():
    from slotcrate.geometry.box import build_box

    box = build_box(2, 2)
    assert count_solids(box) == 1
    assert is_valid_solid(box)


def test_build_box_2x2_volume_matches_reference():
    from slotcrate.geometry.box import build_box

    box = build_box(2, 2)
    ref = reference.load_normalized_box_2x2()
    v_box = volume_mm3(box)
    v_ref = volume_mm3(ref)
    assert abs(v_box - v_ref) / v_ref * 100.0 <= VOLUME_TOLERANCE_PCT


def test_build_box_2x2_symmetric_diff_zero():
    from slotcrate.geometry.box import build_box

    box = build_box(2, 2)
    ref = reference.load_normalized_box_2x2()
    d_ab, d_ba = symmetric_volume_difference_mm3(box, ref)
    assert d_ab <= 0.5
    assert d_ba <= 0.5


# ---------------------------------------------------------------------------
# Feature-Extraktion: 2×2-Bodenaufnahmen freischneiden
# ---------------------------------------------------------------------------


def test_decompose_2x2_yields_exactly_four_pickups():
    dec = features.decompose_2x2()
    assert dec.pickup_count == 4
    assert math.isclose(dec.floor_top_z_mm, PICKUP_TOP_Z_MM, abs_tol=BBOX_TOLERANCE_MM)


def test_decompose_2x2_conserves_volume():
    dec = features.decompose_2x2()
    ref = reference.load_normalized_box_2x2()
    v_ref = volume_mm3(ref)
    v_split = volume_mm3(dec.body_above_floor) + sum(volume_mm3(p) for p in dec.pickup_solids)
    assert abs(v_split - v_ref) / v_ref * 100.0 <= VOLUME_TOLERANCE_PCT


def test_decompose_2x2_pickups_are_identical():
    """Alle vier Aufnahmen im 2×2 haben identische Maße und Volumen."""
    dec = features.decompose_2x2()
    volumes = [volume_mm3(p) for p in dec.pickup_solids]
    for v in volumes:
        assert abs(v - PICKUP_VOLUME_MM3) / PICKUP_VOLUME_MM3 * 100.0 <= 0.1
    assert max(volumes) - min(volumes) < 0.1
    for p in dec.pickup_solids:
        x, y, z = tight_dimensions(p)
        assert abs(x - PICKUP_FOOTPRINT_MM) <= BBOX_TOLERANCE_MM
        assert abs(y - PICKUP_FOOTPRINT_MM) <= BBOX_TOLERANCE_MM
        assert abs(z - PICKUP_TOP_Z_MM) <= BBOX_TOLERANCE_MM


def test_decompose_2x2_pickup_centers_lie_on_grid():
    dec = features.decompose_2x2()
    actual = sorted(
        (round(features.center_of_mass(p)[0], 3), round(features.center_of_mass(p)[1], 3))
        for p in dec.pickup_solids
    )
    expected = sorted(features.expected_pickup_positions_mm(2, 2))
    for (ax, ay), (ex, ey) in zip(actual, expected):
        assert abs(ax - ex) < 0.05
        assert abs(ay - ey) < 0.05


def test_pickup_template_is_grid_and_floor_centered():
    tmpl = features.pickup_template()
    cx, cy, _ = features.center_of_mass(tmpl)
    xmin, ymin, zmin, xmax, ymax, zmax = tight_bbox(tmpl)
    assert abs(cx) < 0.05
    assert abs(cy) < 0.05
    assert abs(zmin) < 1e-6
    assert abs((zmax - zmin) - PICKUP_TOP_Z_MM) <= BBOX_TOLERANCE_MM


# ---------------------------------------------------------------------------
# 1×1-Bodenaufnahme wird strukturell verifiziert (nicht topologisch trennbar)
# ---------------------------------------------------------------------------


def test_1x1_pickup_region_has_expected_face_signature():
    """Im Bereich Z ∈ [0, PICKUP_TOP_Z_MM] des 1×1-Kastens muss die
    Aufnahme-Geometrie vorhanden sein: Radien {2,50; 6,327} (aus M0-Analyse)
    tauchen auch im 1×1 auf. Damit ist strukturell belegt, dass die
    identische Bodenaufnahme im 1×1 verbaut ist – auch wenn sie topologisch
    mit der Wand verbunden und deshalb nicht als eigener Solid trennbar ist.
    """
    from slotcrate.geometry.constants import PICKUP_INNER_RADIUS_MM, PICKUP_OUTER_RADIUS_MM
    from OCP.BRepAdaptor import BRepAdaptor_Surface
    from OCP.GeomAbs import GeomAbs_SurfaceType

    ref = reference.load_normalized_box_1x1()
    radii: set[float] = set()
    for face in features.iter_faces(ref):
        ad = BRepAdaptor_Surface(face)
        if ad.GetType() == GeomAbs_SurfaceType.GeomAbs_Cylinder:
            radii.add(round(ad.Cylinder().Radius(), 3))
    assert any(abs(r - PICKUP_INNER_RADIUS_MM) <= 0.01 for r in radii), radii
    assert any(abs(r - PICKUP_OUTER_RADIUS_MM) <= 0.01 for r in radii), radii
