# Klassenkompass – Hosting und Betrieb

Stand: 12. August 2026

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
kostenlosen öffentlichen Weg nutzt. Im Projekt befinden sich keine echten
Termine oder Zugangsdaten. Die produktiven Testcodes werden als geschützte
Servereinstellungen verwaltet und nicht in die Browser-App eingebaut.

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
3. Nur den geprüften Stand bewusst committen.
4. Den `main`-Branch zu GitHub hochladen.
5. Die automatische GitHub-Pages-Veröffentlichung bis zum Erfolg überwachen.
6. Die feste Adresse ohne Anmeldung und mit geladener Bedienoberfläche prüfen.

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

## Speicherung und wichtige Grenze der Testversion

Die getrennten Schüler- und Admin-Codes werden ausschließlich auf dem Server
geprüft. Nur eine gültige Admin-Sitzung darf Termine schreiben;
Schüler-Sitzungen dürfen sie lesen. Termine liegen in der gemeinsamen
Server-Datenbank und bleiben nach Neuladen, Gerätewechsel und WLAN-Wechsel
erhalten. Die produktiven Codes gehören nur in die geschützten
Servereinstellungen und in die lokale, von Git ignorierte Passwortdatei. Sie
dürfen niemals in GitHub, Dokumentation oder Screenshots eingetragen werden.
Wiederholte Fehlversuche werden vorübergehend blockiert.
