# GitHub Copilot – Projektanweisungen: SlotCrate SoS Generator

Diese Datei ist **verbindlich** für alle KI-Änderungen an diesem Repository.
Sie ist projektspezifisch. Verlasse dich nicht auf Annahmen aus generischen
Next.js-/FastAPI-Vorlagen — die tatsächlichen Konventionen sind unten
dokumentiert.

---

## 1. Projektüberblick

**Zweck:** Webbasierter Konfigurator für modulare SlotCrate-Sortierkästen.
Nutzer platzieren Kästen (1×1 … 10×10) auf einer festen 10×10-Grundrasterplatte
und exportieren druckbare STL-Dateien inkl. Stückliste (ZIP).

**Benutzerfunktionen (`apps/web`):**
- Einzelkasten-Generator (`/generator`) mit R3F-Live-Vorschau und STL-Download.
- Layout-Planer (`/planner`) mit SVG-Drag, 3D-Ansicht, Undo/Redo, ZIP-Export.
- Statische Seiten: `/`, `/impressum`, `/datenschutz`.
- Sprachumschalter DE ↔ EN (Cookie `NEXT_LOCALE`).

**Admin-Funktionen (`/admin`):**
- Login (`/admin/login`), versionierte Generator-Einstellungen, Analytics.
- Argon2id-Passwörter, HttpOnly-Session-Cookie, HMAC-CSRF, Audit-Log.

**Externe Dienste:** keine Third-Party-APIs. Alle CAD-Berechnungen laufen
lokal in der Python-CAD-API.

---

## 2. Architektur

### Komponenten

| Komponente | Pfad | Stack | Port |
|---|---|---|---|
| Web-Frontend + BFF | `apps/web` | Next.js 14 (App Router), TS strict, Tailwind, R3F, Zustand, next-intl, Prisma | **6293** |
| CAD-API | `services/cad-api` | FastAPI, CadQuery 2.4, Pydantic v2, SHA-256-Cache | **6294** (nur 127.0.0.1) |
| Datenbank | MySQL 8 | Prisma-Schema `apps/web/prisma/schema.prisma` | 3306 |
| Geometrie-Kern | `services/cad-api/slotcrate/geometry/` | reine Python-Funktionen, BREP → STL | – |
| Referenz-STEP | `reference/` | **unveränderlich** | – |

### Datenfluss (STL-Export)

1. Client (`/generator` oder `/planner`) validiert Payload via Zod
   (`apps/web/src/lib/schema.ts`, `layout-store.ts`).
2. Next.js-Route-Handler (`apps/web/src/app/api/box/stl/route.ts`,
   `.../api/layout/zip/route.ts`) fügt Bearer-Token
   (`CAD_API_INTERNAL_TOKEN`) hinzu und proxied an CAD-API.
3. CAD-API validiert erneut via Pydantic (`extra="forbid"`,
   `pitch=21.09` als `Literal`), berechnet BREP, tesseliert zu STL,
   cached SHA-256-basiert unter `services/cad-api/cache/`.
4. Response wird als `model/stl` bzw. `application/zip` durchgereicht.

### Wichtige Verzeichnisse & Dateien

- `apps/web/src/app/` — Next.js App Router (Pages + API-Routen).
- `apps/web/src/lib/`
  - `db.ts` — Prisma-Client-Singleton.
  - `auth.ts` — Argon2id-Hash/Verify, `authenticate()`.
  - `session.ts` — HttpOnly-Session-Cookie, DB-gestützt.
  - `csrf.ts` — HMAC-CSRF-Token.
  - `rate-limit.ts` — Sliding-Window Rate-Limits.
  - `cad-client.ts` — server-seitiger Fetch zur CAD-API.
  - `schema.ts` — Zod-Schemata (Box, Layout).
  - `generator-settings-schema.ts` — Admin-Whitelist + Defaults.
  - `settings-service.ts`, `analytics-service.ts` — DB-Zugriffslogik.
- `apps/web/src/components/` — R3F/UI (`BoxMesh`, `BoxPreview`,
  `CadCanvas`, `Layout3DView`, `LayoutGrid`, `LanguageSwitcher`).
- `apps/web/src/i18n/` — `request.ts` (Locale-Config), `actions.ts`
  (Server-Action zum Umschalten), `messages/{de,en}.json`.
- `apps/web/prisma/schema.prisma` + `prisma/migrations/`.
- `services/cad-api/app/main.py` — FastAPI-Einstiegspunkt, alle Routen.
- `services/cad-api/app/{cache,exporter,schemas,security,settings}.py`.
- `services/cad-api/slotcrate/geometry/{constants,box,features,reference,export}.py`.
- `ecosystem.config.cjs` — PM2-Config für **beide** Prozesse.
- `docs/DEPLOY_PLESK_PM2.md` — verbindliche Deploy-Anleitung.

### Auth / Sicherheit (nicht ändern, außer explizit gefordert)

- Rollen `USER` / `ADMIN` in `User.role` (Prisma-Enum).
- Session-Token: opaker Zufallswert, HMAC-Hash in `Session.id`.
- CSRF: `HMAC(nonce, CSRF_SECRET)` auf jedem State-Change (POST/PUT/PATCH/DELETE).
- Rate-Limits (`RATE_LIMIT_*` env, siehe `.env.example`): Login 5/min,
  Box-STL 30/min, Layout-ZIP 10/min, Settings-Publish 20/min.
- Admin-Rechteprüfung **immer serverseitig** in Route-Handlern/Server-Components.
- `CAD_API_INTERNAL_TOKEN` niemals als `NEXT_PUBLIC_*` exponieren.
- Nur `NEXT_PUBLIC_CAD_API_URL` darf öffentlich sein.

### Feste, nicht änderbare Konstanten (Geometrie)

Definiert in `services/cad-api/slotcrate/geometry/constants.py`:
`GRID_PITCH_MM = 21.09`, `GRID_ROWS = GRID_COLUMNS = 10`,
Bodenaufnahmen-Signatur, Grundausrichtung, `GEOMETRY_VERSION`.
Diese Werte sind auch admin-seitig **nicht** änderbar (Whitelist in
`generator-settings-schema.ts`).

---

## 3. Verbindliche Regeln für Änderungen

1. **Vor jeder Änderung** die betroffenen Dateien und Aufrufer lesen. Keine
   Blind-Refaktorierungen.
2. Keine parallelen/doppelten Implementierungen. Zentrale Helfer aus
   `apps/web/src/lib/` und `services/cad-api/slotcrate/geometry/` wiederverwenden.
3. **Frontend- und Backend-Validierung konsistent halten**: Zod-Schema in
   `apps/web/src/lib/schema.ts` und Pydantic-Schema in
   `services/cad-api/app/schemas.py` müssen dieselben Grenzen kodieren.
4. **Öffentliche API-Contracts** (`/v1/*`, `/api/*`) abwärtskompatibel halten.
   Neue Felder additiv; alte Felder nicht umbenennen.
5. TypeScript **strikt**. Kein `any`, kein `@ts-ignore`. `unknown` +
   Narrowing statt `any`.
6. Python typannotieren (der Code nutzt `from __future__ import annotations`).
   `extra="forbid"` auf allen Pydantic-Modellen beibehalten.
7. Fehler nachvollziehbar behandeln: technische Fehler als **stabile
   Fehlercodes** übertragen, Lokalisierung erfolgt im Frontend.
8. Keine Secrets, Passwörter, Tokens in Quellcode, Logs, Tests oder
   Dokumentation. `.env` niemals committen oder in Antworten wiedergeben.
9. Sicherheitsprüfungen (Auth, Rollen, CSRF, Rate-Limit) **immer
   serverseitig**. Frontend-Guards sind reine UX.
10. Referenz-STEP-Dateien unter `reference/` sind **read-only**. Nicht
    überschreiben, nicht als STL-Quelle verwenden — Geometrie wird
    parametrisch aus BREP erzeugt.
11. `pitch = 21.09` bleibt `Literal` und im Code fest verankert.
12. Neue oder geänderte Tests im gleichen PR ergänzen.

---

## 4. Verbindliche i18n-Regeln

**i18n-Lösung:** `next-intl` v3. Sprachen: **`de` (Default)** und **`en`**.
Speicherort: `apps/web/src/i18n/messages/de.json` und `en.json`.
Locale wird per Cookie `NEXT_LOCALE` gesteuert (`apps/web/src/i18n/request.ts`).

Bei **jedem** sichtbaren Text gilt:

1. Kein hartkodierter deutscher/englischer Text in React-Komponenten,
   Server-Components oder Route-Handlern, wenn er UI-sichtbar ist. Nutze
   `useTranslations()` / `getTranslations()`.
2. Keine zweite i18n-Lösung einführen.
3. **Neue Keys immer in beiden Dateien** (`de.json` **und** `en.json`)
   im gleichen Commit ergänzen.
4. Bei Bedeutungsänderung Wert in allen Sprachen aktualisieren.
5. Bestehende Namenskonvention einhalten: hierarchisch punktiert
   (`generator.download`, `planner.usedCells`, `admin.settings.title`, …).
6. Variablen und Pluralformen über next-intl-ICU (`{count}`,
   `{count, plural, one {…} other {…}}`).
7. Datum/Zahl über `useFormatter()` / `getFormatter()` lokalisiert.
8. Nach Änderungen prüfen: gibt es Keys in einer Sprache, die in der
   anderen fehlen? Gibt es unbenutzte Keys?
9. Wenn eine EN-Übersetzung unsicher ist, ausdrücklich darauf hinweisen —
   **nicht** stillschweigend nur `de` ergänzen.
10. Serverfehler als stabile Codes (`"CAD_API_UNAVAILABLE"`, …) übertragen,
    Lokalisierung im Frontend.
11. Auch `aria-label`, `alt`, `<title>` und SEO-Metadaten
    (`generateMetadata`) übersetzen.

**Pflicht-Bestätigung am Ende jeder Aufgabe** (siehe Abschnitt 6).

---

## 5. Tests und Qualitätsprüfung

**Nichts als „grün" behaupten, was nicht wirklich lief.** Wenn ein Test
nicht ausgeführt werden konnte, dokumentiere: welcher, warum nicht,
wie der User ihn selbst startet, welches Risiko bleibt.

### Web (`apps/web`)

```powershell
cd apps\web
npm run lint         # ESLint (next lint)
npm run typecheck    # tsc --noEmit
npm run test         # Vitest (Unit: Zod, Layout-Store)
npm run build        # Produktions-Build
```

### Prisma / DB

```powershell
cd apps\web
npm run db:generate  # Prisma Client
npm run db:migrate   # Dev-Migration (lokal)
npm run db:deploy    # Prod-Migration (Server)
npm run db:seed      # Admin-Bootstrap (nutzt ADMIN_BOOTSTRAP_*)
```

### CAD-API + Geometrie (`services/cad-api`, `tests/`)

```powershell
.\.venv-cad\Scripts\python.exe -m pytest tests\geometry tests\api -q
```

### E2E (`tests/e2e`, Playwright, Chromium)

```powershell
cd tests\e2e
npm install
npm run test:install   # einmalig: Browser-Deps
npm run test           # benötigt laufenden Web-Server auf 6293
```

### CAD-API lokal starten

```powershell
$env:CAD_API_INTERNAL_TOKEN = "dev-only"
.\.venv-cad\Scripts\python.exe -m uvicorn app.main:app --app-dir services\cad-api --reload
```

---

## 6. Verpflichtende Antwort am Ende jeder Aufgabe

Jede Antwort auf eine Änderung **muss** mit diesen Abschnitten enden:

```
## Durchgeführte Änderungen
- geänderte Dateien
- kurze Beschreibung der Umsetzung

## Prüfung
- ausgeführte Tests und Builds mit Ergebnis
- nicht ausgeführte Prüfungen mit Begründung + Risiko

## i18n
- neue oder geänderte Übersetzungsschlüssel
- aktualisierte Sprachen (mindestens de, en)
- eventuell noch fehlende Übersetzungen

## README und Dokumentation
- aktualisierte Abschnitte in README.md / docs/
- oder Begründung, warum keine Aktualisierung notwendig war

## Deployment mit PM2
- ob ein Deployment notwendig ist
- exakte Befehle in richtiger Reihenfolge (siehe Abschnitt 7)
- betroffene PM2-Prozesse
- Migrationen / Vorbereitung
- Funktionsprüfung nach Deploy
- Rollback-Hinweis falls relevant
```

---

## 7. PM2-Deployment (Serverpfad = TODO, vom Nutzer bestätigen)

Die tatsächliche PM2-Konfiguration steht in `ecosystem.config.cjs`:

- **`slotcrate-web`** — `cwd: ./apps/web`, startet `next start -p 6293`.
- **`slotcrate-cad-api`** — `cwd: ./services/cad-api`, startet
  `<PYTHON_BIN> -m uvicorn app.main:app --app-dir . --host 127.0.0.1 --port 6294`.
  Auf Windows fällt `PYTHON_BIN` auf `.venv-cad\Scripts\python.exe` zurück,
  sonst auf `python3`. Für Plesk/Linux **immer** `PYTHON_BIN` auf den
  Interpreter der virtuellen Umgebung setzen.

> **Serverpfad, Server-User, Domain-Zuordnung: <!-- TODO: vom Nutzer bestätigen -->**
> Copilot verwendet in Deploy-Anleitungen den Platzhalter
> `<REPO_ROOT_ON_SERVER>` bis der reale Pfad im Repo dokumentiert ist.

### Deploy-Anleitung je Änderungstyp

Immer als konkrete Befehlsfolge angeben. Reload bevorzugt vor Restart.

**Nur Dokumentation** (README, docs/, Kommentare):
```
Deployment nicht erforderlich, da ausschließlich Dokumentation
beziehungsweise nicht produktionsrelevante Dateien geändert wurden.
```

**Reine Web-Änderung** (`apps/web/src/**` ohne DB-Schema, ohne Deps):
```powershell
cd <REPO_ROOT_ON_SERVER>
git pull
npm --prefix apps/web run build
npx pm2 reload slotcrate-web --update-env
npx pm2 status
npx pm2 logs slotcrate-web --lines 100
```

**Web + neue npm-Abhängigkeit** (`apps/web/package.json` geändert):
```powershell
cd <REPO_ROOT_ON_SERVER>
git pull
npm --prefix apps/web ci        # oder: install, wenn Lock nicht vorhanden
npm --prefix apps/web run build
npx pm2 reload slotcrate-web --update-env
```

**Prisma-Migration** (`apps/web/prisma/**`):
```powershell
cd <REPO_ROOT_ON_SERVER>
git pull
npm --prefix apps/web ci
npm --prefix apps/web run db:deploy
npm --prefix apps/web run build
npx pm2 reload slotcrate-web --update-env
```
Rollback: Migration manuell zurückrollen (Prisma bietet kein Auto-Down);
zuvor DB-Backup einspielen.

**CAD-API-Änderung** (`services/cad-api/**`):
```powershell
cd <REPO_ROOT_ON_SERVER>
git pull
# nur wenn requirements.txt geändert:
<PYTHON_BIN> -m pip install -r services/cad-api/requirements.txt
npx pm2 reload slotcrate-cad-api --update-env
npx pm2 logs slotcrate-cad-api --lines 100
curl -I http://127.0.0.1:6294/health
```

**Umgebungsvariable geändert oder neu**:
1. `.env` auf Server anpassen (nicht committen).
2. `npx pm2 reload <prozess> --update-env`
3. Bei Änderung an `NEXT_PUBLIC_*` **zusätzlich** `npm --prefix apps/web run build`.

**Beide Prozesse betroffen** (z. B. neue End-to-End-Funktion):
Reihenfolge: CAD-API zuerst, dann Web.
```powershell
npx pm2 reload slotcrate-cad-api --update-env
npx pm2 reload slotcrate-web --update-env
npx pm2 status
```

**Funktionsprüfung nach Deploy:**
- `curl -I http://127.0.0.1:6293` → HTTP 200/307
- `curl -I http://127.0.0.1:6294/health` → `{"status":"ok",…}`
- Betroffene UI-Route manuell prüfen (Generator, Planner, Admin).

**Bei Problemen prüfen:**
`npx pm2 status`, `npx pm2 logs slotcrate-web --lines 200`,
`npx pm2 logs slotcrate-cad-api --lines 200`, Plesk Reverse-Proxy
(siehe `docs/DEPLOY_PLESK_PM2.md`).

**Nie**: Secrets in Antworten schreiben, produktive DB löschen/resetten,
`pm2 delete` ohne Vorwarnung, `--force`-Pushes, Referenz-STEP-Dateien
modifizieren, PM2-Prozesse mit anderen Namen als
`slotcrate-web` / `slotcrate-cad-api` starten.

---

## 8. Dokumentationsregel

Wenn eine Änderung eines dieser Themen berührt, muss die README **oder**
die passende Datei unter `docs/` im selben Arbeitsschritt aktualisiert
werden:

Architektur · Installation · Konfiguration · Umgebungsvariablen · Datenbank ·
Deployment · PM2 · API-Contracts · Benutzerablauf · Admin-Funktionen ·
CAD-Generierung · i18n · Tests · Fehlerbehebung.

Andernfalls in der Abschlussmeldung kurz begründen, warum keine
Doku-Anpassung nötig ist.
