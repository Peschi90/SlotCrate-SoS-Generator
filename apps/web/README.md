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
Der aktuelle Cover-Datensatz ist an `sc-124-v2` (SC V2 124) gebunden.
Die 3D-Ansicht und Front-Draufsicht verwenden dieselbe an die Coverbreite
angepasste Vorschaugröße; der STL-Export behält die gewählte Originalgröße.
Die Vorschau spiegelt die X-/Y-Koordinaten der 3D-Szene gegenüber der
SVG-Draufsicht korrekt.

Die Webfonts werden über `next/font/google` beim Build lokal eingebettet.
Für die CAD-API müssen dieselben Fontfamilien zusätzlich auf dem Linux-Server
installiert und der Font-Cache aktualisiert werden:

```bash
sudo apt-get update
sudo apt-get install -y fonts-roboto fonts-urw-base35
fc-cache -f -v
fc-list | grep -E 'Roboto Condensed|Oswald|Arial'
```

Für die übrigen Google-Fonts aus der Cover-Auswahl müssen die jeweiligen
statischen TTF-Dateien aus Google Fonts unter `/usr/local/share/fonts/slotcrate`
abgelegt und anschließend mit `fc-cache -f -v` registriert werden. Variable
Fontdateien werden für CadQuery nicht vorausgesetzt. Der CAD-Service lehnt
eine nicht installierte Familie ab, damit nicht unbemerkt eine Ersatzschrift
in die STL gelangt.

Die Dateien können reproduzierbar mit `scripts/download-cover-fonts.sh`
(Linux) beziehungsweise `scripts/download-cover-fonts.ps1` (Windows) aus dem
offiziellen Google-Fonts-Repository geladen werden. Danach für Linux:

```bash
sudo cp services/cad-api/fonts/*.ttf /usr/local/share/fonts/slotcrate/
sudo fc-cache -f -v
```

Arial wird nicht automatisch heruntergeladen, da die Microsoft-Schrift separat
lizenziert ist und als eigene Fontdatei bereitgestellt werden muss.
