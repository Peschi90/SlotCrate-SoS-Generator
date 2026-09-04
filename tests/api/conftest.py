"""pytest-Konfiguration für die API-Contract-Tests."""
from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
CAD_API_ROOT = REPO_ROOT / "services" / "cad-api"

for path in (CAD_API_ROOT,):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))
