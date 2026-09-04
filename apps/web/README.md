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
