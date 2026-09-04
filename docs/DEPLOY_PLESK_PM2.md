# Plesk Deploy Mit PM2

Diese Anleitung beschreibt den Betrieb ohne Docker auf einem Plesk-Server mit PM2.

## Ziel-Ports

- Web-App: `6293`
- CAD-API: `6294`

Die CAD-API läuft nur intern auf `127.0.0.1:6294`. Die Web-App spricht sie über `NEXT_PUBLIC_CAD_API_URL=http://127.0.0.1:6294` an.

## Voraussetzungen

- Node.js in Plesk aktiviert
- Python 3 verfügbar
- MySQL-Datenbank `slotcrate-sos-gen`
- Datenbankbenutzer `slotcrate-sos-gen-user`
- PM2 installiert

## Umgebungsvariablen

Setze auf dem Server mindestens diese Werte:

```env
PORT=6293
NEXT_PUBLIC_CAD_API_URL=http://127.0.0.1:6294
DATABASE_URL=mysql://slotcrate-sos-gen-user:<DB_PASSWORT>@127.0.0.1:3306/slotcrate-sos-gen
SESSION_SECRET=<lange-zufällige-zeile>
CSRF_SECRET=<andere-lange-zufällige-zeile>
CAD_API_INTERNAL_TOKEN=<gemeinsamer-bearer-token>
```

Optional für den ersten Admin-Bootstrap:

```env
ADMIN_BOOTSTRAP_EMAIL=<deine-admin-mail>
ADMIN_BOOTSTRAP_PASSWORD=<dein-langres-passwort>
```

## Web-App deployen

1. Repo auf den Server laden.
2. Im Repo-Root installieren und bauen:

```powershell
cd <repo-root>
npm install --prefix apps/web
npm --prefix apps/web run build
```

3. Prisma-Migrationen ausführen:

```powershell
npm --prefix apps/web run db:deploy
```

4. Einmalig den Admin anlegen:

```powershell
npm --prefix apps/web run db:seed
```

5. Web-App mit PM2 starten:

```powershell
pm2 start ecosystem.config.cjs --only slotcrate-web
```

## CAD-API deployen

1. Python-Abhängigkeiten installieren:

```powershell
python3 -m pip install -r services/cad-api/requirements.txt
```

Hinweis: `cadquery==2.8.0` ist derzeit nicht auf PyPI verfügbar. Das Projekt pinnt deshalb auf `cadquery==2.4.0`. Falls dein System-Python zu neu ist und kein passendes Wheel findet, nutze eine virtuelle Umgebung mit Python `3.11`.

2. CAD-API mit PM2 starten:

```powershell
pm2 start ecosystem.config.cjs --only slotcrate-cad-api
```

Falls dein Server kein `python3` kennt, setze vor dem Start `PYTHON_BIN` auf den vollständigen Pfad zum Python-Interpreter der virtuellen Umgebung.

## PM2 nützliche Befehle

```powershell
pm2 status
pm2 logs slotcrate-web
pm2 logs slotcrate-cad-api
pm2 restart slotcrate-web
pm2 restart slotcrate-cad-api
pm2 save
```

## Hinweise für Plesk

- Die öffentliche Domain sollte auf die Web-App zeigen.
- Die CAD-API sollte nicht direkt per Domain erreichbar sein.
- Wenn Plesk den App-Prozess selbst verwaltet, nutze entweder Plesk oder PM2 für denselben Dienst, nicht beides gleichzeitig.
- Nach Code-Updates immer `npm --prefix apps/web run build` für die Web-App und bei Python-Änderungen die PM2-Prozesse neu starten.
