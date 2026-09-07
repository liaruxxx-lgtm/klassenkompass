# Klassenkompass – Hosting und Betrieb

Stand: 7. September 2026

## Öffentliche Adresse und Zustand

- Öffentliche Website: <https://liaruxxx-lgtm.github.io/klassenkompass/>
- Öffentlicher Serverdienst: <https://klassenkompass-online.liarux.chatgpt.site>
- Quellcode und Versionsverlauf:
  <https://github.com/liaruxxx-lgtm/klassenkompass>
- Öffentliche Oberfläche: GitHub Pages über HTTPS
- Gemeinsamer Server und Datenbank: Sites mit D1
- Zugriff: öffentlich, ohne GitHub-, ChatGPT- oder OpenAI-Konto
- Kanonischer Projektordner: `/Users/elias/Documents/ChatGPT/klassen ordner`
- Veröffentlichungsautomatik: `.github/workflows/deploy-pages.yml`

Die öffentliche Oberfläche wird weiterhin von GitHub ausgeliefert. Zugänge und
Termine laufen zusätzlich über einen dauerhaften Serverdienst mit gemeinsamer
Datenbank. Der Mac darf ausgeschaltet sein; weder Website noch Speicherung
hängen vom Heim-WLAN oder einem laufenden lokalen Prozess ab.

Das Repository ist öffentlich, weil diese GitHub-Pages-Veröffentlichung den
kostenlosen öffentlichen Weg nutzt. Im Projekt befinden sich nur die fünf aus
dem Epochenplan 2026/2027 übernommenen Epochen und die Theater-Übungszeit fürs
Achtklass-Stück, aber keine Zugangsdaten oder personenbezogenen Termine. Der
produktive Schülercode und das vorübergehende Admin-Passwort werden als
geschützte Servereinstellungen verwaltet und nicht in die Browser-App eingebaut.

Die frühere OpenAI-Sites-Adresse
<https://klassenkompass-acht.bestefamilie.chatgpt.site> bleibt eine alte private
Vorschau. Sie ist nicht mehr der aktuelle Server des Klassenkompasses.

## Bedienung über Codex

Für den normalen Betrieb sind keine Terminalbefehle nötig. Einen Codex-Task im
kanonischen Projektordner öffnen und den gewünschten Auftrag klar formulieren.

### Status überwachen

Beispielauftrag:

> Prüfe, ob der öffentliche Klassenkompass erreichbar ist und ob die letzte
> GitHub-Pages-Veröffentlichung erfolgreich war. Verändere nichts.

Codex prüft dabei mindestens:

1. den Status des letzten GitHub-Actions-Laufs,
2. die ausgelieferte Git-Version,
3. eine unabhängige HTTPS-Anfrage an die öffentliche Adresse und
4. bei einem gemeldeten Bedienfehler die Browser-Konsole.

Zusätzlich zur öffentlichen Oberfläche werden dabei Server und Datenbank geprüft.
Fehler beim Bauen und Veröffentlichen stehen im GitHub-Actions-Lauf; Fehler der
Termin-API können außerdem in den Serverprotokollen geprüft werden.

### Website ausschalten

Beispielauftrag:

> Schalte die öffentliche GitHub-Pages-Seite des Klassenkompasses aus, erhalte
> aber Repository und Versionsverlauf, und verifiziere anschließend, dass die
> Website nicht mehr erreichbar ist.

Codex deaktiviert dafür GitHub Pages. Der Quellcode und die Versionshistorie
bleiben erhalten. Das ist wiederherstellbar und etwas anderes als das
unwiderrufliche Löschen des Repositorys.

### Website wieder einschalten

Beispielauftrag:

> Aktiviere GitHub Pages für den Klassenkompass wieder, veröffentliche den
> aktuellen Stand und prüfe die öffentliche Adresse.

Codex aktiviert den GitHub-Actions-Hostingweg erneut, startet die
Veröffentlichung und wartet auf die erfolgreiche HTTPS-Prüfung.

### Eine neue Version veröffentlichen

Beispielauftrag:

> Prüfe die aktuellen Klassenkompass-Änderungen vollständig und veröffentliche
> sie als neue Version unter derselben öffentlichen Adresse.

Der sichere Ablauf ist:

1. Änderungen im kanonischen Projektordner prüfen.
2. `npm test`, `npm run lint` und die TypeScript-Prüfung erfolgreich ausführen.
3. Bei Server-/Datenbankänderungen zuerst die neue Sites-Version samt D1-Migration
   nach ausdrücklicher Freigabe veröffentlichen und die geschützten API-Wege
   prüfen.
4. Nur den geprüften Stand bewusst committen.
5. Den `main`-Branch zu GitHub hochladen.
6. Die automatische GitHub-Pages-Veröffentlichung bis zum Erfolg überwachen.
7. Die feste Adresse ohne Anmeldung und mit geladener Bedienoberfläche prüfen.

Ein lokaler Entwurf wird nicht automatisch öffentlich. Erst ein bewusst auf
`main` hochgeladener Commit löst die Veröffentlichung aus. Die Adresse bleibt
bei Updates unverändert.

### Eine frühere Version wiederherstellen

Beispielauftrag:

> Zeige mir die letzten Klassenkompass-Versionen. Stelle nach meiner Auswahl
> die gewünschte frühere Version als neuen, nachvollziehbaren Wiederherstellungs-
> Commit her und veröffentliche sie.

Codex soll keine Historie löschen oder umschreiben. Die Wiederherstellung wird
als neuer Commit dokumentiert, erneut geprüft und über denselben Pages-Workflow
veröffentlicht.

### Einen früheren Terminstand wiederherstellen

Dieser Vorgang ist von der Wiederherstellung einer ganzen Website-Version zu
unterscheiden. In der Admin-Ansicht:

1. Im Reiter „Admin“ das geschützte Admin-Passwort eingeben.
2. „Änderungsprotokoll“ öffnen.
3. Beim gewünschten Eintrag „Vorherigen Stand und Änderung ansehen“ aufklappen.
4. Vorher- und Nachher-Werte vollständig vergleichen.
5. „Stand davor wiederherstellen“ wählen und die konkrete Auswirkung bestätigen.

Die Wiederherstellung setzt nur den betroffenen Termin auf den Zustand direkt
vor der ausgewählten Änderung zurück. Existierte der Termin damals noch nicht,
wird er entfernt. Der aktuelle Zustand und die Wiederherstellung bleiben als
neue Protokolleinträge erhalten; die Historie wird weder gelöscht noch
überschrieben.

## Speicherung und Zugangsschutz

Der Schülercode wird ausschließlich auf dem Server geprüft. Schüler geben weder
Namen noch E-Mail-Adresse an und erhalten nur Leserechte. Bis die geplante
persönliche E-Mail-Anmeldung auf Cloudflare bereitsteht, schützt ein separates,
langes Admin-Passwort die Admin-Ansicht. Es öffnet eine vier Stunden gültige
Admin-Sitzung. Wiederholte Fehlversuche werden vorübergehend blockiert.

Für den Betrieb müssen die folgenden geschützten Servereinstellungen vorhanden
sein. Ihre tatsächlichen Werte dürfen niemals in GitHub, Dokumentation oder
Screenshots eingetragen werden:

- `STUDENT_ACCESS_CODE`: langer, zufälliger Klassencode
- `ADMIN_ACCESS_CODE`: anderes, langes und zufälliges Admin-Passwort
- `AUTH_RATE_LIMIT_SECRET`: zufälliges Geheimnis mit mindestens 32 Zeichen

Das Änderungsprotokoll ist ausschließlich für eine gültige Admin-Sitzung
abrufbar. Während des vorübergehenden gemeinsamen Passwortzugangs werden neue
Änderungen ehrlich als „Admin (Passwortzugang)“ protokolliert; eine bestimmte
Person lässt sich damit nicht sicher zuordnen. Vollständige Terminstände,
Zeitpunkt und Aktion bleiben dennoch erhalten und wiederherstellbar. Trotzdem
dürfen keine sensiblen Schüler-, Gesundheits-, Leistungs- oder Kontaktdaten in
Terminen eingetragen werden.
