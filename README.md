# SlotCrate SoS Generator

Webbasierter Konfigurator für modulare SlotCrate-Sortierkästen. Aus einer
festen 10×10-Grundrasterplatte lassen sich beliebige Kästen (1×1 … 10×10)
platzieren und als druckbare STL-Dateien inklusive Stückliste exportieren.

Architektur, Reihenfolge und Sicherheits­leitplanken sind in
[docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) beschrieben.
Die verifizierten Referenzmaße stehen in
[docs/REFERENCE_GEOMETRY.md](docs/REFERENCE_GEOMETRY.md).

> **Referenzdateien in `reference/` sind unveränderlich.** Sie werden weder
> überschrieben, skaliert noch als STL-Quelle verwendet. Der Generator
> erzeugt jede Geometrie parametrisch als BREP und exportiert daraus STL.

## Aufbau

```
apps/
  web/              Next.js 14, TS strict, R3F, Zustand, next-intl, Prisma
services/
  cad-api/          FastAPI + CadQuery, BREP → STL/ZIP, SHA-256-Cache
infra/
  docker-compose.yml   web + cad-api + mysql
  docker/*/Dockerfile  je Dienst
tests/
  geometry/         pytest (CAD-Referenzvergleiche, NxM)
  api/              pytest (FastAPI-Contract)
  e2e/              Playwright (Chromium)
scripts/
  analyze_reference_steps.py
reference/          unveränderliche STEP-Dateien
docs/               Plan, Referenzanalyse
```

## Projektstand (M0 – M10 abgeschlossen)

- [x] **M0** – Referenzanalyse verifiziert (alle Ist-Werte in Toleranz).
- [x] **M1** – 1×1 aus Referenz normalisiert (Volumendifferenz A\B = B\A = 0).
- [x] **M2** – Bodenaufnahmen aus 2×2 freigeschnitten; Face-Signatur im
  1×1 belegt.
- [x] **M3** – Parametrisches NxM (bis 10×10) mit N·M unveränderten
  Aufnahmen.
- [x] **M4** – FastAPI: `/health`, `/v1/settings/active`, `/v1/box/stl`,
  `/v1/layout/zip` (Bearer, Rate-Limit, SHA-256-Cache).
- [x] **M5** – Next.js Einzelkasten-Generator mit R3F-Vorschau + Abbruch.
- [x] **M6** – Layout-Planer (SVG-Drag + 3D + Undo/Redo + Reset + ZIP).
- [x] **M7** – Export & Stückliste (dedup ZIP, CSV, README).
- [x] **M8** – Prisma-Datenmodell (`User`, `Session`,
  `GeneratorSettings`, `GeneratorSettingsVersion`, `SavedConfiguration`,
  `AdminAuditLog`) + Initial-Migration.
- [x] **M9** – Admin-Panel unter `/admin` mit serverseitiger Rollen­prüfung,
  Argon2id-Passwörter, HttpOnly-Session-Cookie (SameSite=Lax),
  HMAC-CSRF-Token, Rate-Limit auf `/api/auth/login`, versionierte
  Einstellungs­freigabe mit Audit-Log.
- [x] **M10** – Docker-Compose (web + cad-api + mysql), Dockerfiles je
  Dienst, Playwright-Skeleton mit Admin-Guard-Test und Planner-Flow-Test.

## Tests

```powershell
# Python (Geometrie + FastAPI-Contract)
.\.venv-cad\Scripts\python.exe -m pytest tests\geometry tests\api -q

# Web (Zod + Zustand-Store)
cd apps\web
npm run typecheck
npm run test

# E2E (benötigt laufenden Web-Server + Chromium)
cd tests\e2e
npm install
npm run test:install
npm run test
```

Aktuell grün:

- 46 Geometrietests (1×1, 2×2, NxM inkl. 10×10, Referenzvergleich, Volumen,
  Aufnahmen­anzahl, Validity).
- 10 FastAPI-Contract-Tests (Whitelist-Validierung, Cache, Bearer,
  Overlap/Out-of-Grid, Dedup-ZIP).
- 13 Web-Tests (Zod-Schemata, Layout-Store: Kollision, Undo/Redo, Reset).

## Lokale Einrichtung

### 1. Referenzanalyse (einmalig)

```powershell
py -3.12 -m venv .venv-cad
.\.venv-cad\Scripts\python.exe -m pip install --upgrade pip
.\.venv-cad\Scripts\python.exe -m pip install -r services\cad-api\requirements.txt
.\.venv-cad\Scripts\python.exe scripts\analyze_reference_steps.py
```

### 2. CAD-API lokal starten (ohne Docker)

```powershell
$env:CAD_API_INTERNAL_TOKEN = "dev-only"
.\.venv-cad\Scripts\python.exe -m uvicorn app.main:app --app-dir services\cad-api --reload
```

### 3. Web + DB via Docker-Compose

```powershell
Copy-Item .env.example .env
# Werte in .env anpassen (mind. MYSQL_PASSWORD, SESSION_SECRET, CSRF_SECRET,
# CAD_API_INTERNAL_TOKEN, DATABASE_URL)
docker compose -f infra\docker-compose.yml up --build
```

### 4. DB-Migration + Admin-Bootstrap

```powershell
cd apps\web
$env:DATABASE_URL = "mysql://slotcrate:...@localhost:3306/slotcrate"
$env:ADMIN_BOOTSTRAP_EMAIL = "admin@example.com"
$env:ADMIN_BOOTSTRAP_PASSWORD = "einlangespasswort"
npm run db:deploy
npm run db:seed
```

## Sicherheits-Leitplanken

- Server-seitige Rollen­prüfung auf jeder Admin-Route und jedem Admin-API.
- `extra="forbid"` (Pydantic) und `.strict()` (Zod) auf allen Payloads.
- `pitch = 21.09` ist ein `Literal`-Field mit zusätzlichem Validator –
  Client-Manipulation wird abgelehnt.
- Argon2id (m=64 MiB, t=3, p=1), HttpOnly-Session-Cookie mit HMAC-basiertem
  Token-Hash in der DB.
- CSRF-Token per HMAC(nonce, CSRF_SECRET); Prüfung auf jedem State-Change.
- Rate-Limits: Login (5 / min / IP), Box-STL (30 / min / User),
  Layout-ZIP (10 / min / User), Settings-Publish (20 / min / User).
- Kein `NEXT_PUBLIC_*` für Secrets; CAD-API-Token bleibt server-seitig
  hinter Route-Handlern.
- Keine dynamische Code-Ausführung in der CAD-API – Parameter kommen nur
  über strikte Pydantic-Schemata.
- Whitelist mutierbarer Admin-Parameter; Rasterplatte, Rasterteilung,
  Bodenaufnahme, Grundausrichtung bleiben im Code fest verankert.

## Lizenz / Referenzen

Die STEP-Referenzen unter `reference/` sind Bestandteil dieses Repos nur,
wenn ihre Lizenzierung dies erlaubt. Andernfalls sind sie lokal
bereitzustellen und dieses Verzeichnis bleibt in `.gitignore` geführt.
