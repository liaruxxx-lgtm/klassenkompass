# Klassenkompass – Hosting und Betrieb

Stand: 7. September 2026

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

### Eigene GitHub-Pages-Domain

Der öffentliche Build verwendet standardmäßig den Repository-Pfad
`/klassenkompass/`. Für eine eigene Root-Domain muss der Pages-Basis-Pfad in
`vite.public.config.ts` an die eigene Hosting-Struktur angepasst werden. Die
konkrete Domain wird nur in der eigenen Hosting-Konfiguration festgelegt, nicht
im Vorlagen-Repository.

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
