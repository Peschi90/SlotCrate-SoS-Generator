"""Tests für das personalisierbare Slotcar-Modul Cover."""
from __future__ import annotations

import pytest

from slotcrate.geometry.constants import (
    COVER_DEPTH_MM,
    COVER_HEIGHT_MM,
    COVER_WIDTH_MM,
)
from slotcrate.geometry.cover import build_cover_shape, load_cover_base, stl_bytes_for_cover
from slotcrate.geometry.reference import tight_dimensions, volume_mm3


def test_cover_base_dimensions() -> None:
    assert tight_dimensions(load_cover_base()) == pytest.approx((
        COVER_WIDTH_MM,
        COVER_DEPTH_MM,
        COVER_HEIGHT_MM,
    ), abs=1e-6)


def test_cover_text_groove_removes_material_without_changing_outer_size() -> None:
    base = load_cover_base()
    engraved = build_cover_shape("SlotCrate", 18.0, 58.0, 108.0, 12.0)

    assert tight_dimensions(engraved) == pytest.approx(tight_dimensions(base), abs=1e-6)
    assert volume_mm3(engraved) < volume_mm3(base)
    assert len(engraved.Solids()) == 1


def test_cover_stl_export() -> None:
    data = stl_bytes_for_cover("SOS", 16.0, 58.0, 108.0, font_name="Roboto Condensed")
    assert len(data) > 1000
    assert data.startswith(b"solid") or len(data) >= 84


def test_cover_inner_letter_contours_and_font_choice() -> None:
    base = load_cover_base()
    engraved = build_cover_shape("OeR", 24.0, 58.0, 108.0, font_name="Roboto Condensed")

    assert volume_mm3(engraved) < volume_mm3(base)
    assert len(engraved.Solids()) == 1