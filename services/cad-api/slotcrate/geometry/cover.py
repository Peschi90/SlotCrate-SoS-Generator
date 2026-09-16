"""Personalisierbares Slotcar-Modul Cover mit vertiefter Textkontur."""
from __future__ import annotations

from functools import lru_cache

import cadquery as cq

from slotcrate.geometry.constants import (
    COVER_GROOVE_DEPTH_MM,
    COVER_GROOVE_WIDTH_MM,
    COVER_FONTS,
    COVER_STEP_FILE,
)
from slotcrate.geometry.export import shape_to_stl_bytes
from slotcrate.geometry.reference import REFERENCE_DIR, _load_step, tight_bbox

_CUTTER_OVERLAP_MM = 0.05


@lru_cache(maxsize=1)
def load_cover_base() -> cq.Shape:
    """Lädt das Cover mit glatter Vorderseite in der XY-Ebene bei maximalem Z."""
    shape = _load_step(REFERENCE_DIR / COVER_STEP_FILE)
    xmin, ymin, zmin, _, _, _ = tight_bbox(shape)
    return shape.translate((-xmin, -ymin, -zmin))


def _text_solid(
    text: str,
    font_size_mm: float,
    center_x_mm: float,
    center_y_mm: float,
    rotation_deg: float,
    font_name: str,
    height_mm: float,
) -> cq.Workplane:
    base = load_cover_base()
    _, _, _, _, _, zmax = tight_bbox(base)
    return (
        cq.Workplane("XY", origin=(center_x_mm, center_y_mm, zmax - COVER_GROOVE_DEPTH_MM))
        .transformed(rotate=(0.0, 0.0, rotation_deg))
        .text(
            text,
            font_size_mm,
            height_mm,
            combine=False,
            font=font_name,
            halign="center",
            valign="center",
        )
    )


def build_cover_shape(
    text: str,
    font_size_mm: float,
    center_x_mm: float,
    center_y_mm: float,
    rotation_deg: float = 0.0,
    font_name: str = COVER_FONTS[0],
) -> cq.Shape:
    """Schneidet ein 0,4 mm breites, 0,2 mm tiefes Konturband um den Text.

    CadQuery erhält dabei alle Text-Wires gemeinsam. Die Orientierung der
    verschachtelten Innen-Wires sorgt dafür, dass ihre Kontur beim positiven
    Offset nach innen läuft; dadurch bleiben Buchstabenlöcher wie bei O, P
    und e als echte Innenvertiefungen erhalten.
    """
    base = load_cover_base()
    cutter_height = COVER_GROOVE_DEPTH_MM + _CUTTER_OVERLAP_MM

    if font_name not in COVER_FONTS:
        raise ValueError(f"unsupported cover font: {font_name}")

    inner = _text_solid(
        text, font_size_mm, center_x_mm, center_y_mm, rotation_deg, font_name, cutter_height
    )
    bottom_wires = inner.faces("<Z").wires().vals()
    outer = (
        cq.Workplane("XY")
        .newObject(bottom_wires)
        .toPending()
        .offset2D(COVER_GROOVE_WIDTH_MM)
        .extrude(cutter_height, combine=False)
    )
    groove = outer.cut(inner)
    return base.cut(*groove.solids().vals())


def stl_bytes_for_cover(
    text: str,
    font_size_mm: float,
    center_x_mm: float,
    center_y_mm: float,
    rotation_deg: float = 0.0,
    font_name: str = COVER_FONTS[0],
    stl_tessellation_linear_mm: float = 0.05,
    stl_tessellation_angular_rad: float = 0.5,
) -> bytes:
    shape = build_cover_shape(
        text=text,
        font_size_mm=font_size_mm,
        center_x_mm=center_x_mm,
        center_y_mm=center_y_mm,
        rotation_deg=rotation_deg,
        font_name=font_name,
    )
    return shape_to_stl_bytes(
        shape,
        linear_deflection_mm=stl_tessellation_linear_mm,
        angular_deflection_rad=stl_tessellation_angular_rad,
    )