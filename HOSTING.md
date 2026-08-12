# Klassenkompass – Hosting und Betrieb

Stand: 12. August 2026

## Öffentliche Adresse und Zustand

- Öffentliche Website: <https://liaruxxx-lgtm.github.io/klassenkompass/>
- Quellcode und Versionsverlauf:
  <https://github.com/liaruxxx-lgtm/klassenkompass>
- Hosting: kostenloses GitHub Pages über HTTPS
- Zugriff: öffentlich, ohne GitHub-, ChatGPT- oder OpenAI-Konto
- Kanonischer Projektordner: `/Users/elias/Documents/ChatGPT/klassen ordner`
- Veröffentlichungsautomatik: `.github/workflows/deploy-pages.yml`

Der Klassenkompass ist derzeit eine statische Browser-App. Es läuft kein
Prozess auf dem Mac und kein eigener Server, der dauerhaft gestartet bleiben
muss. GitHub liefert die geprüften Dateien aus; der Mac darf ausgeschaltet sein.

Das Repository ist öffentlich, weil diese GitHub-Pages-Veröffentlichung den
kostenlosen öffentlichen Weg nutzt. Im Projekt befinden sich keine echten
Termine, Konten oder geheimen Zugangsdaten. Die Demo-Codes sind ohnehin Teil des
sichtbaren Frontend-Prototyps.

Die frühere OpenAI-Sites-Adresse
<https://klassenkompass-acht.bestefamilie.chatgpt.site> bleibt eine private
Vorschau mit ChatGPT-Anmeldung und ist nicht die Adresse für die Klasse.

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

Da die App statisch ist, gibt es keine laufenden Serverprozesse oder
Anwendungs-Serverlogs. Fehler beim Bauen und Veröffentlichen stehen im
GitHub-Actions-Lauf.

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

## Wichtige Grenze des Prototyps

Die Codes `S` und `A` werden nur im Browser geprüft und sind keine echte
Zugriffskontrolle. Termine werden noch nicht dauerhaft gespeichert und gehen
beim Neuladen verloren. Vor einer produktiven Nutzung durch die Klasse sind
eine Datenbank und echte Rollen beziehungsweise sichere Zugangscodes nötig.
