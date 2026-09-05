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
SAFE_STEP_FILE_RE = re.compile(r"^[A-Za-z0-9_.-]+\.(step|stp)$", re.IGNORECASE)


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


class LayoutBox(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    x: Annotated[int, Field(ge=0, le=MAX_CELLS - 1)]
    y: Annotated[int, Field(ge=0, le=MAX_CELLS - 1)]
    widthCells: Annotated[int, Field(ge=MIN_CELLS, le=MAX_CELLS)]
    depthCells: Annotated[int, Field(ge=MIN_CELLS, le=MAX_CELLS)]
    heightMm: Annotated[float, Field(ge=MIN_HEIGHT_MM, le=MAX_HEIGHT_MM)] = DEFAULT_BOX_HEIGHT_MM


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
