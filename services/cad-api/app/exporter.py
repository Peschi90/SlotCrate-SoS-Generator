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
from slotcrate.geometry.reference import load_normalized_plate_from_step_file

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
            load_normalized_plate_from_step_file(layout.plateStepFile),
            stl_tessellation_linear_mm=layout.stlTessellationLinearMm,
            stl_tessellation_angular_rad=layout.stlTessellationAngularRad,
        )
        plate_step_stem = Path(layout.plateStepFile).stem
        plate_name = f"models/{layout.suitcaseVariantId}_Rasterplatte_{plate_step_stem}.stl"
        zf.writestr(plate_name, plate_stl)

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
        "======================",
        "",
        "Danke, dass du SlotCrate verwendest.",
        "Thank you for using SlotCrate.",
        "",
        "In diesem ZIP findest du alle Dateien, die zu deinem aktuellen Layout gehoeren.",
        "This ZIP contains all files for your current layout.",
        "",
        f"Enthaltene Kaesten (dedupliziert): {len(counter)}",
        f"Included box variants (deduplicated): {len(counter)}",
        f"Anzahl gesamt: {total}",
        f"Total quantity: {total}",
        "",
        "Dateien / Files",
        "---------------",
    ]
    for unique, count in sorted(counter.items(), key=lambda kv: (kv[0].width_cells, kv[0].depth_cells)):
        lines.append(f"  models/{unique.filename(filename_prefix)} - Anzahl / Quantity {count}")
    lines.append("  models/<variant>_Rasterplatte_<step-datei>.stl - 1x (aus Referenz-STEP / from reference STEP)")
    lines.append("")
    lines.append("DEUTSCH")
    lines.append("-------")
    lines.append("Die Rasterplatte ist als unveraenderte Referenz aus der gewaehlten STEP-Datei enthalten.")
    lines.append("Wenn du dein Setup teilen oder weitere Projekte entdecken moechtest, findest du hier alle wichtigen Links:")
    lines.append("SlotCrate Konfigurator: https://slotcrate.i3ull3t.de")
    lines.append("MakerWorld Profil: https://makerworld.com/de/@I3uLL3t")
    lines.append("FreeSlotter Diskussionsforum: https://www.freeslotter.de/index.php?thread/108860-slotcrate-3d-druck-slotkoffer/")
    lines.append("Hauptwebseite: https://i3ull3t.de")
    lines.append("Wenn du meine Arbeit unterstuetzen moechtest: https://www.paypal.com/paypalme/i3ull3t")
    lines.append("")
    lines.append("ENGLISH")
    lines.append("-------")
    lines.append("The grid plate is included as an unmodified reference generated from the selected STEP file.")
    lines.append("If you would like to share your setup or explore more of my work, here are the main links:")
    lines.append("SlotCrate configurator: https://slotcrate.i3ull3t.de")
    lines.append("MakerWorld profile: https://makerworld.com/de/@I3uLL3t")
    lines.append("FreeSlotter discussion forum: https://www.freeslotter.de/index.php?thread/108860-slotcrate-3d-druck-slotkoffer/")
    lines.append("Main website: https://i3ull3t.de")
    lines.append("If you would like to support my work: https://www.paypal.com/paypalme/i3ull3t")
    return "\n".join(lines)
