# Klassenkompass – Hosting und Betrieb

Stand: 22. September 2026

## Grundsatz

Dieses Repository enthält keine produktive Domain, keinen Klassencode und kein
Admin-Passwort. Bei jeder eigenen Installation werden diese Werte selbst
festgelegt. Die Web-Version und die native iOS-App sind getrennte Projekte;
die iOS-App liegt im [separaten iOS-Repository](https://github.com/liaruxxx-lgtm/klassenkompass-ios).

Für eine Installation gibt es zwei frei wählbare Origins:

- `WEB_ORIGIN`: die genaue Browser-Origin der Web-Version
- `API_BASE_URL`: die HTTPS-Origin des Klassenkompass-Servers

Beide können unter derselben Domain liegen. Wenn sie verschieden sind, muss
die API die `WEB_ORIGIN` als erlaubte CORS-Origin kennen.

## Erstinstallation

1. Lege die beiden Origins bei deinem Hoster fest. Trage keine Beispielwerte
   aus dieser Anleitung unverändert als produktive Konfiguration ein.
2. Lege beim Server drei neue, zufällige Werte an und speichere sie nur als
   geschützte Server-Secrets:

   - `STUDENT_ACCESS_CODE`: langer Klassencode
   - `ADMIN_ACCESS_CODE`: anderes, langes Admin-Passwort
   - `AUTH_RATE_LIMIT_SECRET`: zufälliger Wert mit mindestens 32 Zeichen

   Keiner dieser Werte gehört in GitHub, Screenshots oder die Web-App.
3. Setze beim Server zusätzlich `KLASSENKOMPASS_WEB_ORIGIN` auf die exakte
   `WEB_ORIGIN` ohne abschließenden `/`. Wenn Web und API dieselbe Origin
   verwenden, kann der Wert leer bleiben.
4. Lege in den GitHub-Repository-Einstellungen unter **Settings → Actions →
   Variables** die Repository-Variable `KLASSENKOMPASS_API_BASE_URL` auf die
   gewählte `API_BASE_URL` ohne abschließenden `/`.
5. Aktiviere GitHub Pages über den Workflow **Klassenkompass veröffentlichen**.
   Der Workflow baut ausschließlich die öffentliche Web-Oberfläche. Secrets
   werden nicht in den Pages-Build übertragen.
6. Prüfe anschließend die Web-Oberfläche, einen anonymen API-Aufruf und den
   Schülerlogin. Ein anonymer Aufruf von `GET /api/events` muss `401`
   zurückgeben.

## Eigene Domain: Registrierung und DNS

Die folgenden Beispiele verwenden `example.de`. Ersetze die Platzhalter nur in
deiner Hosting-Konfiguration, nicht durch echte Werte in diesem Repository.
Empfohlen sind zwei Subdomains:

- `app.example.de` für die öffentliche Web-Oberfläche auf GitHub Pages
- `api.example.de` für den Klassenkompass-Server und die Datenbank

Eine Domain kaufst du bei einem Registrar deiner Wahl. Entscheidend ist, dass
du dort die DNS-Zone bearbeiten kannst. Die Menüpunkte heißen je nach Anbieter
zum Beispiel **DNS**, **DNS Records**, **Zone Editor** oder **Domain verwalten**.

### 1. Domain beim Registrar anlegen

1. Registriere `example.de` bei einem Registrar und öffne dessen DNS-Verwaltung.
2. Verwende zunächst die beiden Subdomains `app` und `api`; eine Root-Domain
   (`example.de` ohne Subdomain) braucht je nach Anbieter andere A-, ALIAS- oder
   ANAME-Einträge.
3. Trage noch keine Zugangscodes, Passwörter oder Datenbankwerte als DNS-Wert
   ein. DNS-Einträge enthalten nur technische Ziele und Validierungswerte.

### 2. Web-Domain mit GitHub Pages verbinden

1. Öffne im Repository **Settings → Pages** und stelle unter **Build and
   deployment** den Workflow **Klassenkompass veröffentlichen** ein.
2. Trage unter **Custom domain** die gewünschte Web-Adresse, zum Beispiel
   `app.example.de`, ein und speichere sie.
3. GitHub zeigt dir das für dein Repository gültige Ziel an. Lege beim
   Registrar genau den dort genannten DNS-Eintrag an. Für eine Subdomain ist es
   normalerweise ein `CNAME` für `app`; rate das Ziel nicht und übernimm keine
   Beispieladresse aus einer fremden Anleitung.
4. Warte auf die DNS-Prüfung. Aktiviere **Enforce HTTPS** erst, wenn GitHub das
   Zertifikat als bereit meldet.
5. Wenn die Web-App direkt unter `https://app.example.de/` liegt, ändere in
   `vite.public.config.ts` den Basis-Pfad von `/klassenkompass/` auf `/`. Für
   die unveränderte GitHub-Pages-Projektadresse bleibt `/klassenkompass/`
   richtig.

### 3. API-Domain mit dem Server verbinden

1. Öffne im Dashboard deines API-Hosters die Funktion **Custom domain**,
   **Domains** oder **Domain mapping** und füge `api.example.de` hinzu.
2. Übernimm die vom Hoster ausgegebenen DNS-Einträge exakt. Das kann ein
   `CNAME`, bei einer Root-Domain auch ein A-/ALIAS-/ANAME-Eintrag, sowie ein
   zusätzlicher `TXT`- oder `CNAME`-Validierungseintrag sein.
3. Warte, bis DNS und das HTTPS-Zertifikat beim Hoster als aktiv angezeigt
   werden. Die API muss anschließend unter
   `https://api.example.de/api/events` erreichbar sein.
4. Setze in den geschützten Server-Einstellungen:

   - `KLASSENKOMPASS_WEB_ORIGIN=https://app.example.de`
   - `STUDENT_ACCESS_CODE` und optional die Gruppencodes
   - `ADMIN_ACCESS_CODE`
   - `AUTH_RATE_LIMIT_SECRET`

   Die Werte gehören in den Secret-/Environment-Bereich des Hosters, nicht in
   GitHub, `.env.example`, Screenshots oder die Web-App.

### 4. GitHub-Variable für den API-Endpunkt setzen

1. Öffne im Repository **Settings → Secrets and variables → Actions →
   Variables**.
2. Lege die Repository-Variable `KLASSENKOMPASS_API_BASE_URL` an oder ändere
   sie auf `https://api.example.de` ohne abschließenden `/`.
3. Diese URL ist kein Passwort und darf beim Pages-Build in die öffentliche
   Web-App eingebaut werden. Tokens und Zugangscodes dürfen dort niemals
   stehen.
4. Pushe anschließend den geprüften Stand auf `main`. Der Workflow baut die
   Pages-Version mit der neuen API-Adresse automatisch neu.

### 5. DNS und Betrieb prüfen

Die konkrete DNS-Ausgabe hängt vom Registrar und Hoster ab. Lokal kannst du
die Auflösung mit diesen Befehlen prüfen:

```bash
dig +short app.example.de
dig +short api.example.de
```

Danach sollten mindestens diese Prüfungen erfolgreich sein:

```bash
curl -I https://app.example.de/
curl -i https://api.example.de/api/events
```

Die Web-Adresse muss `200` liefern. Ein anonymer API-Aufruf muss `401` und
`Cache-Control: no-store` liefern; das ist bei dieser Anwendung ein erwarteter
Schutz und kein Fehler. Danach den Schüler- und Adminzugang mit Testdaten
prüfen. Wenn Web- und API-Domain verschieden sind und der Browser einen
CORS-Fehler meldet, muss `KLASSENKOMPASS_WEB_ORIGIN` exakt mit der Web-Origin
übereinstimmen, ohne abschließenden `/`.

### Eigene GitHub-Pages-Domain – Kurzfassung

Der öffentliche Build verwendet standardmäßig den Repository-Pfad
`/klassenkompass/`. Für eine eigene Web-Root-Domain wird der Pages-Basis-Pfad
auf `/` gesetzt und die Custom-Domain in **Settings → Pages** hinterlegt. Die
konkrete Domain, der API-Hostname und alle DNS-/Validierungseinträge werden nur
in der eigenen Hosting-Konfiguration festgelegt, nicht im Vorlagen-Repository.

Eine neue Domain ändert nur die Adresse. Sie verschiebt die Datenbank nicht
automatisch zu einem anderen Anbieter. Für einen vollständigen Hostingwechsel
müssen Daten und Migration separat gesichert, übertragen, live geprüft und der
alte Dienst erst danach abgeschaltet werden.

## Laufender Betrieb

Eine neue Version wird veröffentlicht, indem Änderungen geprüft, getestet und
auf `main` gepusht werden. Der Workflow baut danach automatisch die Web-Version.

Vor jedem Push:

```bash
npm ci
npm test
npm run lint
git diff --check
```

Bei Server- oder Datenbankänderungen muss zusätzlich die Server-Version samt
Datenbankmigration veröffentlicht und anschließend mit einem Schüler- und
einem Admin-Test geprüft werden.

## Daten- und Zugangsschutz

Die Schüleransicht benötigt nur den Klassencode und erhält Leserechte. Die
Admin-Ansicht benötigt das separate Admin-Passwort. Schülernamen, E-Mail-
Adressen, Gesundheitsdaten, Leistungsdaten und Kontaktdaten gehören nicht in
Termine oder das Änderungsprotokoll.

Das Änderungsprotokoll speichert Vorher-/Nachher-Stände und bleibt nur nach
gültiger Admin-Anmeldung erreichbar. Ein gemeinsames Passwort kann keine
bestimmte Person sicher identifizieren; dafür wäre später eine persönliche
Anmeldung mit einem passenden Identitätsdienst erforderlich.

## Abschalten und Wiederherstellen

GitHub Pages kann in den Repository-Einstellungen oder durch Deaktivieren des
Workflows abgeschaltet werden. Repository und Versionshistorie bleiben dabei
erhalten. Eine frühere Version wird als neuer Commit wiederhergestellt; die
Historie wird nicht umgeschrieben.
