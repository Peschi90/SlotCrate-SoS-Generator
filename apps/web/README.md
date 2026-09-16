# @slotcrate/web

Next.js 14 App-Router-Anwendung mit TypeScript, React Three Fiber,
Zustand-Store und next-intl (de/en).

## Setup

```powershell
cd apps\web
npm install
npm run typecheck
npm run test
npm run dev
```

Umgebungsvariablen (siehe `.env.example`):

- `CAD_API_URL` – Basis-URL zur FastAPI, Standard `http://localhost:6294`
- `CAD_API_INTERNAL_TOKEN` – Bearer-Token, nur server-seitig verwendet

Der interne Token wird niemals ins Bundle geliefert; alle CAD-Aufrufe
laufen über `/app/api/*`-Route-Handler.

Der Cover-Generator ist unter `/cover` erreichbar. Die Vorschau verwendet
die Cover-Abmessungen und übergibt Text, Position, Drehung und Schriftgröße
an `/api/cover/stl`; die verbindliche BREP-Gravur wird serverseitig aus
`reference/SC_SM_Cover.step` erzeugt.

Die CSP erlaubt zusätzlich `blob:` in `script-src`, weil `@react-three/drei`
beziehungsweise `troika-three-text` den Text-Worker über `importScripts` aus
einer Blob-URL initialisiert. Netzwerkquellen bleiben auf `'self'` begrenzt.
