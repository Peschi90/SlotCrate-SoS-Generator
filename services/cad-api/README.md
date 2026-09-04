# CAD-API (SlotCrate)

Python-Bibliothek und FastAPI-Dienst für die parametrische Erzeugung
der SlotCrate-Kästen.

## Aktueller Umfang (M1–M4)

- Normalisierung der Referenz-STEP-Dateien auf Z-nach-oben, Ursprung in der
  minimalen Bounding-Box-Ecke.
- `slotcrate.geometry.box.build_box(width_cells, depth_cells, height_mm)`:
  - 1×1 und 2×2 bei Standardhöhe → 1:1 aus Referenz.
  - Andere NxM → parametrische Schale + N·M unveränderte Bodenaufnahmen
    (`features.pickup_template()` aus der 2×2-Referenz freigeschnitten).
- STL-Export mit definierter Tessellierungstoleranz.
- FastAPI-Endpunkte:
  - `GET  /health`
  - `GET  /v1/settings/active`
  - `POST /v1/box/stl` (Bearer-geschützt, Rate-Limit, SHA-256-Cache)
  - `POST /v1/layout/zip` (Bearer-geschützt, deduplizierte STLs +
    `configuration.json` + `parts-list.csv` + `README.txt`)

## Lokal starten

```powershell
.\.venv-cad\Scripts\python.exe -m pip install -r services\cad-api\requirements.txt
$env:PYTHONPATH = "services/cad-api"
$env:CAD_API_INTERNAL_TOKEN = "dev-only"
.\.venv-cad\Scripts\python.exe -m uvicorn app.main:app --app-dir services\cad-api --reload --port 6294
```

## Tests

```powershell
.\.venv-cad\Scripts\python.exe -m pytest tests -q
```

Die Tests laden die Referenz-STEP-Dateien read-only. `reference/` wird nie
geschrieben.
