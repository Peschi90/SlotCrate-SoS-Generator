"""Feature-Extraktion aus den Referenz-STEP-Dateien.

Kernidee: Der Kastenkörper und die Bodenaufnahmen werden durch einen
horizontalen Schnitt (`floor_top_z`) getrennt. Die Bodenaufnahmen bleiben
danach als eigenständige Solids erhalten und werden für NxM-Kästen (M3)
unverändert wiederverwendet.

`reference/` wird ausschließlich gelesen.
"""
from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

import cadquery as cq

from OCP.BRepAdaptor import BRepAdaptor_Surface
from OCP.BRepGProp import BRepGProp
from OCP.GeomAbs import GeomAbs_SurfaceType
from OCP.GProp import GProp_GProps
from OCP.TopAbs import TopAbs_FACE, TopAbs_SOLID
from OCP.TopExp import TopExp_Explorer
from OCP.TopoDS import TopoDS

from . import reference
from .constants import GRID_PITCH_MM, PICKUP_TOP_Z_MM
from .reference import tight_bbox, tight_dimensions, volume_mm3


# ---------------------------------------------------------------------------
# Elementare Helfer
# ---------------------------------------------------------------------------


def iter_solids(shape: cq.Shape):
    exp = TopExp_Explorer(shape.wrapped, TopAbs_SOLID)
    while exp.More():
        yield cq.Shape.cast(TopoDS.Solid_s(exp.Current()))
        exp.Next()


def iter_faces(shape: cq.Shape):
    exp = TopExp_Explorer(shape.wrapped, TopAbs_FACE)
    while exp.More():
        yield TopoDS.Face_s(exp.Current())
        exp.Next()


def solids(shape: cq.Shape) -> list[cq.Shape]:
    return list(iter_solids(shape))


def center_of_mass(shape: cq.Shape) -> tuple[float, float, float]:
    props = GProp_GProps()
    BRepGProp.VolumeProperties_s(shape.wrapped, props)
    c = props.CentreOfMass()
    return c.X(), c.Y(), c.Z()


def horizontal_planar_face_z_values(shape: cq.Shape, tol: float = 1e-3) -> list[float]:
    """Z-Koordinaten aller planen Flächen, deren Normale (nahezu) ±Z ist."""
    zs: list[float] = []
    for face in iter_faces(shape):
        ad = BRepAdaptor_Surface(face)
        if ad.GetType() != GeomAbs_SurfaceType.GeomAbs_Plane:
            continue
        direction = ad.Plane().Axis().Direction()
        if abs(direction.X()) > 0.02 or abs(direction.Y()) > 0.02:
            continue
        zs.append(ad.Plane().Location().Z())
    zs.sort()
    # Duplikate zusammenfassen
    merged: list[float] = []
    for z in zs:
        if not merged or abs(z - merged[-1]) > tol:
            merged.append(z)
    return merged


# ---------------------------------------------------------------------------
# Schneiden entlang einer horizontalen Ebene
# ---------------------------------------------------------------------------


def _half_space_box(z: float, above: bool, extent_mm: float = 1000.0) -> cq.Shape:
    if above:
        origin = cq.Vector(-extent_mm / 2, -extent_mm / 2, z)
        return cq.Solid.makeBox(extent_mm, extent_mm, extent_mm, origin)
    origin = cq.Vector(-extent_mm / 2, -extent_mm / 2, z - extent_mm)
    return cq.Solid.makeBox(extent_mm, extent_mm, extent_mm, origin)


def slice_below(shape: cq.Shape, z: float) -> cq.Shape:
    """Alle Volumenanteile mit Z ≤ `z`."""
    return shape.intersect(_half_space_box(z, above=False))


def slice_above(shape: cq.Shape, z: float) -> cq.Shape:
    """Alle Volumenanteile mit Z ≥ `z`."""
    return shape.intersect(_half_space_box(z, above=True))


# ---------------------------------------------------------------------------
# Bodenaufnahmen extrahieren
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class PickupDecomposition:
    """Ergebnis der Zerlegung eines Kastens in Aufsatz und Bodenaufnahmen."""

    floor_top_z_mm: float
    body_above_floor: cq.Shape
    pickup_solids: list[cq.Shape]

    @property
    def pickup_count(self) -> int:
        return len(self.pickup_solids)


def _detect_floor_top_z_for_multi_pickup(shape: cq.Shape, expected_pickup_count: int) -> float:
    """Größtes Z, bei dem `slice_below` genau `expected_pickup_count` **getrennte**
    Solids liefert. Voraussetzung: die Aufnahmen sind topologisch disjunkt
    (erfüllt für NxM mit N,M ≥ 2 wie im Referenz-2×2)."""
    _, _, zmin, _, _, zmax = tight_bbox(shape)
    upper_limit = zmin + (zmax - zmin) * 0.5
    candidates = [
        z for z in horizontal_planar_face_z_values(shape) if zmin + 0.5 < z < upper_limit
    ]
    if not candidates:
        raise RuntimeError("Keine horizontale Trennebene gefunden")
    best: float | None = None
    for z in candidates:
        below = slice_below(shape, z)
        if len(solids(below)) == expected_pickup_count and (best is None or z > best):
            best = z
    if best is None:
        raise RuntimeError(
            f"Keine Trennebene mit exakt {expected_pickup_count} Bodenaufnahmen "
            f"gefunden (Kandidaten: {candidates})"
        )
    return best


def decompose_multi_pickup(shape: cq.Shape, expected_pickup_count: int) -> PickupDecomposition:
    """Zerlegung nur für Kästen mit disjunkten Bodenaufnahmen (N ≥ 2 und M ≥ 2)."""
    if expected_pickup_count < 2:
        raise ValueError(
            "decompose_multi_pickup benötigt ≥ 2 disjunkte Aufnahmen. "
            "Für den 1×1-Fall ist die Aufnahme mit der Wand verbunden – "
            "verwende pickup_template() aus dem 2×2-Referenzsolid."
        )
    z = _detect_floor_top_z_for_multi_pickup(shape, expected_pickup_count)
    below = slice_below(shape, z)
    above = slice_above(shape, z)
    pickups = solids(below)
    if len(pickups) != expected_pickup_count:
        raise RuntimeError(
            f"Zerlegung ergab {len(pickups)} Bodenaufnahmen, erwartet {expected_pickup_count}"
        )
    return PickupDecomposition(
        floor_top_z_mm=z,
        body_above_floor=above,
        pickup_solids=pickups,
    )


@lru_cache(maxsize=1)
def decompose_2x2() -> PickupDecomposition:
    return decompose_multi_pickup(reference.load_normalized_box_2x2(), expected_pickup_count=4)


@lru_cache(maxsize=1)
def pickup_template() -> cq.Shape:
    """Referenz-Bodenaufnahme aus dem 2×2-Kasten freigeschnitten und auf
    (0, 0, 0) verschoben (Rastermittelpunkt X=Y=0, Aufnahme-Unterkante Z=0).

    Wird für die 1×1-Extraktion nicht verwendet, weil die Aufnahme dort mit
    der Wand des Kastens verbunden ist und sich nicht durch einen einzelnen
    horizontalen Schnitt isolieren lässt.
    """
    dec = decompose_2x2()
    p = dec.pickup_solids[0]
    cx, cy, _ = center_of_mass(p)
    _, _, zmin, _, _, _ = tight_bbox(p)
    return p.translate((-cx, -cy, -zmin))


def expected_pickup_positions_mm(
    width_cells: int,
    depth_cells: int,
    grid_pitch_mm: float = GRID_PITCH_MM,
) -> list[tuple[float, float]]:
    """Mittelpunkte aller Rasterfelder eines NxM-Kastens (relativ zur Ecke 0,0)."""
    positions: list[tuple[float, float]] = []
    for j in range(depth_cells):
        for i in range(width_cells):
            positions.append(((i + 0.5) * grid_pitch_mm, (j + 0.5) * grid_pitch_mm))
    return positions


__all__ = [
    "PickupDecomposition",
    "center_of_2x2",
    "decompose_multi_pickup",
    "decompose_2x2",
    "expected_pickup_positions_mm",
    "horizontal_planar_face_z_values",
    "iter_faces",
    "iter_solids",
    "pickup_template",
    "slice_above",
    "slice_below",
    "solids",
]
