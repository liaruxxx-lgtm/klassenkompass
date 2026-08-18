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
- getrennte, serverseitig geprüfte Zugangscodes für Schüler und Lehrkräfte
- Schutz vor automatisiertem Ausprobieren und zeitlich begrenzte Sitzungen
- dynamisches Formular für Zeiträume und einzelne Termine
- Bearbeiten und bestätigtes Löschen bestehender Termine in der Lehreransicht
- einfache Pflichtfeld- und Datumsprüfung
- responsive Darstellung für Handy, Tablet und Desktop
- gemeinsame, dauerhafte Speicherung in einer Server-Datenbank
- fünf bestätigte Epochen sowie die Theater-Übungszeit fürs Achtklass-Stück
  aus dem Epochenplan 2026/2027

Termine werden über eine Server-API gespeichert und bei jedem Öffnen der
Schüler- oder Lehreransicht neu geladen. Sie bleiben daher nach einem Neuladen,
auf anderen Geräten und in anderen WLANs erhalten. Die produktiven Codes liegen
ausschließlich als geschützte Servereinstellungen vor und werden weder in die
Browser-App noch in das öffentliche Repository eingebaut. Ohne gültige Sitzung
liefert die Termin-API keine Daten aus.
