# Klassenkompass

Reiner Frontend-Prototyp für eine ruhige Jahresübersicht einer achten Klasse.
Die App zeigt, wie Schüler langfristige Termine sehen und wie Lehrkräfte den
Jahresrahmen pflegen könnten.

## Lokal starten

Voraussetzung: Node.js `>=22.13.0`.

```bash
npm install
npm run dev
```

Anschließend die im Terminal ausgegebene lokale Adresse öffnen.

## Prüfen

```bash
npm test
npm run lint
```

## Hosting und Betrieb

Die feste kostenlose öffentliche Adresse lautet:

<https://liaruxxx-lgtm.github.io/klassenkompass/>

Der Hosting-Stand und die einfachen Bedienabläufe für Statusprüfung,
Veröffentlichen, Ausschalten und Wiederherstellen sind in
[HOSTING.md](HOSTING.md) dokumentiert. Die Adresse bleibt bei späteren
Versionen gleich.

## Umfang dieses Prototyps

- Zugang, Schüler- und Lehreransicht
- lokale Demo-Zugangscodes: `S` für Schüler und `A` für Lehrkräfte
- dynamisches Formular für Zeiträume und einzelne Termine
- einfache Pflichtfeld- und Datumsprüfung
- responsive Darstellung für Handy, Tablet und Desktop
- ausschließlich flüchtiger React-Zustand

Es gibt bewusst keine Datenbank, API, echte Authentifizierung oder dauerhafte
Speicherung. Die Demo-Codes werden ausschließlich im React-Frontend geprüft und
sind keine Sicherheitsfunktion. Nach einem Neuladen sind alle eingegebenen
Termine wieder verschwunden.
