"""Gemeinsame Prüfhelfer für Geometrietests."""
from __future__ import annotations

import cadquery as cq

from OCP.BRepAlgoAPI import BRepAlgoAPI_Cut
from OCP.BRepCheck import BRepCheck_Analyzer

from slotcrate.geometry.reference import count_solids, volume_mm3


def is_valid_solid(shape: cq.Shape) -> bool:
    analyzer = BRepCheck_Analyzer(shape.wrapped)
    return bool(analyzer.IsValid())


def symmetric_volume_difference_mm3(a: cq.Shape, b: cq.Shape) -> tuple[float, float]:
    """Liefert (V(a \\ b), V(b \\ a)) über echte Boolean-Cut-Operationen."""
    a_minus_b = BRepAlgoAPI_Cut(a.wrapped, b.wrapped)
    a_minus_b.Build()
    b_minus_a = BRepAlgoAPI_Cut(b.wrapped, a.wrapped)
    b_minus_a.Build()
    v1 = volume_mm3(cq.Shape.cast(a_minus_b.Shape()))
    v2 = volume_mm3(cq.Shape.cast(b_minus_a.Shape()))
    return v1, v2


__all__ = [
    "count_solids",
    "is_valid_solid",
    "symmetric_volume_difference_mm3",
    "volume_mm3",
]
