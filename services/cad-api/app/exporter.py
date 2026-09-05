"""Export-Bausteine: STL-Bytes, ZIP-Bundle, Stückliste, README."""
from __future__ import annotations

import csv
import io
import json
import tempfile
import zipfile
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

import cadquery as cq

from slotcrate.geometry.box import build_box
from slotcrate.geometry.export import export_stl
from slotcrate.geometry.reference import load_normalized_plate

from .schemas import LayoutRequest


@dataclass(frozen=True)
class UniqueBox:
    width_cells: int
    depth_cells: int
    height_mm: float

    def filename(self, prefix: str) -> str:
        h = f"{self.height_mm:g}"
        return f"{prefix}_{self.width_cells}x{self.depth_cells}_H{h}.stl"


def stl_bytes_for_box(
    width_cells: int,
    depth_cells: int,
    height_mm: float,
    grid_pitch_mm: float,
    wall_thickness_mm: float,
    inner_floor_radius_mm: float,
    outer_clearance_mm: float,
    stl_tessellation_linear_mm: float,
    stl_tessellation_angular_rad: float,
) -> bytes:
    shape = build_box(
        width_cells,
        depth_cells,
        height_mm,
        grid_pitch_mm=grid_pitch_mm,
        wall_thickness_mm=wall_thickness_mm,
        inner_floor_radius_mm=inner_floor_radius_mm,
        outer_clearance_mm=outer_clearance_mm,
    )
    return stl_bytes_for_shape(
        shape,
        stl_tessellation_linear_mm=stl_tessellation_linear_mm,
        stl_tessellation_angular_rad=stl_tessellation_angular_rad,
    )


def stl_bytes_for_shape(
    shape: cq.Shape,
    stl_tessellation_linear_mm: float,
    stl_tessellation_angular_rad: float,
) -> bytes:
    with tempfile.NamedTemporaryFile(suffix=".stl", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    try:
        export_stl(
            shape,
            tmp_path,
            linear_tolerance_mm=stl_tessellation_linear_mm,
            angular_tolerance_rad=stl_tessellation_angular_rad,
        )
        return tmp_path.read_bytes()
    finally:
        tmp_path.unlink(missing_ok=True)


def _unique_boxes(layout: LayoutRequest) -> Counter[UniqueBox]:
    counter: Counter[UniqueBox] = Counter()
    for b in layout.boxes:
        counter[UniqueBox(b.widthCells, b.depthCells, round(b.heightMm, 4))] += 1
    return counter


def build_layout_zip(layout: LayoutRequest, filename_prefix: str) -> bytes:
    counter = _unique_boxes(layout)
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for unique, count in counter.items():
            stl = stl_bytes_for_box(
                unique.width_cells,
                unique.depth_cells,
                unique.height_mm,
                grid_pitch_mm=layout.gridPitchMm,
                wall_thickness_mm=layout.wallThicknessMm,
                inner_floor_radius_mm=layout.innerFloorRadiusMm,
                outer_clearance_mm=layout.outerClearanceMm,
                stl_tessellation_linear_mm=layout.stlTessellationLinearMm,
                stl_tessellation_angular_rad=layout.stlTessellationAngularRad,
            )
            zf.writestr(f"models/{unique.filename(filename_prefix)}", stl)

        # Add the immutable reference plate from SlotCrate.step as STL.
        plate_stl = stl_bytes_for_shape(
            load_normalized_plate(),
            stl_tessellation_linear_mm=layout.stlTessellationLinearMm,
            stl_tessellation_angular_rad=layout.stlTessellationAngularRad,
        )
        zf.writestr("models/SlotCrate_Rasterplatte_Referenz.stl", plate_stl)

        zf.writestr("configuration.json", layout.model_dump_json(indent=2))
        zf.writestr("parts-list.csv", _parts_list_csv(counter, filename_prefix))
        zf.writestr("README.txt", _readme_text(counter, filename_prefix))
    return buffer.getvalue()


def _parts_list_csv(counter: Counter[UniqueBox], filename_prefix: str) -> str:
    out = io.StringIO()
    writer = csv.writer(out, lineterminator="\n")
    writer.writerow(["filename", "widthCells", "depthCells", "heightMm", "count"])
    for unique, count in sorted(counter.items(), key=lambda kv: (kv[0].width_cells, kv[0].depth_cells)):
        writer.writerow(
            [
                unique.filename(filename_prefix),
                unique.width_cells,
                unique.depth_cells,
                unique.height_mm,
                count,
            ]
        )
    return out.getvalue()


def _readme_text(counter: Counter[UniqueBox], filename_prefix: str) -> str:
    total = sum(counter.values())
    lines = [
        "SlotCrate Layout Export",
        "",
        f"Enthaltene Kästen (dedupliziert): {len(counter)}",
        f"Anzahl gesamt: {total}",
        "",
        "Dateien:",
    ]
    for unique, count in sorted(counter.items(), key=lambda kv: (kv[0].width_cells, kv[0].depth_cells)):
        lines.append(f"  models/{unique.filename(filename_prefix)} – Anzahl {count}")
    lines.append("  models/SlotCrate_Rasterplatte_Referenz.stl – 1x (aus SlotCrate.step)")
    lines.append("")
    lines.append("Die Rasterplatte ist als unveränderte Referenz aus SlotCrate.step enthalten.")
    return "\n".join(lines)
