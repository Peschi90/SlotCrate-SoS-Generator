"""Zugriff auf die unveränderlichen Referenz-STEP-Dateien.

Alle Funktionen laden ausschließlich lesend. `reference/` wird nie geschrieben,
verschoben oder skaliert.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
import re

import cadquery as cq

from OCP.Bnd import Bnd_Box
from OCP.BRepBndLib import BRepBndLib
from OCP.BRepGProp import BRepGProp
from OCP.GeomAbs import GeomAbs_Shape
from OCP.GProp import GProp_GProps
from OCP.TopAbs import TopAbs_SOLID
from OCP.TopExp import TopExp_Explorer

# services/cad-api/slotcrate/geometry/reference.py → parents[4] = repo root
REPO_ROOT: Path = Path(__file__).resolve().parents[4]
REFERENCE_DIR: Path = REPO_ROOT / "reference"

PLATE_STEP: Path = REFERENCE_DIR / "SlotCrate.step"
BOX_1X1_STEP: Path = REFERENCE_DIR / "SlotCrate_1x1.step"
BOX_2X2_STEP: Path = REFERENCE_DIR / "SlotCrate_2x2.step"
_SAFE_STEP_BASENAME = re.compile(r"^[A-Za-z0-9_.-]+\.(step|stp)$", re.IGNORECASE)


def _load_step(path: Path) -> cq.Shape:
    if not path.is_file():
        raise FileNotFoundError(f"Referenz-STEP fehlt: {path}")
    shape = cq.importers.importStep(str(path)).val()
    if not isinstance(shape, cq.Shape):
        raise RuntimeError(f"Konnte {path.name} nicht als cq.Shape laden")
    return shape


def _normalize_z_up(shape: cq.Shape) -> cq.Shape:
    """Rotiert das Shape so, dass die Y-Achse der Quelldatei zur +Z-Achse wird
    und verschiebt die minimale BBox-Ecke in den Ursprung.

    Rotation +90° um die X-Achse: (x, y, z) → (x, -z, y).
    Die Referenzdateien verwenden alle Y als Höhe (verifiziert in M0).
    """
    rotated = shape.rotate((0.0, 0.0, 0.0), (1.0, 0.0, 0.0), 90.0)
    xmin, ymin, zmin, _, _, _ = tight_bbox(rotated)
    return rotated.translate((-xmin, -ymin, -zmin))


def tight_bbox(shape: cq.Shape) -> tuple[float, float, float, float, float, float]:
    """Enge, achsen-ausgerichtete Bounding Box via BRepBndLib::AddOptimal.

    CadQuerys Standard-BoundingBox nutzt eine triangulationsbasierte, lockere
    BBox, die nach Rotationen um bis zu ~0.1 mm inflatieren kann. Für die
    Referenz­vergleiche brauchen wir einen exakten Wert.
    """
    box = Bnd_Box()
    BRepBndLib.AddOptimal_s(shape.wrapped, box, False, False)
    xmin, ymin, zmin, xmax, ymax, zmax = box.Get()
    return xmin, ymin, zmin, xmax, ymax, zmax


def tight_dimensions(shape: cq.Shape) -> tuple[float, float, float]:
    xmin, ymin, zmin, xmax, ymax, zmax = tight_bbox(shape)
    return xmax - xmin, ymax - ymin, zmax - zmin


@lru_cache(maxsize=1)
def load_normalized_plate() -> cq.Shape:
    return _normalize_z_up(_load_step(PLATE_STEP))


@lru_cache(maxsize=32)
def load_normalized_plate_from_step_file(step_file: str) -> cq.Shape:
    if not _SAFE_STEP_BASENAME.fullmatch(step_file):
        raise ValueError(f"Ungültiger STEP-Dateiname: {step_file}")
    step_path = (REFERENCE_DIR / step_file).resolve()
    if step_path.parent != REFERENCE_DIR.resolve():
        raise ValueError(f"STEP-Datei außerhalb reference/ ist nicht erlaubt: {step_file}")
    return _normalize_z_up(_load_step(step_path))


@lru_cache(maxsize=1)
def load_normalized_box_1x1() -> cq.Shape:
    return _normalize_z_up(_load_step(BOX_1X1_STEP))


@lru_cache(maxsize=1)
def load_normalized_box_2x2() -> cq.Shape:
    return _normalize_z_up(_load_step(BOX_2X2_STEP))


def volume_mm3(shape: cq.Shape) -> float:
    props = GProp_GProps()
    BRepGProp.VolumeProperties_s(shape.wrapped, props)
    return abs(props.Mass())


def count_solids(shape: cq.Shape) -> int:
    exp = TopExp_Explorer(shape.wrapped, TopAbs_SOLID)
    n = 0
    while exp.More():
        n += 1
        exp.Next()
    return n
