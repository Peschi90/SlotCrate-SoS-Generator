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

Die Cover-Vorschau zeigt die abgeschrägte Referenzform mit den rückseitigen
Vertiefungen. Eine separate Front-Draufsicht rendert den Text als lokale
Canvas-Textur; dort kann er direkt verschoben und über den Drehgriff rotiert
werden. Sie benötigt
keinen externen Font-Resolver oder CDN-Zugriff. Netzwerkquellen bleiben auf
`'self'` begrenzt.

Die Cover-Gravur verwendet eine Konturbreite von 0,4 mm und unterstützt
Innenkonturen in Buchstabenprofilen. Schriftgrößen bis 60 mm und die im
Frontend angebotenen Schriften werden serverseitig als Whitelist validiert.
