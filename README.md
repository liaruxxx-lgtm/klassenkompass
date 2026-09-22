# Klassenkompass

> [!WARNING]
> **Projektstatus:** Dieses Projekt befindet sich in aktiver Entwicklung, ist noch
> nicht fertiggestellt und kann unvollständige oder fehlerhafte Funktionen
> enthalten. Änderungen können jederzeit und ohne Vorankündigung erfolgen.
>
> **Haftungshinweis:** Nutzung, Installation und Weiterverwendung erfolgen auf
> eigene Gefahr. Soweit gesetzlich zulässig, wird keine Haftung für unmittelbare
> oder mittelbare Schäden, Datenverluste, Fehlfunktionen, Sicherheitsprobleme
> oder sonstige Folgen übernommen. Es gibt keine Garantie für Funktionsfähigkeit,
> Richtigkeit, Sicherheit oder Eignung für einen bestimmten Zweck.

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

## Native iOS-Schüler-App

Die native SwiftUI-Schüler-App ist bewusst ein eigenes Projekt und ein eigenes
Repository: [separates Klassenkompass-iOS-Repository](https://github.com/liaruxxx-lgtm/klassenkompass-ios).
Dadurch enthält eine Installation der Web-Version nicht automatisch die
iOS-App. Die App nutzt dieselbe API, wird aber separat in Xcode eingerichtet
und installiert.

Die App enthält nur die Schüleransicht. Token und Klassencode werden im
iOS-Keychain gespeichert; die Anleitung im iOS-Repository erklärt, wie die
API-Domain beim ersten Einrichten selbst festgelegt wird.

## Hosting und Betrieb

Es ist absichtlich keine öffentliche Standard-Domain im Quellcode hinterlegt.
Wähle bei der Erstinstallation selbst eine Web-Domain und eine API-Domain
oder betreibe beides unter derselben Domain. Die vollständige Anleitung für
Domains, Secrets, GitHub Pages und die Serverkonfiguration steht in
[HOSTING.md](HOSTING.md).

Für einen normalen eigenen Aufbau sind `app.deinedomain.de` für die Web-App
und `api.deinedomain.de` für die API am einfachsten. Die DNS-Ziele kommen vom
jeweiligen Hostinganbieter und werden nicht im Repository vorgegeben. Die
Anleitung beschreibt auch, wie du die GitHub-Actions-Variable
`KLASSENKOMPASS_API_BASE_URL` und die geschützte Server-Origin setzt, ohne
Passwörter oder Klassencodes zu veröffentlichen.

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
