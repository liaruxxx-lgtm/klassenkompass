# Klassenkompass

Servergestützte Testversion für eine ruhige Jahresübersicht einer achten Klasse.
Die Schüleransicht bündelt Stundenplan und langfristige Termine; Lehrkräfte
pflegen die Termine zentral für alle Geräte.

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

- Zugang, Schüler- und Admin-Ansicht
- Klassencode für Schüler sowie vorübergehender Admin-Zugang per eigenem Passwort
- Schutz vor automatisiertem Ausprobieren und zeitlich begrenzte Sitzungen
- dynamisches Formular für Zeiträume und einzelne Termine
- schreibgeschützter Stundenplan-Modus mit Unterrichtszeiten, Pausen und Gruppenfächern
- Bearbeiten und bestätigtes Löschen bestehender Termine in der Admin-Ansicht
- Admin-Änderungsprotokoll mit Zugangskennzeichnung, Datum/Uhrzeit,
  vollständigem Vorher-/Nachher-Stand und protokollierter Wiederherstellung
- einfache Pflichtfeld- und Datumsprüfung
- responsive Darstellung für Handy, Tablet und Desktop
- gemeinsame, dauerhafte Speicherung in einer Server-Datenbank
- fünf bestätigte Epochen sowie die Theater-Übungszeit fürs Achtklass-Stück
  aus dem Epochenplan 2026/2027

Termine werden über eine Server-API gespeichert und bei jedem Öffnen der
Schüler- oder Admin-Ansicht neu geladen. Sie bleiben daher nach einem Neuladen,
auf anderen Geräten und in anderen WLANs erhalten. Der produktive Schülercode
sowie das separate Admin-Passwort liegen ausschließlich als geschützte
Servereinstellungen vor und werden weder in die Browser-App noch in das
öffentliche Repository eingebaut. Ohne gültige Sitzung liefert die Termin-API
keine Daten aus.

Schüler geben weder Namen noch E-Mail-Adresse an. Bis die persönliche
E-Mail-Anmeldung auf Cloudflare bereitsteht, wird die Admin-Ansicht mit einem
separaten langen Passwort geschützt. Neue Änderungen erscheinen im Protokoll
als „Admin (Passwortzugang)“. Zeitpunkt, Aktion und Vorher-/Nachher-Stand bleiben
vollständig nachvollziehbar; eine konkrete Person kann mit einem gemeinsamen
Passwort vorübergehend nicht sicher zugeordnet werden.
