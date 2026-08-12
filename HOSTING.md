# Klassenkompass – Hosting und Betrieb

Stand: 12. August 2026

## Adresse und aktueller Zustand

- Kostenlose Webadresse: <https://klassenkompass-acht.bestefamilie.chatgpt.site>
- Hosting: OpenAI Sites auf serverloser Infrastruktur; der Mac muss dafür nicht
  eingeschaltet bleiben.
- Aktueller Zugriff: privat, nur nach ChatGPT-Anmeldung. Die öffentliche
  Freigabe für jeden mit dem Link ist noch ausstehend.
- Kanonischer Projektordner: `/Users/elias/Documents/ChatGPT/klassen ordner`
- Sites-Zuordnung: `.openai/hosting.json`

## Bedienung über Codex

Für den normalen Betrieb sind keine Terminalbefehle nötig. Einen Codex-Task im
kanonischen Projektordner öffnen und den gewünschten Auftrag klar formulieren.

### Status überwachen

Beispielauftrag:

> Prüfe, ob der Klassenkompass öffentlich erreichbar ist, und lies nur die
> Fehlerprotokolle der letzten 60 Minuten. Verändere nichts.

Codex prüft dabei den aktuellen Hosting-Status, die Produktionsadresse und bei
Bedarf die Serverfehler. Für eine unabhängige Sichtbarkeitsprüfung muss die
Adresse zusätzlich ohne Anmeldung beziehungsweise in einem privaten
Browserfenster die Klassenkompass-Startseite liefern.

### Öffentlich ausschalten

Beispielauftrag:

> Stelle den Klassenkompass sofort wieder auf privat und verifiziere, dass ein
> nicht angemeldeter Besucher keinen Zugriff mehr hat.

Das stoppt keinen lokalen Dauerprozess, sondern entzieht der Öffentlichkeit den
Zugriff. Die gespeicherten Versionen und die Webadresse bleiben erhalten.

### Wieder öffentlich einschalten

Beispielauftrag:

> Gib den aktuell veröffentlichten Klassenkompass wieder für jeden mit dem Link
> frei und prüfe die Adresse ohne Anmeldung.

Eine Änderung auf „öffentlich“ ist eine bewusste Freigabe und muss vor dem
Ausführen ausdrücklich bestätigt werden.

### Eine neue Version veröffentlichen

Beispielauftrag:

> Prüfe die aktuellen Klassenkompass-Änderungen vollständig und veröffentliche
> sie als neue Version unter derselben Adresse.

Der sichere Ablauf ist:

1. Änderungen im kanonischen Projektordner prüfen.
2. Produktions-Build und Tests erfolgreich ausführen.
3. Den exakt geprüften Quellstand speichern.
4. Eine neue Sites-Version anlegen und veröffentlichen.
5. Produktionsstatus und feste Adresse verifizieren.

Die Veröffentlichung ist nicht automatisch: Lokale Änderungen werden erst nach
diesem Ablauf live. Die vorherigen Sites-Versionen bleiben für eine mögliche
Wiederherstellung erhalten.

### Eine frühere Version wiederherstellen

Beispielauftrag:

> Zeige die gespeicherten Klassenkompass-Versionen und stelle nach meiner
> Auswahl die gewünschte frühere Version wieder her.

Vor dem Wechsel soll Codex die Versionsnummer und den Zielzustand nennen. Nach
dem Wechsel ist dieselbe Webadresse erneut zu prüfen.

## Wichtige Grenze des Prototyps

Die Codes `S` und `A` werden nur im Browser geprüft und sind keine echte
Zugriffskontrolle. Termine werden noch nicht dauerhaft gespeichert und gehen
beim Neuladen verloren. Vor einer produktiven Nutzung durch die Klasse sind
eine Datenbank und echte Rollen beziehungsweise sichere Zugangscodes nötig.
