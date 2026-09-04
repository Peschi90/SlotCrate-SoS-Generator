"""FastAPI-Einstiegspunkt der SlotCrate CAD-API."""
from __future__ import annotations

from functools import lru_cache

from fastapi import Depends, FastAPI, Request, Response
from fastapi.responses import JSONResponse

from slotcrate.geometry.constants import (
    DEFAULT_BOX_HEIGHT_MM,
    DEFAULT_FLOOR_THICKNESS_MM,
    DEFAULT_WALL_THICKNESS_MM,
    GEOMETRY_VERSION,
    GRID_COLUMNS,
    GRID_PITCH_MM,
    GRID_ROWS,
    PICKUP_TOP_Z_MM,
)

from .cache import StlCache, cache_key
from .exporter import build_layout_zip, stl_bytes_for_box
from .schemas import (
    ActiveSettingsResponse,
    BoxRequest,
    LayoutGrid,
    LayoutRequest,
    MAX_CELLS,
    MAX_HEIGHT_MM,
    MIN_CELLS,
    MIN_HEIGHT_MM,
)
from .security import SlidingWindowRateLimiter, bearer_dependency, client_key
from .settings import load_settings


def create_app() -> FastAPI:
    settings = load_settings()
    cache = StlCache(settings.cache_dir)
    rate_limiter = SlidingWindowRateLimiter()
    require_bearer = bearer_dependency(settings.internal_token)

    app = FastAPI(title="SlotCrate CAD API", version="0.4.0")

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "geometryVersion": GEOMETRY_VERSION}

    @app.get("/v1/settings/active", response_model=ActiveSettingsResponse)
    def active_settings() -> ActiveSettingsResponse:
        return ActiveSettingsResponse(
            geometryVersion=GEOMETRY_VERSION,
            settingsVersion=settings.active_settings_version,
            grid=LayoutGrid(),
            box={
                "defaultHeightMm": DEFAULT_BOX_HEIGHT_MM,
                "wallThicknessMm": DEFAULT_WALL_THICKNESS_MM,
                "floorThicknessMm": DEFAULT_FLOOR_THICKNESS_MM,
                "pickupTopZMm": PICKUP_TOP_Z_MM,
            },
            limits={
                "minCells": float(MIN_CELLS),
                "maxCells": float(MAX_CELLS),
                "minHeightMm": MIN_HEIGHT_MM,
                "maxHeightMm": MAX_HEIGHT_MM,
            },
            filenamePrefix=settings.filename_prefix,
        )

    @app.post(
        "/v1/box/stl",
        dependencies=[Depends(require_bearer)],
        responses={200: {"content": {"model/stl": {}}}},
    )
    def box_stl(payload: BoxRequest, request: Request) -> Response:
        rate_limiter.check(
            "box_stl", client_key(request), settings.rate_limit_box_stl_per_minute
        )
        key = cache_key(
            payload.widthCells,
            payload.depthCells,
            payload.heightMm,
            payload.settingsVersion,
            payload.gridPitchMm,
            payload.wallThicknessMm,
            payload.innerFloorRadiusMm,
            payload.outerClearanceMm,
            payload.stlTessellationLinearMm,
            payload.stlTessellationAngularRad,
        )
        cached = cache.get(key)
        if cached is None:
            data = stl_bytes_for_box(
                payload.widthCells,
                payload.depthCells,
                payload.heightMm,
                grid_pitch_mm=payload.gridPitchMm,
                wall_thickness_mm=payload.wallThicknessMm,
                inner_floor_radius_mm=payload.innerFloorRadiusMm,
                outer_clearance_mm=payload.outerClearanceMm,
                stl_tessellation_linear_mm=payload.stlTessellationLinearMm,
                stl_tessellation_angular_rad=payload.stlTessellationAngularRad,
            )
            cache.store_bytes(key, data)
        else:
            data = cached.read_bytes()
        filename = (
            f"{settings.filename_prefix}_{payload.widthCells}x{payload.depthCells}"
            f"_H{payload.heightMm:g}.stl"
        )
        return Response(
            content=data,
            media_type="model/stl",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "X-SlotCrate-Cache-Key": key,
            },
        )

    @app.post(
        "/v1/layout/zip",
        dependencies=[Depends(require_bearer)],
        responses={200: {"content": {"application/zip": {}}}},
    )
    def layout_zip(payload: LayoutRequest, request: Request) -> Response:
        rate_limiter.check(
            "layout_zip", client_key(request), settings.rate_limit_layout_zip_per_minute
        )
        data = build_layout_zip(payload, settings.filename_prefix)
        return Response(
            content=data,
            media_type="application/zip",
            headers={"Content-Disposition": 'attachment; filename="slotcrate_layout.zip"'},
        )

    return app


app = create_app()
