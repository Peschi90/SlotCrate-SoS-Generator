"""STL-Export mit definierter Tessellierungstoleranz."""
from __future__ import annotations

import tempfile
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


def shape_to_stl_bytes(
    shape: cq.Shape,
    linear_deflection_mm: float = 0.05,
    angular_deflection_rad: float = 0.5,
) -> bytes:
    """Tesselliert ein Shape und liefert binäre STL-Daten."""
    with tempfile.NamedTemporaryFile(suffix=".stl", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    try:
        export_stl(
            shape,
            tmp_path,
            linear_tolerance_mm=linear_deflection_mm,
            angular_tolerance_rad=angular_deflection_rad,
        )
        return tmp_path.read_bytes()
    finally:
        tmp_path.unlink(missing_ok=True)

