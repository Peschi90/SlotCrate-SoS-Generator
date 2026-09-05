# SlotCrate SoS Generator

Webbasierter Konfigurator für modulare SlotCrate-Sortierkästen. Aus einer
festen 10×10-Grundrasterplatte lassen sich beliebige Kästen (1×1 … 10×10)
platzieren und als druckbare STL-Dateien inklusive Stückliste exportieren.

- Architektur, Milestones und Sicherheits-Leitplanken:
  [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)
- Verifizierte Referenzmaße: [docs/REFERENCE_GEOMETRY.md](docs/REFERENCE_GEOMETRY.md)
- Server-Deployment (Plesk + PM2): [docs/DEPLOY_PLESK_PM2.md](docs/DEPLOY_PLESK_PM2.md)
- Verbindliche Copilot-Regeln: [.github/copilot-instructions.md](.github/copilot-instructions.md)

> **Referenzdateien in `reference/` sind unveränderlich.** Sie werden weder
> überschrieben, skaliert noch als STL-Quelle verwendet. Der Generator
> erzeugt jede Geometrie parametrisch als BREP und exportiert daraus STL.

---

## Schnell wieder einsteigen

Kompakte Wiedereinstiegs-Checkliste nach längerer Pause:

1. **Was?** Next.js-Konfigurator (Frontend + BFF) + Python-CAD-API
   (FastAPI + CadQuery) + MySQL.
2. **Welche Prozesse?** `slotcrate-web` (Port `6293`) und
   `slotcrate-cad-api` (Port `6294`, nur `127.0.0.1`) via PM2
   (`ecosystem.config.cjs`).
3. **Wichtige Pfade:** `apps/web/src/{app,lib,components,i18n}`,
   `services/cad-api/{app,slotcrate/geometry}`,
   `apps/web/prisma/schema.prisma`.
4. **Lokal starten:** siehe [Lokale Entwicklung](#lokale-entwicklung).
5. **Tests:** siehe [Tests](#tests).
6. **Deploy:** siehe [Server-Deployment mit PM2](#server-deployment-mit-pm2)
   und [docs/DEPLOY_PLESK_PM2.md](docs/DEPLOY_PLESK_PM2.md).
7. **Logs:** `npx pm2 logs slotcrate-web`, `npx pm2 logs slotcrate-cad-api`.
8. **Offene Punkte:** siehe [Wartungsstatus](#wartungsstatus).

---

## Projektübersicht

- **Zweck:** Anwender konfigurieren einzelne Kästen oder komplette Layouts
  auf der 10×10-SlotCrate-Rasterplatte und laden STL/ZIP zum Drucken.
- **Zielgruppe:** SlotCrate-Nutzer, die eigene Sortiereinsätze drucken;
  Admin-Team, das Generator-Parameter versioniert freigibt.
- **Wichtigste Funktionen:**
  - Einzelkasten-Generator mit R3F-Live-Vorschau (`/generator`).
  - Zusätzlicher Download der variantabhängigen Rasterplatte als STL im
    Generator (`/api/plate/stl`).
  - Layout-Planer mit SVG-Drag, 3D-Ansicht, Undo/Redo, ZIP-Export (`/planner`).
  - Automatische lokale Speicherung von Layouts, JSON-Export/-Import,
    benannte Entwürfe und teilbare Kurz-URLs (`/planner?share=<id>`).
  - Nachträgliches Bearbeiten platzierter Kästen: Drag-and-drop verschieben,
    Anfasser zum Größenanpassen, Duplizieren, 90°-Drehung, Pfeiltasten,
    Mehrfachauswahl per Ctrl/Shift-Klick.
  - Automatisches Auffüllen freier Flächen mit fester oder größtmöglicher
    Kastengröße, Hervorhebung freier Zellen und Warnung vor kleinen
    Restflächen.
  - Admin-Panel mit versionierten Einstellungen und Analytics (`/admin`).
  - Zweisprachige Oberfläche (Deutsch/Englisch) via `next-intl`.
- **Entwicklungsstand:** Milestones M0–M10 abgeschlossen (siehe unten).

---

## Architektur

### Komponenten

| Komponente | Pfad | Stack | Port |
|---|---|---|---|
| Web-Frontend + BFF | `apps/web` | Next.js 14 App Router, TS strict, Tailwind, R3F, Zustand, next-intl, Prisma | **6293** |
| CAD-API | `services/cad-api` | FastAPI, CadQuery 2.4, Pydantic v2, SHA-256-Cache | **6294** (`127.0.0.1`) |
| Datenbank | MySQL 8 | Prisma-Schema `apps/web/prisma/schema.prisma` | 3306 |
| Referenz-STEP | `reference/` | read-only, dienen nur der Verifikation | – |

### Verzeichnisstruktur

```
apps/web/                Next.js 14 (App Router)
  src/app/               Pages + API-Routen
    api/box/stl/         Proxy zur CAD-API (Einzelkasten)
    api/layout/zip/      Proxy zur CAD-API (Layout-ZIP)
    api/auth/{login,logout,csrf}/
    api/admin/{settings,analytics}/
    api/analytics/event/
    admin/               Admin-UI (Server-Component + Forms)
    generator/           Einzelkasten-UI
    planner/             Layout-Planer-UI
  src/components/        R3F/UI: BoxMesh, BoxPreview, CadCanvas,
                         Layout3DView, LayoutGrid, LanguageSwitcher
  src/i18n/              request.ts, actions.ts, messages/{de,en}.json
  src/lib/               db, auth, session, csrf, rate-limit,
                         cad-client, schema (Zod), layout-store,
                         generator-settings-schema, settings-service,
                         analytics-service, system
  prisma/schema.prisma   MySQL-Schema (User, Session, Settings-Versionen,
                         SavedConfiguration, AdminAuditLog, AnalyticsEvent)
  prisma/migrations/     versionierte Prisma-Migrationen
services/cad-api/
  app/main.py            FastAPI-App: /health, /v1/settings/active,
                         /v1/box/stl, /v1/layout/zip
  app/{cache,exporter,schemas,security,settings}.py
  slotcrate/geometry/    Reine Geometrie-Bibliothek (BREP → STL/ZIP)
    constants.py         GRID_PITCH_MM=21.09, GRID=10x10, GEOMETRY_VERSION
    box.py, features.py, reference.py, export.py
tests/
  geometry/              pytest — CAD-Referenzvergleiche NxM
  api/                   pytest — FastAPI-Contract-Tests
  e2e/                   Playwright (Chromium)
infra/
  docker-compose.yml     lokal: web + cad-api + mysql
  docker/*/Dockerfile    je Dienst
reference/               unveränderliche STEP-Referenzen
docs/                    Plan, Referenzanalyse, Deploy-Guide
ecosystem.config.cjs     PM2-Config (beide Prozesse)
```

### Datenfluss (Konfigurator → STL)

1. Client validiert Payload (Zod: `apps/web/src/lib/schema.ts`,
   `layout-store.ts`).
2. Next.js-Route-Handler (`apps/web/src/app/api/box/stl/route.ts` bzw.
   `.../layout/zip/route.ts`) prüft Auth/Rate-Limit, hängt Bearer-Token
   an und proxied an CAD-API.
3. FastAPI validiert erneut (Pydantic, `extra="forbid"`, `pitch=21.09`
   als `Literal`), erzeugt BREP, tesseliert zu STL, cached SHA-256-basiert
   unter `services/cad-api/cache/`.
4. Response wird als `model/stl` bzw. `application/zip` durchgereicht.

### Sicherheit (Kurzform)

- Argon2id (m=64 MiB, t=3, p=1) für Passwörter.
- HttpOnly-Session-Cookie, DB-gespeicherter HMAC-Token-Hash.
- HMAC-CSRF-Token auf jedem State-Change (POST/PUT/PATCH/DELETE).
- Rate-Limits (Login/Box-STL/Layout-ZIP/Publish) — siehe
  [Konfiguration](#konfiguration-und-umgebungsvariablen).
- `CAD_API_INTERNAL_TOKEN` bleibt server-seitig.
- Admin-Rechteprüfung ausschließlich serverseitig.
- Whitelist mutierbarer Admin-Parameter in
  `apps/web/src/lib/generator-settings-schema.ts`; Rasterplatte, Rasterteilung,
  Bodenaufnahme, Grundausrichtung bleiben im Geometrie-Code fest verankert.

---

## Lokale Entwicklung

### Voraussetzungen

- Node.js ≥ 20, npm ≥ 10
- Python 3.11 oder 3.12 (CadQuery 2.4 hat keine Wheels für sehr neue Versionen)
- MySQL 8 (lokal oder via `infra/docker-compose.yml`)
- PowerShell (Windows) oder Bash (Linux/macOS)

### 1. Repository + venv (einmalig)

```powershell
py -3.12 -m venv .venv-cad
.\.venv-cad\Scripts\python.exe -m pip install --upgrade pip
.\.venv-cad\Scripts\python.exe -m pip install -r services\cad-api\requirements.txt
.\.venv-cad\Scripts\python.exe scripts\analyze_reference_steps.py
```

### 2. `.env` anlegen

```powershell
Copy-Item .env.example .env
# Werte in .env anpassen (mindestens):
#   DATABASE_URL, MYSQL_*, SESSION_SECRET, CSRF_SECRET, CAD_API_INTERNAL_TOKEN
```

Siehe [Konfiguration und Umgebungsvariablen](#konfiguration-und-umgebungsvariablen).

### 3. Datenbank + Migrationen + Admin-Bootstrap

```powershell
cd apps\web
npm install
npm run db:generate
npm run db:deploy
# Optional: Admin anlegen (ADMIN_BOOTSTRAP_EMAIL/PASSWORD in .env)
npm run db:seed
```

### 4. Dienste starten (ohne Docker)

CAD-API:
```powershell
$env:CAD_API_INTERNAL_TOKEN = "dev-only"
.\.venv-cad\Scripts\python.exe -m uvicorn app.main:app --app-dir services\cad-api --reload
# → http://127.0.0.1:6294/health
```

Web (zweites Terminal):
```powershell
cd apps\web
npm run dev
# → http://localhost:6293
```

### 4b. Alternativ: gesamter Stack via Docker

```powershell
docker compose -f infra\docker-compose.yml up --build
```

### Entwicklungs-URLs

- Startseite: <http://localhost:6293/>
- Generator: <http://localhost:6293/generator>
- Planner: <http://localhost:6293/planner>
- Admin: <http://localhost:6293/admin>
- CAD-API-Health: <http://127.0.0.1:6294/health>

---

## Produktions-Build

```powershell
# Web
npm --prefix apps/web ci
npm --prefix apps/web run build
# Ergebnis: apps/web/.next

# CAD-API — kein Build; nur Abhängigkeiten:
<PYTHON_BIN> -m pip install -r services/cad-api/requirements.txt
```

Typische Fehlerquellen:

- `cadquery==2.4.0` fehlendes Wheel → Python 3.11/3.12 verwenden.
- Prisma-Client nicht generiert → `npm run db:generate`.
- Fehlende Env-Variablen zur Build-Zeit → `.env` prüfen; `NEXT_PUBLIC_*`
  werden in den Client-Bundle einkompiliert.

---

## Server-Deployment mit PM2

Ausführlicher Guide (Plesk + Apache-Reverse-Proxy):
[docs/DEPLOY_PLESK_PM2.md](docs/DEPLOY_PLESK_PM2.md).

**PM2-Prozesse** (`ecosystem.config.cjs`):

| Prozess | cwd | Kommando | Port |
|---|---|---|---|
| `slotcrate-web` | `./apps/web` | `next start -p 6293` | 6293 |
| `slotcrate-cad-api` | `./services/cad-api` | `<PYTHON_BIN> -m uvicorn app.main:app --app-dir . --host 127.0.0.1 --port 6294` | 6294 |

Auf Linux/Plesk **immer** `PYTHON_BIN` auf den venv-Interpreter setzen,
sonst versucht PM2 `python3` als Skriptdatei zu öffnen.

### Standard-Deploy-Ablauf

> Serverpfad = `<REPO_ROOT_ON_SERVER>` — bitte für den eigenen Server
> einmalig festhalten. `<PYTHON_BIN>` = absoluter Pfad zum venv-Python.

```bash
cd <REPO_ROOT_ON_SERVER>
git pull

# nur wenn apps/web/package.json geändert:
npm --prefix apps/web ci

# nur wenn services/cad-api/requirements.txt geändert:
<PYTHON_BIN> -m pip install -r services/cad-api/requirements.txt

# nur wenn prisma/schema.prisma oder Migrationen geändert:
npm --prefix apps/web run db:deploy

# nur bei Web-Code- oder NEXT_PUBLIC_*-Änderungen:
npm --prefix apps/web run build

# Reload (bevorzugt vor restart):
npx pm2 reload slotcrate-cad-api --update-env   # nur bei CAD-/Env-Änderung
npx pm2 reload slotcrate-web --update-env

npx pm2 status
npx pm2 logs slotcrate-web --lines 100
```

### Health-Checks

```bash
curl -I http://127.0.0.1:6293
curl    http://127.0.0.1:6294/health
```

### Neustart nach Server-Reboot

```bash
npx pm2 resurrect     # falls zuvor pm2 save ausgeführt wurde
# oder:
npx pm2 start ecosystem.config.cjs
```

### Rollback

- Git: `git reset --hard <letzter_grüner_Commit>` + Build + Reload.
- DB-Migration: manuell zurück (Prisma hat kein Auto-Down) — vorher
  Backup einspielen.

---

## Internationalisierung

- **Lösung:** [`next-intl`](https://next-intl.dev) v3.
- **Sprachen:** `de` (Default), `en`.
- **Ort:** `apps/web/src/i18n/messages/{de,en}.json`.
- **Umschaltung:** Cookie `NEXT_LOCALE` via Server-Action
  (`apps/web/src/i18n/actions.ts`) und `LanguageSwitcher`-Komponente.
- **Config:** `apps/web/src/i18n/request.ts`.

### Neuen Text hinzufügen

1. Key in `de.json` **und** `en.json` ergänzen (gleiche Struktur).
2. Im Code `useTranslations()` (Client) bzw. `getTranslations()` (Server) nutzen.
3. Variablen/Plural via ICU (`{count}`, `{count, plural, one {…} other {…}}`).

### Neue Sprache hinzufügen

1. `LOCALES`-Konstante in `apps/web/src/i18n/request.ts` erweitern.
2. `messages/<locale>.json` mit vollständigem Key-Baum anlegen.
3. `LanguageSwitcher`-Komponente ergänzen.

### Auf fehlende Keys prüfen

Manueller Vergleich der beiden JSON-Dateien. Es existiert **kein**
automatisiertes Skript — bei Änderungen sorgfältig prüfen (siehe auch
[.github/copilot-instructions.md](.github/copilot-instructions.md) §4).

---

## Wichtige Entwicklungsabläufe

- **Neue UI-Funktion:** Komponente in `apps/web/src/components/` oder Page
  unter `apps/web/src/app/…/page.tsx`; Zustand ggf. in Zustand-Store; i18n-Keys
  in `de.json` + `en.json`.
- **Neuer übersetzter Text:** siehe [Internationalisierung](#internationalisierung).
- **Neue API-Route:** `apps/web/src/app/api/<name>/route.ts`; Zod-Schema in
  `apps/web/src/lib/schema.ts`; bei CAD-Zugriff `cad-client.ts` nutzen.
  Bei State-Change CSRF prüfen; Rate-Limit anwenden.
- **Datenbankmodell ändern:** `apps/web/prisma/schema.prisma` anpassen →
  `npm --prefix apps/web run db:migrate` lokal → Migration committen →
  `db:deploy` auf Server.
- **Neue Admin-Einstellung:** `generator-settings-schema.ts` erweitern
  (Zod + Default), Admin-Form (`AdminSettingsForm.tsx`), i18n-Keys,
  API-Route unter `api/admin/settings/`, ggf. CAD-Schema in
  `services/cad-api/app/schemas.py` synchronisieren.
- **CAD-Parameter/Geometrie ändern:** `services/cad-api/slotcrate/geometry/`
  anpassen; **Geometrie-Konstanten (`GRID_PITCH_MM`, Bodenaufnahmen) bleiben
  fix**; `GEOMETRY_VERSION` erhöhen; Referenztests aktualisieren.
- **Exportfunktion ändern:** `services/cad-api/app/exporter.py` +
  `slotcrate/geometry/export.py`.
- **Tests:** siehe [Tests](#tests).
- **Produktionsdeploy:** siehe [Server-Deployment mit PM2](#server-deployment-mit-pm2).

---

## Konfiguration und Umgebungsvariablen

Basis: `.env.example`. Reale `.env` niemals committen.

| Name | Zweck | Erforderlich | Beispiel | Komponente |
|---|---|---|---|---|
| `PORT` | Web-Port | optional (Default 6293) | `6293` | Web |
| `NEXT_PUBLIC_CAD_API_URL` | CAD-API-URL für Web | ja | `http://127.0.0.1:6294` | Web (Client+Server) |
| `SESSION_SECRET` | HMAC für Session-Token | ja | lange Zufallszeichenkette | Web |
| `CSRF_SECRET` | HMAC für CSRF | ja | lange Zufallszeichenkette | Web |
| `DATABASE_URL` | Prisma-DSN | ja | `mysql://user:pw@host:3306/db` | Web / Prisma |
| `MYSQL_ROOT_PASSWORD` | Compose | nur Docker | `change-me` | Compose |
| `MYSQL_DATABASE` | DB-Name | nur Docker | `slotcrate` | Compose |
| `MYSQL_USER` / `MYSQL_PASSWORD` | DB-User | nur Docker | `slotcrate` / `change-me` | Compose |
| `CAD_API_HOST` | Bind-Host | optional | `127.0.0.1` | CAD-API |
| `CAD_API_PORT` | Bind-Port | optional (Default 6294) | `6294` | CAD-API |
| `CAD_API_INTERNAL_TOKEN` | Shared Bearer Web↔CAD | ja | lange Zufallszeichenkette | Web+CAD-API |
| `RATE_LIMIT_LOGIN` | Requests/Minute | optional | `5` | Web |
| `RATE_LIMIT_BOX_STL` | Requests/Minute | optional | `30` | Web+CAD-API |
| `RATE_LIMIT_LAYOUT_ZIP` | Requests/Minute | optional | `10` | Web+CAD-API |
| `RATE_LIMIT_PLATE_STL` | Requests/Minute für Rasterplatten-STL-Downloads | optional | `15` | Web+CAD-API |
| `RATE_LIMIT_LAYOUT_SHARE` | Requests/Minute je IP für geteilte Layout-Links | optional | `10` | Web |
| `SHARE_LAYOUT_TTL_DAYS` | Ablaufzeit für geteilte Layout-Kurz-URLs (Tage, max. 365) | optional | `90` | Web |
| `ADMIN_BOOTSTRAP_EMAIL` | Einmaliger Seed | optional | – | Web-Seed |
| `ADMIN_BOOTSTRAP_PASSWORD` | Einmaliger Seed (≥12 Zeichen) | optional | – | Web-Seed |
| `PYTHON_BIN` | Absoluter Pfad zum venv-Python (PM2) | Linux/Plesk empfohlen | `/…/.venv-cad/bin/python` | PM2 |

Niemals `NEXT_PUBLIC_*` für Secrets verwenden.

---

## Datenbank

- **Engine:** MySQL 8.
- **ORM:** Prisma 5 (`apps/web/prisma/schema.prisma`).
- **Wichtige Modelle:**
  - `User` (Rollen `USER` / `ADMIN`, Argon2id-Passwort).
  - `Session` (DB-Session, opaker Token-Hash).
  - `GeneratorSettings` (Singleton mit `activeVersionId`).
  - `GeneratorSettingsVersion` (unveränderliche Snapshot-Payloads).
  - `SavedConfiguration` (Layout, an Settings-Version gebunden).
  - `AdminAuditLog` (Publish/Rolle/…).
  - `GeneratorAnalyticsEvent` (hashed Session/Visitor/IP).
- **Migrationen anwenden:**
  - Lokal (Dev): `npm --prefix apps/web run db:migrate`
  - Produktion: `npm --prefix apps/web run db:deploy`
- **Backup/Restore:** klassisch via `mysqldump` / `mysql`; niemals
  produktive DB löschen oder resetten ohne bestätigten Backup.

---

## Tests

Aktueller Stand (M0–M10):

- ~46 Geometrietests (1×1, 2×2, NxM inkl. 10×10, Referenzvergleich).
- ~10 FastAPI-Contract-Tests (Whitelist, Cache, Bearer, Overlap, Dedup-ZIP).
- ~13 Web-Tests (Zod-Schemata, Layout-Store: Kollision, Undo/Redo, Reset).
- Playwright-E2E: Admin-Guard und Planner-Flow.

### Befehle

```powershell
# Python (Geometrie + FastAPI-Contract)
.\.venv-cad\Scripts\python.exe -m pytest tests\geometry tests\api -q

# Web
cd apps\web
npm run lint
npm run typecheck
npm run test
npm run build

# E2E (Web muss auf :6293 laufen)
cd tests\e2e
npm install
npm run test:install
npm run test
```

### Voraussetzungen / typische Fehler

- Python-venv aktiv (`.venv-cad`).
- MySQL erreichbar für `db:deploy`.
- CAD-API läuft (`http://127.0.0.1:6294/health`) für Layout-ZIP-E2E.
- Playwright-Browser installiert (`npm run test:install`).

---

## Fehlerbehebung

| Symptom | Prüfen |
|---|---|
| Anwendung startet nicht | `npx pm2 status`, `npx pm2 logs slotcrate-web --lines 200`; `.env` vorhanden? Build gelaufen? |
| PM2-Prozess `errored` | Logs; auf Windows: `PYTHON_BIN` gesetzt? `interpreter: "none"` in `ecosystem.config.cjs`? |
| Build schlägt fehl | `npm --prefix apps/web ci`; Prisma-Client generiert? Node-Version ≥ 20? |
| DB-Verbindung fehlgeschlagen | `DATABASE_URL` prüfen; MySQL erreichbar? |
| Migration schlägt fehl | Prisma-Log lesen; ggf. Backup einspielen; niemals produktiv `migrate reset`. |
| STL-Generierung schlägt fehl | CAD-API-Log (`pm2 logs slotcrate-cad-api`); `cadquery`-Wheel installiert? Python 3.11/3.12? |
| CAD-Backend nicht erreichbar | `curl http://127.0.0.1:6294/health`; `NEXT_PUBLIC_CAD_API_URL` korrekt? Token in beiden Prozessen identisch? |
| Übersetzung fehlt | Fehlt Key in `de.json` oder `en.json`? Runtime-Konsole `MISSING_MESSAGE`. |
| Env-Variable fehlt | `.env` und PM2-Umgebung prüfen; nach Änderung `pm2 reload --update-env`. |
| Reverse-Proxy liefert 502 | Läuft PM2? `curl -I http://127.0.0.1:6293` direkt auf Server; siehe [docs/DEPLOY_PLESK_PM2.md](docs/DEPLOY_PLESK_PM2.md). |
| Zeitüberschreitung Layout-ZIP | Rate-Limits und CAD-Cache-Verzeichnis (`services/cad-api/cache/`) prüfen. |

Diagnose-Befehle:

```bash
npx pm2 status
npx pm2 logs slotcrate-web --lines 200
npx pm2 logs slotcrate-cad-api --lines 200
curl -I http://127.0.0.1:6293
curl    http://127.0.0.1:6294/health
```

---

## Milestones (Historie)

- [x] **M0** Referenzanalyse verifiziert.
- [x] **M1** 1×1 aus Referenz normalisiert.
- [x] **M2** Bodenaufnahmen aus 2×2 freigeschnitten.
- [x] **M3** Parametrisches NxM (bis 10×10).
- [x] **M4** FastAPI-Endpunkte + Bearer + Rate-Limit + Cache.
- [x] **M5** Einzelkasten-Generator mit R3F-Vorschau.
- [x] **M6** Layout-Planer (SVG-Drag + 3D + Undo/Redo + ZIP).
- [x] **M7** Export + Stückliste (Dedup-ZIP, CSV, README).
- [x] **M8** Prisma-Datenmodell + Initial-Migration.
- [x] **M9** Admin-Panel unter `/admin` mit versionierten Einstellungen.
- [x] **M10** Docker-Compose + Playwright-E2E-Skeleton.

---

## Wartungsstatus

- **Bekannte Einschränkungen:**
  - CadQuery ist auf `2.4.0` gepinnt; Python 3.13+ ohne Wheel nicht getestet.
  - Referenz-STEP unter `reference/` ist read-only.
  - `pitch = 21.09` mm ist ein `Literal`; Änderungen sind bewusst verboten.
  - Keine automatisierte i18n-Key-Diff-Prüfung; manuelle Sorgfalt notwendig.
- **Offene technische Aufgaben (TODO):**
  - Serverpfad, PM2-Autostart und Plesk-Domain-Zuordnung projektspezifisch
    dokumentieren (siehe `<REPO_ROOT_ON_SERVER>` im Deploy-Abschnitt).
- **Architekturentscheidungen (bewusst):**
  - Web-App agiert als BFF vor der CAD-API — kein direkter Client→CAD-API-Zugriff.
  - Admin-Änderungen werden versioniert, nicht mutiert
    (`GeneratorSettingsVersion` ist unveränderlich).
  - Rasterplatte, Rasterteilung, Bodenaufnahme, Grundausrichtung sind im
    Geometrie-Code fixiert und **nicht** Admin-editierbar.
- **Sicherheit:**
  - Alle rollen- und rate-limit-relevanten Checks laufen server-seitig.
  - CAD-API bindet nur an `127.0.0.1` und darf nicht direkt via Domain
    exponiert werden.

---

## Lizenz / Referenzen

Die STEP-Referenzen unter `reference/` sind Bestandteil dieses Repos nur,
wenn ihre Lizenzierung dies erlaubt. Andernfalls sind sie lokal
bereitzustellen und dieses Verzeichnis bleibt in `.gitignore` geführt.
