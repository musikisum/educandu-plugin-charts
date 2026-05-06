# Anleitung: Neues educandu-Plugin aus Template erstellen

Diese Anleitung beschreibt alle Schritte, um das Template-Repository
`educandu/educandu-plugin-example` in ein neues Plugin umzubauen.

---

## Variablen festlegen

Vor Beginn zwei Namen festlegen (alles kebab-case):

| Variable       | Beispiel       | Beschreibung                                         |
|----------------|----------------|------------------------------------------------------|
| `{namespace}`  | `musikisum`    | GitHub/NPM-Organisations- oder Benutzername          |
| `{plugin}`     | `charts`       | Kurzname des Plugins                                 |

Daraus ergeben sich:

- **Repo- und NPM-Name:** `{namespace}/educandu-plugin-{plugin}` → `musikisum/educandu-plugin-charts`
- **typeName / Übersetzungs-Namespace:** `{namespace}/educandu-plugin-{plugin}` → `musikisum/educandu-plugin-charts`
- **CSS-Klassen-Präfix:** `EP_{Namespace}_{Plugin}_` → `EP_Musikisum_Charts_`

---

## Schritt 1 — Neues GitHub-Repository anlegen

1. Auf GitHub ein neues leeres Repository anlegen:
   - Name: `educandu-plugin-{plugin}` (z.B. `educandu-plugin-charts`)
   - **Kein** README, keine .gitignore, keine Lizenz initialisieren
2. Die Repository-URL notieren: `https://github.com/{namespace}/educandu-plugin-{plugin}.git`

---

## Schritt 2 — Lokales Verzeichnis vorbereiten

Das Template-Repo klonen (falls noch nicht geschehen) oder im vorhandenen Verzeichnis
die alte Git-History löschen und neu initialisieren:

```powershell
# Im Projektverzeichnis ausführen:
Remove-Item -Recurse -Force .git
git init
git branch -M main
git remote add origin https://github.com/{namespace}/educandu-plugin-{plugin}.git
```

---

## Schritt 3 — Dateien in src/ umbenennen

Alle `example`-Dateinamen durch `{plugin}` ersetzen:

```powershell
cd src
Rename-Item example-controller.js  {plugin}-controller.js
Rename-Item example-display.js     {plugin}-display.js
Rename-Item example-editor.js      {plugin}-editor.js
Rename-Item example-info.js        {plugin}-info.js
Rename-Item example-info.spec.js   {plugin}-info.spec.js
Rename-Item example.less           {plugin}.less
Rename-Item example.yml            {plugin}.yml
cd ..
```

---

## Schritt 4 — Inhalte anpassen

### 4.1 `package.json`

```json
{
  "name": "@{namespace}/educandu-plugin-{plugin}",
  "description": "A {plugin} plugin for educandu",
  "author": "...",
  "homepage": "https://github.com/{namespace}/educandu-plugin-{plugin}",
  "repository": {
    "type": "git",
    "url": "https://github.com/{namespace}/educandu-plugin-{plugin}"
  }
}
```

### 4.2 `src/index.js`

```js
export { default } from './{plugin}-info.js';
```

### 4.3 `src/{plugin}-info.js`

Folgende Stellen ändern:

| Was                           | Vorher                                      | Nachher                                           |
|-------------------------------|---------------------------------------------|---------------------------------------------------|
| Klassen-Name                  | `class ServerTimeInfo`                      | `class {Plugin}Info` (PascalCase)                 |
| `static typeName`             | `'educandu/educandu-plugin-example'`        | `'{namespace}/educandu-plugin-{plugin}'`          |
| `getDisplayName` Schlüssel    | `'educandu/educandu-plugin-example:name'`   | `'{namespace}/educandu-plugin-{plugin}:name'`     |
| `resolveDisplayComponent`     | `'./example-display.js'`                   | `'./{plugin}-display.js'`                        |
| `resolveEditorComponent`      | `'./example-editor.js'`                    | `'./{plugin}-editor.js'`                         |
| Icon                          | `<ClockCircleOutlined />`                   | Passendes Icon aus `@ant-design/icons` wählen     |
| `getDefaultContent`           | Beispiel-Felder                             | Eigene Content-Felder                             |
| `validateContent`             | Joi-Schema für Beispielfelder               | Joi-Schema für eigene Felder                      |

### 4.4 `src/translations.json`

```json
{
  "{namespace}/educandu-plugin-{plugin}": {
    "name": {
      "en": "My Plugin Name",
      "de": "Mein Plugin-Name"
    }
  }
}
```

### 4.5 `src/{plugin}.yml`

```yaml
{namespace}/educandu-plugin-{plugin}:
  name:
    en: My Plugin Name
    de: Mein Plugin-Name
```

> **Hinweis:** `src/translations.json` wird automatisch vom Build-Prozess aus der `.yml`-Datei generiert
> und muss nicht manuell bearbeitet werden.

### 4.6 `src/{plugin}-display.js` und `src/{plugin}-editor.js`

- Alle Importe von `./example-*` auf `./{plugin}-*` umstellen.
- CSS-Klassennamen vom Schema `EP_Educandu_Example_*` auf `EP_{Namespace}_{Plugin}_*` umbenennen.

### 4.7 `src/{plugin}.less`

- Alle CSS-Selektoren mit altem Präfix `EP_Educandu_Example_` auf neuen Präfix ändern.

---

## Schritt 5 — test-app anpassen

### `test-app/src/custom-resolvers.js`

```js
import ChartsInfo from '../../src/index.js';  // war: ExampleInfo

export default {
  resolveCustomPageTemplate: null,
  resolveCustomHomePageTemplate: null,
  resolveCustomSiteLogo: null,
  resolveCustomPluginInfos: () => [ChartsInfo]  // war: [ExampleInfo]
};
```

### `test-app/src/index.js`

Drei Stellen ändern:

```js
// Import-Zeile:
import ChartsController from '../../src/charts-controller.js';  // war: example-controller.js

// In der config:
plugins: ['markdown', 'image', '{namespace}/educandu-plugin-{plugin}'],  // war: educandu/educandu-plugin-example

additionalControllers: [ChartsController],  // war: [ExampleController]
```

---

## Schritt 6 — gulpfile.js bereinigen

Die `release()`-Funktion und die Import-Liste enthalten JIRA-Code, der ohne JIRA-Credentials abstürzt.

**Import-Zeile** — `createLabelInJiraIssues` entfernen:

```js
import {
  cliArgs,
  compressFiles,
  createGithubRelease,
  createReleaseNotesFromCurrentTag,   // <-- jiraProjectKeys-Parameter weglassen
  ensureIsValidSemverTag,
  // ... rest bleibt gleich, kein createLabelInJiraIssues mehr
} from '@educandu/dev-tools';
```

**`release()`-Funktion** vereinfachen:

```js
export async function release() {
  const { currentTag, releaseNotes } = await createReleaseNotesFromCurrentTag({});

  await createGithubRelease({
    githubToken: cliArgs.githubToken,
    currentTag,
    releaseNotes,
    files: []
  });
}
```

---

## Schritt 8 — GitHub Actions anpassen

### `.github/workflows/publish.yml`

Den JIRA-Block entfernen, wenn kein JIRA-Projekt vorhanden ist:

```yaml
# Diesen Block löschen oder vereinfachen:
- name: Create Github release and tag JIRA issues
  run: |
    ./node_modules/.bin/gulp release \
      --github-token ${{secrets.GITHUB_TOKEN}} \
      --jira-base-url ${{env.JIRA_BASE_URL}} \
      --jira-project-keys ${{env.JIRA_PROJECT_KEYS}} \
      --jira-user ${{secrets.JIRA_USER}} \
      --jira-api-key ${{secrets.JIRA_API_KEY}}
```

Ersetzen durch (nur GitHub Release, kein JIRA):

```yaml
- name: Create Github release
  run: ./node_modules/.bin/gulp release --github-token ${{secrets.GITHUB_TOKEN}}
```

Außerdem die `JIRA_*`-Umgebungsvariablen aus dem `env:`-Block entfernen.

---

## Schritt 9 — README.md aktualisieren

- Alle `educandu-plugin-example` durch `educandu-plugin-{plugin}` ersetzen.
- Alle `@educandu/educandu-plugin-example` durch `@{namespace}/educandu-plugin-{plugin}` ersetzen.
- Alle `ExamplePlugin` / `ExampleController` durch sprechende neue Namen ersetzen.
- Beschreibungstext anpassen.

---

## Schritt 10 — Unnötige Beispiel-Logik in src/ entfernen

Die Beispieldateien enthalten Beispiel-Logik (Server-Zeit, Markdown-Feld), die nicht
benötigt wird. In folgenden Dateien den Inhalt durch eigene Implementierung ersetzen:

- `src/{plugin}-display.js` — eigene Darstellungskomponente
- `src/{plugin}-editor.js` — eigener Editor
- `src/{plugin}-controller.js` — eigener Controller (oder Datei löschen, falls kein Server-Endpunkt nötig)

---

## Schritt 11 — Schnell-Prüfung vor dem ersten Commit

```powershell
# Alle verbleibenden "example"-Vorkommen im Code finden:
grep -ri "example" src/ --include="*.js" --include="*.json" --include="*.yml" --include="*.less"

# Alle verbleibenden Referenzen auf educandu-Namespace prüfen:
grep -ri "educandu/educandu-plugin-example" . --include="*.js" --include="*.json" --include="*.yml" --include="*.md"
```

---

## Schritt 12 — Ersten Commit erstellen und pushen

```powershell
git add .
git commit -m "NOTICKET: Initial plugin setup for {namespace}/educandu-plugin-{plugin}"
git push -u origin main
```

---

## Schnell-Checkliste

- [ ] GitHub-Repo angelegt (leer, ohne initialen Commit)
- [ ] `.git`-Ordner gelöscht, neu initialisiert, Remote gesetzt
- [ ] Alle `src/example-*` Dateien umbenannt
- [ ] `package.json` — name, description, homepage, repository angepasst
- [ ] `src/index.js` — Import-Pfad angepasst
- [ ] `src/{plugin}-info.js` — typeName, Klassen-Name, getDisplayName, Icon, Content-Schema angepasst
- [ ] `src/translations.json` — Namespace-Schlüssel angepasst
- [ ] `src/{plugin}.yml` — Namespace-Schlüssel angepasst
- [ ] `src/{plugin}-display.js` / `src/{plugin}-editor.js` — Importe und CSS-Klassen angepasst
- [ ] `src/{plugin}.less` — CSS-Präfix angepasst
- [ ] `test-app/src/custom-resolvers.js` — `ExampleInfo` durch `{Plugin}Info` ersetzt
- [ ] `test-app/src/index.js` — Controller-Pfad, Controller-Variable und plugin-typeName angepasst
- [ ] `gulpfile.js` — `createLabelInJiraIssues` entfernt, `release()`-Funktion vereinfacht
- [ ] `.github/workflows/publish.yml` — JIRA-Block entfernt (falls kein JIRA)
- [ ] `README.md` aktualisiert
- [ ] Schnell-Prüfung mit grep durchgeführt (keine `example`-Reste)
- [ ] Initialer Commit erstellt und gepusht
