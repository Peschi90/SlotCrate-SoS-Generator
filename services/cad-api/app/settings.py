"""Konfiguration der CAD-API.

Werte kommen aus Umgebungsvariablen (siehe `.env.example`). Es werden
ausschließlich unkritische Defaults gesetzt; Secrets müssen extern kommen.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


REPO_ROOT: Path = Path(__file__).resolve().parents[3]
CAD_API_ROOT: Path = REPO_ROOT / "services" / "cad-api"
DEFAULT_CACHE_DIR: Path = CAD_API_ROOT / "cache"


def _int_env(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except ValueError:
        return default


@dataclass(frozen=True)
class ApiSettings:
    internal_token: str | None
    cache_dir: Path
    rate_limit_box_stl_per_minute: int
    rate_limit_layout_zip_per_minute: int
    rate_limit_plate_stl_per_minute: int
    filename_prefix: str
    active_settings_version: int


def load_settings() -> ApiSettings:
    return ApiSettings(
        internal_token=os.environ.get("CAD_API_INTERNAL_TOKEN") or None,
        cache_dir=Path(os.environ.get("CAD_API_CACHE_DIR", str(DEFAULT_CACHE_DIR))),
        rate_limit_box_stl_per_minute=_int_env("RATE_LIMIT_BOX_STL", 30),
        rate_limit_layout_zip_per_minute=_int_env("RATE_LIMIT_LAYOUT_ZIP", 10),
        rate_limit_plate_stl_per_minute=_int_env("RATE_LIMIT_PLATE_STL", 15),
        filename_prefix=os.environ.get("SLOTCRATE_FILENAME_PREFIX", "SlotCrate_Box"),
        active_settings_version=_int_env("SLOTCRATE_ACTIVE_SETTINGS_VERSION", 1),
    )
