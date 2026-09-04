# SlotCrate SoS Generator – Implementierungsplan

Dieser Plan folgt strikt der im Auftrag vorgegebenen Reihenfolge. Jede Stufe endet
mit einem überprüfbaren Ergebnis. Ohne bestandenen Meilenstein wird die nächste
Stufe **nicht** begonnen.

## Architekturüberblick

```
apps/
  web/                Next.js 14 (App Router) + TS + R3F + Zustand + i18n (de/en)
services/
  cad-api/            FastAPI + CadQuery, BREP → STL/3MF, Caching per Hash
packages/
  shared-schema/      Zod-Schemata für Konfiguration, gemeinsam für Web + API
  prisma/             Prisma-Schema, Migrationen, generierter Client
scripts/
  analyze_reference_steps.py   Verifikation der Referenzmaße
reference/            (unveränderlich) SlotCrate*.step
docs/                 Referenzgeometrie, Plan, ADRs
tests/
  geometry/           pytest gegen CadQuery-Ausgaben
  e2e/                Playwright
infra/
  docker/             Dockerfiles pro Dienst
  docker-compose.yml  web + cad-api + mysql
```

Trennung der Dienste: Web ↔ CAD-API über HTTP (JSON), Web ↔ MySQL über Prisma.
Kein Dienst importiert Code eines anderen. Jeder Dienst ist einzeln startbar
(ohne Docker) und einzeln deploybar.

## Meilensteine

### M0 – Repo-Skeleton & Referenzanalyse (dieser Commit)
- Ordnerstruktur, `.gitignore`, `.env.example`, README-Grundgerüst
- `scripts/analyze_reference_steps.py`
- `docs/REFERENCE_GEOMETRY.md` mit Ist-Werten aus dem Skript
- **Gate:** Ist-Werte liegen für alle drei STEP-Dateien innerhalb der im Auftrag
  genannten Referenz. Sonst STOPP + Dokumentation der Abweichung.

### M1 – Parametrischer 1×1-Kasten
- Modul `services/cad-api/slotcrate/geometry/box.py`
- Reine BREP-Erzeugung, keine STL-/STEP-Skalierung
- Bodenaufnahme aus Referenz extrahiert (Feature-Detection oder feste,
  einmal aus der Referenz gemessene Konstantenmenge – dokumentiert)
- **Gate:** `pytest tests/geometry/test_box_1x1.py`
  Toleranz Bounding Box ±0,02 mm, Volumen ±0,5 %, ein Solid, wasserdicht,
  keine Selbstüberschneidungen.

### M2 – Parametrischer 2×2-Kasten
- Ein durchgehender Außenkörper + ein durchgehender Innenraum
- Vier unveränderte Bodenaufnahmen an Rasterpositionen (0,0)…(1,1)
- **Gate:** `test_box_2x2.py` inkl. Volumenvergleich `A\B` und `B\A` mit STEP.

### M3 – Generalisierung NxM (1×1 … 10×10)
- Funktion `build_box(width_cells, depth_cells, height_mm, settings_version)`
- Einheitliche Regel: exakt `N*M` Bodenaufnahmen unter belegten Rasterfeldern
- **Gate:** `test_box_generic.py` prüft Bounding Box, Solidanzahl, Manifoldheit,
  Bodenaufnahmenzahl für ausgewählte NxM.

### M4 – CAD-API
- FastAPI mit Endpunkten:
  - `POST /v1/box/stl` `{widthCells, depthCells, heightMm, settingsVersion}`
  - `POST /v1/layout/zip` `{layout}` → ZIP mit dedupliziertem STL-Set
  - `GET  /v1/settings/active`
  - `POST /v1/settings` (Admin, siehe M9)
- Whitelist-Parametervalidierung, kein `eval`, kein Python-Code als Payload
- Ergebnis-Cache: `sha256(width|depth|height|settingsVersion|geometryVersion)`
- Rate-Limit auf `/box/stl` und `/layout/zip`
- **Gate:** Contract-Tests (pytest + httpx)

### M5 – Einzelkasten-Generator (Web)
- Route `/generator`
- Formularfelder mit Server-Validierung, Live-Vorschau via Three.js-Primitiv
- STL-Export mit Ladeanzeige und Abbruch (`AbortController`)
- **Gate:** Unit-Tests Zustand + Snapshot des Vorschau-Baums

### M6 – 10×10-Layoutplaner (Web)
- 3D-Ansicht der originalen Rasterplatte (aus GLB-Ableitung, nicht editierbar)
- Draufsicht mit Drag-Rechteck, Snap auf Zellen, Kollisionsvorschau (rot/grün)
- Zustand (Zustand-Store): boxes[], selection, history (undo/redo), settings
- **Gate:** Vitest für Store-Logik + Playwright für Drag-Flow

### M7 – Export & Stückliste
- Deduplizierung nach `(w,d,h)`, CSV-Stückliste, `configuration.json`,
  optionaler 3MF-Assembler (feature-flag)
- ZIP-Struktur exakt wie spezifiziert
- **Gate:** E2E-Export-Test

### M8 – Datenmodell & Persistenz
- Prisma: `User`, `GeneratorSettings`, `GeneratorSettingsVersion`,
  `SavedConfiguration`, `AdminAuditLog`
- Migrationen eingecheckt
- **Gate:** `prisma migrate deploy` grün auf leerer DB

### M9 – Admin-Panel & Sicherheit
- `/admin` server-guarded (Session-Cookie, HttpOnly, SameSite=Lax)
- Argon2id-Passworthashing, CSRF-Token für State-Change-Requests
- Rate-Limit auf Login und CAD-Generierung
- Whitelist mutierbarer Parameter (siehe Auftrag)
- Jede Änderung erzeugt neuen `GeneratorSettingsVersion`-Datensatz;
  bestehende `SavedConfiguration`s bleiben an ihre ursprüngliche Version gebunden
- Audit-Log jeder Änderung
- **Gate:** Playwright + API-Tests: nicht-Admin bekommt 403, auch bei manipuliertem
  Client-State.

### M10 – Tests & Doku
- README (Setup lokal + Docker), `.env.example`, ADRs, REFERENCE_GEOMETRY.md
- Playwright-Suite, CI-Skripte
- **Gate:** Alle Suites grün.

## Sicherheits-Leitplanken (durchgehend)

- Keine Geheimnisse im Frontend, keine `NEXT_PUBLIC_*`-Secrets
- Server validiert **jede** Layout-/Boxeingabe erneut gegen das Zod-Schema
- Whitelist statt Blacklist für Admin-Parameter
- Keine dynamische Codeausführung in der CAD-API
- Prepared Statements via Prisma; keine Roh-SQL mit User-Input
- Argon2id für Passwörter; sichere Zufalls-Session-IDs
- CSRF-Token für alle State-Change-Endpunkte
- Rate-Limits: `/auth/login` (5/min/IP), `/v1/box/stl` (30/min/User),
  `/v1/layout/zip` (10/min/User)
- Content-Security-Policy im Web-Frontend
- Referenz-STEP wird nie überschrieben; Schreibzugriff auf `reference/` im CI
  durch Hash-Check gesichert

## Nicht-veränderbare Invarianten (auch für Admins gesperrt)

- Rasterplatte, 10×10-Raster, Rasterteilung 21,09 mm
- Form/Maße/Position der Bodenaufnahme
- Grundausrichtung, Kompatibilitätsprofil der Referenz
