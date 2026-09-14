"""Server-seitige Validierung aller eingehenden Konfigurationsdaten.

Regel: keine Fremdfelder, harte Ober- und Untergrenzen, keine dynamischen
Ausdrücke im Payload. Die gleichen Schemata gelten für Einzelkasten- und
Layout-Anfragen.
"""
from __future__ import annotations

import re
from typing import Dict, List, Literal, Tuple
try:
    from typing import Annotated
except ImportError:  # Python 3.8 fallback
    from typing_extensions import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from slotcrate.geometry.constants import (
    DEFAULT_BOX_HEIGHT_MM,
    GEOMETRY_VERSION,
    GRID_COLUMNS,
    GRID_PITCH_MM,
    GRID_ROWS,
    INLAY_LEVEL1_MAX_CUTOUT_DIAMETER_MM,
    INLAY_LEVEL1_SHELF_X_MAX_MM,
    INLAY_LEVEL1_SHELF_X_MIN_MM,
    INLAY_LEVEL1_SHELF_Y_MAX_MM,
    INLAY_LEVEL1_SHELF_Y_MIN_MM,
    INLAY_LEVEL2_MAX_CUTOUT_DIAMETER_MM,
    INLAY_LEVEL2_SHELF_X_MAX_MM,
    INLAY_LEVEL2_SHELF_X_MIN_MM,
    INLAY_LEVEL2_SHELF_Y_MAX_MM,
    INLAY_LEVEL2_SHELF_Y_MIN_MM,
    INLAY_MAX_CUTOUT_DIAMETER_MM,
    INLAY_MAX_CUTOUTS_PER_LEVEL,
    INLAY_MIN_CUTOUT_DIAMETER_MM,
    INLAY_MIN_HOLE_SPACING_MM,
    INLAY_MIN_MARGIN_MM,
    INLAY_WIDTH_MM,
    INLAY_DEPTH_MM,
    MAX_DIVIDERS_PER_BOX,
    MAX_POCKET_DIAMETER_MM,
    MAX_POCKETS_PER_BOX,
    MIN_DIVIDER_HEIGHT_MM,
    MIN_DIVIDER_OFFSET_MM,
    MIN_POCKET_DIAMETER_MM,
    MIN_POCKET_HEIGHT_MM,
    MAX_WAVE_GROOVE_COUNT,
    MAX_WAVE_GROOVE_DIAMETER_MM,
    MAX_WAVE_INSERTS_PER_BOX,
    MIN_WAVE_GROOVE_COUNT,
    MIN_WAVE_GROOVE_DEPTH_MM,
    MIN_WAVE_GROOVE_DIAMETER_MM,
    MIN_WAVE_HEIGHT_MM,
    PICKUP_TOP_Z_MM,
)

MIN_CELLS: int = 1
MAX_CELLS: int = 10
MIN_HEIGHT_MM: float = PICKUP_TOP_Z_MM + 2.0  # sinnvolle Untergrenze mit Boden + Wand
MAX_HEIGHT_MM: float = 200.0
MIN_GRID_PITCH_MM: float = 15.0
MAX_GRID_PITCH_MM: float = 30.0
MIN_WALL_THICKNESS_MM: float = 0.6
MAX_WALL_THICKNESS_MM: float = 4.0
MIN_INNER_FLOOR_RADIUS_MM: float = 0.0
MAX_INNER_FLOOR_RADIUS_MM: float = 4.0
MIN_OUTER_CLEARANCE_MM: float = 0.0
MAX_OUTER_CLEARANCE_MM: float = 0.5
MIN_STL_LINEAR_MM: float = 0.005
MAX_STL_LINEAR_MM: float = 0.5
MIN_STL_ANGULAR_RAD: float = 0.05
MAX_STL_ANGULAR_RAD: float = 1.0
MAX_DIVIDER_OFFSET_MM: float = MAX_CELLS * MAX_GRID_PITCH_MM  # harte Payload-Obergrenze
MAX_POCKET_CENTER_MM: float = MAX_CELLS * MAX_GRID_PITCH_MM
MAX_WAVE_OFFSET_MM: float = MAX_CELLS * MAX_GRID_PITCH_MM
SAFE_STEP_FILE_RE = re.compile(r"^[A-Za-z0-9_.-]+\.(step|stp)$", re.IGNORECASE)


class DividerSpec(BaseModel):
    """Freistehender Trennsteg im Innenraum. Dicke = wallThicknessMm.

    ``axis`` beschreibt die Achse, an der ``offsetMm`` gemessen wird:
    ``"x"`` → Wand senkrecht zur X-Achse, spannt volle Innentiefe;
    ``"y"`` → Wand senkrecht zur Y-Achse, spannt volle Innenbreite.
    ``offsetMm`` wird vom Innenraum-Ursprung (Innenwand vorne links) gemessen.
    ``heightMm`` steigt vom Innenboden auf.
    """

    model_config = ConfigDict(extra="forbid")

    axis: Literal["x", "y"]
    offsetMm: Annotated[float, Field(ge=MIN_DIVIDER_OFFSET_MM, le=MAX_DIVIDER_OFFSET_MM)]
    heightMm: Annotated[float, Field(ge=MIN_DIVIDER_HEIGHT_MM, le=MAX_HEIGHT_MM)]


class PocketSpec(BaseModel):
    """Runde Tasche im Innenraum (Becher/Rundwand).

    Der Becher steht auf dem Innenboden. Wandstärke = ``wallThicknessMm``,
    Innenboden = Kastenboden. ``heightMm`` = Wandhöhe des Bechers.
    ``diameterMm`` ist der **Innendurchmesser** (nutzbarer Raum); der
    tatsächliche Außendurchmesser ergibt sich aus ``diameterMm + 2*wallThicknessMm``.
    ``centerXMm`` und ``centerYMm`` werden vom Innenraum-Ursprung gemessen.
    """

    model_config = ConfigDict(extra="forbid")

    centerXMm: Annotated[float, Field(ge=0.0, le=MAX_POCKET_CENTER_MM)]
    centerYMm: Annotated[float, Field(ge=0.0, le=MAX_POCKET_CENTER_MM)]
    diameterMm: Annotated[float, Field(ge=MIN_POCKET_DIAMETER_MM, le=MAX_POCKET_DIAMETER_MM)]
    heightMm: Annotated[float, Field(ge=MIN_POCKET_HEIGHT_MM, le=MAX_HEIGHT_MM)]


class WaveInsertSpec(BaseModel):
    """Wannen-Einsatz: rechteckiger Sockel mit N parallelen Rinnen
    (Kreisbogen-Profil), damit runde Werkzeuge in einem festen Bogen liegen.

    ``axis`` folgt der Divider-Konvention: Position/Breite des Sockels liegt
    entlang dieser Achse (``offsetMm`` = Sockelmitte), volle Spannweite über
    die jeweils andere Innenraum-Dimension. ``grooveDiameterMm`` bestimmt den
    Krümmungsradius je Rinne (sollte dem Werkzeugdurchmesser entsprechen),
    ``grooveDepthMm`` die Eintauchtiefe (≤ grooveDiameterMm/2).
    """

    model_config = ConfigDict(extra="forbid")

    axis: Literal["x", "y"]
    offsetMm: Annotated[float, Field(ge=0.0, le=MAX_WAVE_OFFSET_MM)]
    heightMm: Annotated[float, Field(ge=MIN_WAVE_HEIGHT_MM, le=MAX_HEIGHT_MM)]
    grooveDiameterMm: Annotated[
        float, Field(ge=MIN_WAVE_GROOVE_DIAMETER_MM, le=MAX_WAVE_GROOVE_DIAMETER_MM)
    ]
    grooveCount: Annotated[int, Field(ge=MIN_WAVE_GROOVE_COUNT, le=MAX_WAVE_GROOVE_COUNT)]
    grooveDepthMm: Annotated[float, Field(ge=MIN_WAVE_GROOVE_DEPTH_MM, le=MAX_WAVE_GROOVE_DIAMETER_MM)]


class BoxRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    widthCells: Annotated[int, Field(ge=MIN_CELLS, le=MAX_CELLS)]
    depthCells: Annotated[int, Field(ge=MIN_CELLS, le=MAX_CELLS)]
    heightMm: Annotated[float, Field(ge=MIN_HEIGHT_MM, le=MAX_HEIGHT_MM)] = DEFAULT_BOX_HEIGHT_MM
    settingsVersion: Annotated[int, Field(ge=1)] = 1
    gridPitchMm: Annotated[float, Field(ge=MIN_GRID_PITCH_MM, le=MAX_GRID_PITCH_MM)] = GRID_PITCH_MM
    wallThicknessMm: Annotated[float, Field(ge=MIN_WALL_THICKNESS_MM, le=MAX_WALL_THICKNESS_MM)] = 1.2
    innerFloorRadiusMm: Annotated[float, Field(ge=MIN_INNER_FLOOR_RADIUS_MM, le=MAX_INNER_FLOOR_RADIUS_MM)] = 2.5
    outerClearanceMm: Annotated[float, Field(ge=MIN_OUTER_CLEARANCE_MM, le=MAX_OUTER_CLEARANCE_MM)] = 0.0
    stlTessellationLinearMm: Annotated[float, Field(ge=MIN_STL_LINEAR_MM, le=MAX_STL_LINEAR_MM)] = 0.05
    stlTessellationAngularRad: Annotated[float, Field(ge=MIN_STL_ANGULAR_RAD, le=MAX_STL_ANGULAR_RAD)] = 0.5
    dividers: Annotated[List[DividerSpec], Field(max_length=MAX_DIVIDERS_PER_BOX)] = Field(default_factory=list)
    pockets: Annotated[List[PocketSpec], Field(max_length=MAX_POCKETS_PER_BOX)] = Field(default_factory=list)
    pocketsFillOuter: bool = False
    waveInserts: Annotated[List[WaveInsertSpec], Field(max_length=MAX_WAVE_INSERTS_PER_BOX)] = Field(
        default_factory=list
    )


class PlateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    plateStepFile: Annotated[str, Field(min_length=1, max_length=128)] = "SlotCrate.step"
    suitcaseVariantId: Annotated[str, Field(min_length=1, max_length=32)] = "sc-124-v2"
    settingsVersion: Annotated[int, Field(ge=1)] = 1
    stlTessellationLinearMm: Annotated[float, Field(ge=MIN_STL_LINEAR_MM, le=MAX_STL_LINEAR_MM)] = 0.05
    stlTessellationAngularRad: Annotated[float, Field(ge=MIN_STL_ANGULAR_RAD, le=MAX_STL_ANGULAR_RAD)] = 0.5

    @model_validator(mode="after")
    def _validate_names(self) -> "PlateRequest":
        if not SAFE_STEP_FILE_RE.fullmatch(self.plateStepFile):
            raise ValueError("plateStepFile muss ein sicherer Dateiname mit .step/.stp sein")
        if not re.fullmatch(r"^[a-z0-9-]+$", self.suitcaseVariantId):
            raise ValueError("suitcaseVariantId hat ein ungültiges Format")
        return self


class LayoutBox(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    x: Annotated[int, Field(ge=0, le=MAX_CELLS - 1)]
    y: Annotated[int, Field(ge=0, le=MAX_CELLS - 1)]
    widthCells: Annotated[int, Field(ge=MIN_CELLS, le=MAX_CELLS)]
    depthCells: Annotated[int, Field(ge=MIN_CELLS, le=MAX_CELLS)]
    heightMm: Annotated[float, Field(ge=MIN_HEIGHT_MM, le=MAX_HEIGHT_MM)] = DEFAULT_BOX_HEIGHT_MM
    dividers: Annotated[List[DividerSpec], Field(max_length=MAX_DIVIDERS_PER_BOX)] = Field(default_factory=list)
    pockets: Annotated[List[PocketSpec], Field(max_length=MAX_POCKETS_PER_BOX)] = Field(default_factory=list)
    pocketsFillOuter: bool = False
    waveInserts: Annotated[List[WaveInsertSpec], Field(max_length=MAX_WAVE_INSERTS_PER_BOX)] = Field(
        default_factory=list
    )


class LayoutGrid(BaseModel):
    model_config = ConfigDict(extra="forbid")

    columns: Literal[GRID_COLUMNS] = GRID_COLUMNS
    rows: Literal[GRID_ROWS] = GRID_ROWS
    pitch: float = Field(default=GRID_PITCH_MM)


class LayoutRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schemaVersion: Literal[1] = 1
    geometryVersion: Literal[GEOMETRY_VERSION] = GEOMETRY_VERSION
    settingsVersion: Annotated[int, Field(ge=1)] = 1
    suitcaseVariantId: Annotated[str, Field(min_length=1, max_length=32)] = "sc-124-v2"
    plateStepFile: Annotated[str, Field(min_length=1, max_length=128)] = "SlotCrate.step"
    gridPitchMm: Annotated[float, Field(ge=MIN_GRID_PITCH_MM, le=MAX_GRID_PITCH_MM)] = GRID_PITCH_MM
    wallThicknessMm: Annotated[float, Field(ge=MIN_WALL_THICKNESS_MM, le=MAX_WALL_THICKNESS_MM)] = 1.2
    innerFloorRadiusMm: Annotated[float, Field(ge=MIN_INNER_FLOOR_RADIUS_MM, le=MAX_INNER_FLOOR_RADIUS_MM)] = 2.5
    outerClearanceMm: Annotated[float, Field(ge=MIN_OUTER_CLEARANCE_MM, le=MAX_OUTER_CLEARANCE_MM)] = 0.0
    stlTessellationLinearMm: Annotated[float, Field(ge=MIN_STL_LINEAR_MM, le=MAX_STL_LINEAR_MM)] = 0.05
    stlTessellationAngularRad: Annotated[float, Field(ge=MIN_STL_ANGULAR_RAD, le=MAX_STL_ANGULAR_RAD)] = 0.5
    grid: LayoutGrid = LayoutGrid()
    boxes: List[LayoutBox]

    @model_validator(mode="after")
    def _boxes_stay_within_grid_and_do_not_overlap(self) -> "LayoutRequest":
        if abs(self.grid.pitch - self.gridPitchMm) > 1e-6:
            raise ValueError("grid.pitch muss gridPitchMm entsprechen")
        if not re.fullmatch(r"^[a-z0-9-]+$", self.suitcaseVariantId):
            raise ValueError("suitcaseVariantId hat ein ungültiges Format")
        if not SAFE_STEP_FILE_RE.fullmatch(self.plateStepFile):
            raise ValueError("plateStepFile muss ein sicherer Dateiname mit .step/.stp sein")
        occupied: Dict[Tuple[int, int], UUID] = {}
        for box in self.boxes:
            if box.x + box.widthCells > GRID_COLUMNS:
                raise ValueError(
                    f"Box {box.id} verlässt Raster in X-Richtung "
                    f"({box.x}+{box.widthCells} > {GRID_COLUMNS})"
                )
            if box.y + box.depthCells > GRID_ROWS:
                raise ValueError(
                    f"Box {box.id} verlässt Raster in Y-Richtung "
                    f"({box.y}+{box.depthCells} > {GRID_ROWS})"
                )
            for i in range(box.x, box.x + box.widthCells):
                for j in range(box.y, box.y + box.depthCells):
                    if (i, j) in occupied:
                        raise ValueError(
                            f"Box {box.id} überlappt mit Box {occupied[(i, j)]} in Zelle ({i},{j})"
                        )
                    occupied[(i, j)] = box.id
        return self


class ActiveSettingsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    geometryVersion: str
    settingsVersion: int
    grid: LayoutGrid
    box: Dict[str, float]
    limits: Dict[str, float]
    filenamePrefix: str


class InlayCutoutSpec(BaseModel):
    """Spezifikation einer zylindrischen Aussparung im Maintenance-Modul Einschub."""

    model_config = ConfigDict(extra="forbid")

    diameterMm: Annotated[
        float,
        Field(ge=INLAY_MIN_CUTOUT_DIAMETER_MM, le=INLAY_MAX_CUTOUT_DIAMETER_MM),
    ]
    centerXMm: Annotated[float, Field(ge=0.0, le=INLAY_WIDTH_MM)]
    centerYMm: Annotated[float, Field(ge=0.0, le=INLAY_DEPTH_MM)]


class InlayRequest(BaseModel):
    """Payload für die STL-Generierung des Maintenance-Modul Einschubs."""

    model_config = ConfigDict(extra="forbid")

    suitcaseVariantId: Annotated[str, Field(min_length=1, max_length=32)] = "sc-124-v2"
    settingsVersion: Annotated[int, Field(ge=1)] = 1
    stlTessellationLinearMm: Annotated[
        float, Field(ge=MIN_STL_LINEAR_MM, le=MAX_STL_LINEAR_MM)
    ] = 0.05
    stlTessellationAngularRad: Annotated[
        float, Field(ge=MIN_STL_ANGULAR_RAD, le=MAX_STL_ANGULAR_RAD)
    ] = 0.5
    level1Cutouts: Annotated[
        List[InlayCutoutSpec], Field(max_length=INLAY_MAX_CUTOUTS_PER_LEVEL)
    ] = Field(default_factory=list)
    level2Cutouts: Annotated[
        List[InlayCutoutSpec], Field(max_length=INLAY_MAX_CUTOUTS_PER_LEVEL)
    ] = Field(default_factory=list)

    @model_validator(mode="after")
    def _validate_inlay(self) -> "InlayRequest":
        if not re.fullmatch(r"^[a-z0-9-]+$", self.suitcaseVariantId):
            raise ValueError("suitcaseVariantId hat ein ungültiges Format")

        # Validiere Ebene 1 (unten, breiter: max. 42 mm)
        min_x1 = INLAY_LEVEL1_SHELF_X_MIN_MM + INLAY_MIN_MARGIN_MM
        max_x1 = INLAY_LEVEL1_SHELF_X_MAX_MM - INLAY_MIN_MARGIN_MM
        min_y1 = INLAY_LEVEL1_SHELF_Y_MIN_MM + INLAY_MIN_MARGIN_MM
        max_y1 = INLAY_LEVEL1_SHELF_Y_MAX_MM - INLAY_MIN_MARGIN_MM

        for c in self.level1Cutouts:
            if c.diameterMm > INLAY_LEVEL1_MAX_CUTOUT_DIAMETER_MM + 1e-4:
                raise ValueError(
                    f"Ebene 1: Aussparung ø{c.diameterMm} mm überschreitet Maximum von {INLAY_LEVEL1_MAX_CUTOUT_DIAMETER_MM} mm"
                )
            r = c.diameterMm / 2.0
            if c.centerXMm - r < min_x1 - 1e-4 or c.centerXMm + r > max_x1 + 1e-4:
                raise ValueError(
                    f"Ebene 1: Aussparung ø{c.diameterMm} mm bei X={c.centerXMm} unterschreitet Mindestrand von {INLAY_MIN_MARGIN_MM} mm"
                )
            if c.centerYMm - r < min_y1 - 1e-4 or c.centerYMm + r > max_y1 + 1e-4:
                raise ValueError(
                    f"Ebene 1: Aussparung ø{c.diameterMm} mm bei Y={c.centerYMm} unterschreitet Mindestrand von {INLAY_MIN_MARGIN_MM} mm"
                )

        # Validiere Ebene 2 (oben: max. 36.2 mm)
        min_x2 = INLAY_LEVEL2_SHELF_X_MIN_MM + INLAY_MIN_MARGIN_MM
        max_x2 = INLAY_LEVEL2_SHELF_X_MAX_MM - INLAY_MIN_MARGIN_MM
        min_y2 = INLAY_LEVEL2_SHELF_Y_MIN_MM + INLAY_MIN_MARGIN_MM
        max_y2 = INLAY_LEVEL2_SHELF_Y_MAX_MM - INLAY_MIN_MARGIN_MM

        for c in self.level2Cutouts:
            if c.diameterMm > INLAY_LEVEL2_MAX_CUTOUT_DIAMETER_MM + 1e-4:
                raise ValueError(
                    f"Ebene 2: Aussparung ø{c.diameterMm} mm überschreitet Maximum von {INLAY_LEVEL2_MAX_CUTOUT_DIAMETER_MM} mm"
                )
            r = c.diameterMm / 2.0
            if c.centerXMm - r < min_x2 - 1e-4 or c.centerXMm + r > max_x2 + 1e-4:
                raise ValueError(
                    f"Ebene 2: Aussparung ø{c.diameterMm} mm bei X={c.centerXMm} unterschreitet Mindestrand von {INLAY_MIN_MARGIN_MM} mm"
                )
            if c.centerYMm - r < min_y2 - 1e-4 or c.centerYMm + r > max_y2 + 1e-4:
                raise ValueError(
                    f"Ebene 2: Aussparung ø{c.diameterMm} mm bei Y={c.centerYMm} unterschreitet Mindestrand von {INLAY_MIN_MARGIN_MM} mm"
                )

        # Prüfe Mindestabstand zwischen Aussparungen auf Ebene 1 (mindestens 2,6 mm)
        for i in range(len(self.level1Cutouts)):
            for j in range(i + 1, len(self.level1Cutouts)):
                c1 = self.level1Cutouts[i]
                c2 = self.level1Cutouts[j]
                r1 = c1.diameterMm / 2.0
                r2 = c2.diameterMm / 2.0
                dist_centers = ((c1.centerXMm - c2.centerXMm) ** 2 + (c1.centerYMm - c2.centerYMm) ** 2) ** 0.5
                min_center_dist = r1 + r2 + INLAY_MIN_HOLE_SPACING_MM
                if dist_centers < min_center_dist - 1e-4:
                    spacing = dist_centers - (r1 + r2)
                    raise ValueError(
                        f"Ebene 1: Abstand zwischen Aussparung #{i+1} (ø{c1.diameterMm} mm) und "
                        f"#{j+1} (ø{c2.diameterMm} mm) beträgt {spacing:.2f} mm und unterschreitet den "
                        f"Mindestabstand von {INLAY_MIN_HOLE_SPACING_MM} mm"
                    )

        # Prüfe Mindestabstand zwischen Aussparungen auf Ebene 2 (mindestens 2,6 mm)
        for i in range(len(self.level2Cutouts)):
            for j in range(i + 1, len(self.level2Cutouts)):
                c1 = self.level2Cutouts[i]
                c2 = self.level2Cutouts[j]
                r1 = c1.diameterMm / 2.0
                r2 = c2.diameterMm / 2.0
                dist_centers = ((c1.centerXMm - c2.centerXMm) ** 2 + (c1.centerYMm - c2.centerYMm) ** 2) ** 0.5
                min_center_dist = r1 + r2 + INLAY_MIN_HOLE_SPACING_MM
                if dist_centers < min_center_dist - 1e-4:
                    spacing = dist_centers - (r1 + r2)
                    raise ValueError(
                        f"Ebene 2: Abstand zwischen Aussparung #{i+1} (ø{c1.diameterMm} mm) und "
                        f"#{j+1} (ø{c2.diameterMm} mm) beträgt {spacing:.2f} mm und unterschreitet den "
                        f"Mindestabstand von {INLAY_MIN_HOLE_SPACING_MM} mm"
                    )

        return self

