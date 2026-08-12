# Klassenkompass

Servergestützte Testversion für eine ruhige Jahresübersicht einer achten Klasse.
Lehrkräfte pflegen langfristige Termine, die anschließend für alle Geräte in
der Schüleransicht verfügbar sind.

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
- serverseitig geprüfte Testzugangscodes: `S` für Schüler und `A` für Lehrkräfte
- dynamisches Formular für Zeiträume und einzelne Termine
- einfache Pflichtfeld- und Datumsprüfung
- responsive Darstellung für Handy, Tablet und Desktop
- gemeinsame, dauerhafte Speicherung in einer Server-Datenbank

Termine werden über eine Server-API gespeichert und bei jedem Öffnen der
Schüler- oder Lehreransicht neu geladen. Sie bleiben daher nach einem Neuladen,
auf anderen Geräten und in anderen WLANs erhalten. Die einfachen Testcodes sind
noch keine persönlichen Benutzerkonten und sollten vor dem produktiven Einsatz
durch starke, nur der Klasse bekannte Codes oder echte Konten ersetzt werden.
