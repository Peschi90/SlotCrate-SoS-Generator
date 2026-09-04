"""Gemeinsame pytest-Hilfen für die Geometrietests."""
from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
CAD_API_SRC = REPO_ROOT / "services" / "cad-api"

if str(CAD_API_SRC) not in sys.path:
    sys.path.insert(0, str(CAD_API_SRC))
