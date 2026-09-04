"""STL-Export mit definierter Tessellierungstoleranz."""
from __future__ import annotations

from pathlib import Path

import cadquery as cq


def export_stl(
    shape: cq.Shape,
    path: str | Path,
    linear_tolerance_mm: float = 0.05,
    angular_tolerance_rad: float = 0.5,
) -> Path:
    out = Path(path)
    out.parent.mkdir(parents=True, exist_ok=True)
    cq.exporters.export(
        shape,
        str(out),
        exportType="STL",
        tolerance=linear_tolerance_mm,
        angularTolerance=angular_tolerance_rad,
    )
    return out
