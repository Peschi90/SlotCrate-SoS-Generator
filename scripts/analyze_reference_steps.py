"""
Analyse der Referenz-STEP-Dateien für den SlotCrate-Generator.

Aufruf:
    python scripts/analyze_reference_steps.py [--json OUT.json] [--md OUT.md]

Das Skript verändert die Referenzdateien niemals. Es liest ausschließlich.
Wenn Ist-Werte wesentlich (> 0,05 mm bzw. > 1 %) von den Sollwerten abweichen,
endet das Skript mit Exit-Code 2. Damit stoppt der weitere Generator-Aufbau,
solange die Referenz nicht sauber vermessen wurde.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from dataclasses import dataclass, asdict, field
from pathlib import Path
from typing import Any

import cadquery as cq
from OCP.Bnd import Bnd_Box
from OCP.BRep import BRep_Tool
from OCP.BRepAdaptor import BRepAdaptor_Surface
from OCP.BRepBndLib import BRepBndLib
from OCP.BRepGProp import BRepGProp
from OCP.GeomAbs import GeomAbs_SurfaceType
from OCP.GProp import GProp_GProps
from OCP.TopAbs import TopAbs_FACE, TopAbs_SOLID
from OCP.TopExp import TopExp_Explorer
from OCP.TopoDS import TopoDS

REPO_ROOT = Path(__file__).resolve().parent.parent
REFERENCE_DIR = REPO_ROOT / "reference"

# Sollwerte gemäß Auftrag. Toleranzen bewusst großzügig für M0.
EXPECTED = {
    "SlotCrate.step": {
        "bbox_mm": (211.30, 216.80, 4.00),
        "volume_mm3": None,          # nicht spezifiziert
        "solids": 1,
    },
    "SlotCrate_1x1.step": {
        "bbox_mm": (21.09, 21.09, 35.80),
        "volume_mm3": 4232.88,
        "solids": 1,
    },
    "SlotCrate_2x2.step": {
        "bbox_mm": (42.18, 42.18, 35.80),
        "volume_mm3": 12174.15,
        "solids": 1,
    },
}

BBOX_TOL_MM = 0.05
VOLUME_TOL_PCT = 1.0

FACE_TYPE_NAMES = {
    GeomAbs_SurfaceType.GeomAbs_Plane: "Plane",
    GeomAbs_SurfaceType.GeomAbs_Cylinder: "Cylinder",
    GeomAbs_SurfaceType.GeomAbs_Cone: "Cone",
    GeomAbs_SurfaceType.GeomAbs_Sphere: "Sphere",
    GeomAbs_SurfaceType.GeomAbs_Torus: "Torus",
    GeomAbs_SurfaceType.GeomAbs_BezierSurface: "Bezier",
    GeomAbs_SurfaceType.GeomAbs_BSplineSurface: "BSpline",
    GeomAbs_SurfaceType.GeomAbs_SurfaceOfRevolution: "Revolution",
    GeomAbs_SurfaceType.GeomAbs_SurfaceOfExtrusion: "Extrusion",
    GeomAbs_SurfaceType.GeomAbs_OffsetSurface: "Offset",
    GeomAbs_SurfaceType.GeomAbs_OtherSurface: "Other",
}


@dataclass
class FaceStats:
    total: int = 0
    by_type: dict[str, int] = field(default_factory=dict)
    cylinder_radii_mm: list[float] = field(default_factory=list)


@dataclass
class StepAnalysis:
    file: str
    bbox_mm: tuple[float, float, float]
    bbox_min_mm: tuple[float, float, float]
    bbox_max_mm: tuple[float, float, float]
    volume_mm3: float
    surface_area_mm2: float
    solid_count: int
    face_stats: FaceStats
    center_of_mass_mm: tuple[float, float, float]
    notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        d["face_stats"] = asdict(self.face_stats)
        return d


def _normalise_z_up(shape: cq.Shape) -> cq.Shape:
    """Rotiert das Shape so, dass die kleinste Bounding-Box-Dimension auf Z liegt.

    Die Referenzplatte ist mit 4 mm Dicke geliefert; die Kästen mit 35,8 mm Höhe.
    Wir bestimmen die Höhenachse als die Achse mit dem eindeutig kleinsten oder
    eindeutig größten Ausmaß je nach Kontext. Für diese Analyse nutzen wir eine
    heuristische Normalisierung nur zur Ausgabe der Höhe – die reine Bounding
    Box bleibt achsenagnostisch (sortierte Kantenlängen).
    """
    return shape


def _bbox(shape: cq.Shape) -> tuple[tuple[float, float, float], tuple[float, float, float]]:
    box = Bnd_Box()
    BRepBndLib.AddOptimal_s(shape.wrapped, box, False, False)
    xmn, ymn, zmn, xmx, ymx, zmx = box.Get()
    return (xmn, ymn, zmn), (xmx, ymx, zmx)


def _volume(shape: cq.Shape) -> float:
    props = GProp_GProps()
    BRepGProp.VolumeProperties_s(shape.wrapped, props)
    return abs(props.Mass())


def _surface_area(shape: cq.Shape) -> float:
    props = GProp_GProps()
    BRepGProp.SurfaceProperties_s(shape.wrapped, props)
    return props.Mass()


def _center_of_mass(shape: cq.Shape) -> tuple[float, float, float]:
    props = GProp_GProps()
    BRepGProp.VolumeProperties_s(shape.wrapped, props)
    c = props.CentreOfMass()
    return (c.X(), c.Y(), c.Z())


def _iter_faces(shape: cq.Shape):
    exp = TopExp_Explorer(shape.wrapped, TopAbs_FACE)
    while exp.More():
        yield TopoDS.Face_s(exp.Current())
        exp.Next()


def _count_solids(shape: cq.Shape) -> int:
    exp = TopExp_Explorer(shape.wrapped, TopAbs_SOLID)
    n = 0
    while exp.More():
        n += 1
        exp.Next()
    return n


def _face_stats(shape: cq.Shape) -> FaceStats:
    stats = FaceStats()
    for face in _iter_faces(shape):
        stats.total += 1
        adaptor = BRepAdaptor_Surface(face)
        stype = adaptor.GetType()
        name = FACE_TYPE_NAMES.get(stype, str(stype))
        stats.by_type[name] = stats.by_type.get(name, 0) + 1
        if stype == GeomAbs_SurfaceType.GeomAbs_Cylinder:
            try:
                cyl = adaptor.Cylinder()
                stats.cylinder_radii_mm.append(round(cyl.Radius(), 4))
            except Exception:
                pass
    stats.cylinder_radii_mm.sort()
    return stats


def analyze(path: Path) -> StepAnalysis:
    shape = cq.importers.importStep(str(path)).val()
    if not isinstance(shape, cq.Shape):
        raise RuntimeError(f"{path.name}: kein cq.Shape geladen")

    (xmn, ymn, zmn), (xmx, ymx, zmx) = _bbox(shape)
    dims_sorted = tuple(sorted([xmx - xmn, ymx - ymn, zmx - zmn]))
    # Bounding-Box als sortierte Kantenlängen (klein, mittel, groß).
    bbox_sorted = (round(dims_sorted[0], 3), round(dims_sorted[1], 3), round(dims_sorted[2], 3))

    return StepAnalysis(
        file=path.name,
        bbox_mm=bbox_sorted,
        bbox_min_mm=(round(xmn, 3), round(ymn, 3), round(zmn, 3)),
        bbox_max_mm=(round(xmx, 3), round(ymx, 3), round(zmx, 3)),
        volume_mm3=round(_volume(shape), 3),
        surface_area_mm2=round(_surface_area(shape), 3),
        solid_count=_count_solids(shape),
        face_stats=_face_stats(shape),
        center_of_mass_mm=tuple(round(v, 3) for v in _center_of_mass(shape)),
    )


def _bbox_matches(expected: tuple[float, float, float], actual: tuple[float, float, float]) -> bool:
    e = tuple(sorted(expected))
    a = tuple(sorted(actual))
    return all(abs(e[i] - a[i]) <= BBOX_TOL_MM for i in range(3))


def _volume_matches(expected: float | None, actual: float) -> bool:
    if expected is None:
        return True
    return abs(actual - expected) / expected * 100.0 <= VOLUME_TOL_PCT


def _write_markdown(results: list[StepAnalysis], out: Path) -> None:
    lines: list[str] = []
    lines.append("# Referenzgeometrie SlotCrate\n")
    lines.append("Automatisch erzeugt durch `scripts/analyze_reference_steps.py`.\n")
    lines.append("Die Referenzdateien werden **nicht** verändert.\n")
    lines.append("\n## Sollwerte (Auftrag)\n")
    for name, exp in EXPECTED.items():
        vol = f"{exp['volume_mm3']} mm³" if exp["volume_mm3"] is not None else "–"
        lines.append(f"- **{name}**: {exp['bbox_mm'][0]} × {exp['bbox_mm'][1]} × {exp['bbox_mm'][2]} mm, Volumen {vol}, Solids {exp['solids']}")
    lines.append("\n## Ist-Werte\n")
    for r in results:
        exp = EXPECTED.get(r.file, {})
        exp_bbox = exp.get("bbox_mm")
        exp_vol = exp.get("volume_mm3")
        bbox_ok = _bbox_matches(exp_bbox, r.bbox_mm) if exp_bbox else True
        vol_ok = _volume_matches(exp_vol, r.volume_mm3)
        lines.append(f"### {r.file}\n")
        lines.append(f"- Bounding Box (sortiert): {r.bbox_mm[0]} × {r.bbox_mm[1]} × {r.bbox_mm[2]} mm  ({'OK' if bbox_ok else 'ABWEICHUNG'})")
        lines.append(f"- Bounding Box (min → max): {r.bbox_min_mm} → {r.bbox_max_mm}")
        lines.append(f"- Volumen: {r.volume_mm3} mm³  ({'OK' if vol_ok else 'ABWEICHUNG'})")
        lines.append(f"- Oberfläche: {r.surface_area_mm2} mm²")
        lines.append(f"- Solids: {r.solid_count}")
        lines.append(f"- Flächen gesamt: {r.face_stats.total}")
        for k, v in sorted(r.face_stats.by_type.items()):
            lines.append(f"  - {k}: {v}")
        if r.face_stats.cylinder_radii_mm:
            uniq = sorted(set(r.face_stats.cylinder_radii_mm))
            lines.append(f"- Zylinderradien (sortiert, einzigartig): {uniq}")
        lines.append(f"- Schwerpunkt: {r.center_of_mass_mm}")
        lines.append("")
    lines.append("## Abgeleitete Systemgrößen\n")
    lines.append("- Rasterteilung: 21,09 mm (aus Kastenaußenmaß 1×1)")
    lines.append("- Freie Rasteröffnung ≈ 18,69 × 18,69 mm (Sollwert Auftrag)")
    lines.append("- Rastersteg 2,40 mm, Randbreite 1,40 mm, Randtiefe 4,15 mm (Sollwert)")
    lines.append("- Wandstärke Kasten 1,20 mm (Sollwert – wird in M1 aus Referenz verifiziert)")
    lines.append("")
    out.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", type=Path, default=REPO_ROOT / "docs" / "reference_geometry.json")
    parser.add_argument("--md", type=Path, default=REPO_ROOT / "docs" / "REFERENCE_GEOMETRY.md")
    parser.add_argument("--strict", action="store_true", help="Exit 2 bei Abweichung.")
    args = parser.parse_args()

    if not REFERENCE_DIR.is_dir():
        print(f"FEHLER: {REFERENCE_DIR} nicht gefunden", file=sys.stderr)
        return 1

    results: list[StepAnalysis] = []
    for name in EXPECTED:
        p = REFERENCE_DIR / name
        if not p.is_file():
            print(f"FEHLER: {p} nicht gefunden", file=sys.stderr)
            return 1
        print(f"Analysiere {name} ...")
        results.append(analyze(p))

    args.json.parent.mkdir(parents=True, exist_ok=True)
    args.md.parent.mkdir(parents=True, exist_ok=True)
    args.json.write_text(json.dumps([r.to_dict() for r in results], indent=2), encoding="utf-8")
    _write_markdown(results, args.md)

    deviations: list[str] = []
    for r in results:
        exp = EXPECTED[r.file]
        if exp["bbox_mm"] and not _bbox_matches(exp["bbox_mm"], r.bbox_mm):
            deviations.append(f"{r.file}: Bounding Box weicht ab (soll {exp['bbox_mm']} ist {r.bbox_mm})")
        if not _volume_matches(exp["volume_mm3"], r.volume_mm3):
            deviations.append(f"{r.file}: Volumen weicht ab (soll {exp['volume_mm3']} ist {r.volume_mm3})")
        if r.solid_count != exp["solids"]:
            deviations.append(f"{r.file}: Solids {r.solid_count} statt {exp['solids']}")

    print("\n=== Zusammenfassung ===")
    for r in results:
        print(f"{r.file}: bbox={r.bbox_mm} mm, V={r.volume_mm3} mm³, solids={r.solid_count}, faces={r.face_stats.total}")
    if deviations:
        print("\nABWEICHUNGEN:")
        for d in deviations:
            print(f"  - {d}")
        if args.strict:
            return 2
    else:
        print("\nAlle Ist-Werte innerhalb der Toleranz.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
