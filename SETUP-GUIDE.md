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
2. Die Repository-URL notieren: `git@github.com:{namespace}/educandu-plugin-{plugin}.git`

---

## Schritt 2 — Lokales Verzeichnis vorbereiten

Das Template-Repo klonen (falls noch nicht geschehen) oder im vorhandenen Verzeichnis
die alte Git-History löschen und neu initialisieren:

```powershell
# Im Projektverzeichnis ausführen:
Remove-Item -Recurse -Force .git
git init
git branch -M main
git remote add origin git@github.com:{namespace}/educandu-plugin-{plugin}.git
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

### 4.4 `src/{plugin}.yml`

```yaml
{namespace}/educandu-plugin-{plugin}:
  name:
    en: My Plugin Name
    de: Mein Plugin-Name
```

> **Hinweis:** `src/translations.json` wird automatisch vom Build-Prozess aus der `.yml`-Datei
> generiert und muss nicht manuell bearbeitet werden.

### 4.5 `src/{plugin}-display.js` und `src/{plugin}-editor.js`

- Alle Importe von `./example-*` auf `./{plugin}-*` umstellen.
- CSS-Klassennamen vom Schema `EP_Educandu_Example_*` auf `EP_{Namespace}_{Plugin}_*` umbenennen.

### 4.6 `src/{plugin}.less`

- Alle CSS-Selektoren mit altem Präfix `EP_Educandu_Example_` auf neuen Präfix ändern.

---

## Schritt 5 — test-app anpassen

### `test-app/src/custom-resolvers.js`

```js
import {Plugin}Info from '../../src/index.js';  // war: ExampleInfo

export default {
  resolveCustomPageTemplate: null,
  resolveCustomHomePageTemplate: null,
  resolveCustomSiteLogo: null,
  resolveCustomPluginInfos: () => [{Plugin}Info]  // war: [ExampleInfo]
};
```

### `test-app/src/index.js`

Drei Stellen ändern:

```js
// Import-Zeile (wird in Schritt 10 ganz entfernt, wenn kein Controller benötigt):
import {Plugin}Controller from '../../src/{plugin}-controller.js';  // war: example-controller.js

// In der config:
plugins: ['markdown', 'image', '{namespace}/educandu-plugin-{plugin}'],  // war: educandu/educandu-plugin-example

additionalControllers: [{Plugin}Controller],  // war: [ExampleController]
```

### `test-app/src/main.less`

```less
// war: @import url('../../src/example.less');
@import url('../../src/{plugin}.less');
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
  createReleaseNotesFromCurrentTag,
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

## Schritt 7 — NPM-Publishing einrichten

Das Template ist auf den `@educandu`-Scope eingestellt und enthält keine Authentifizierung
für fremde npm-Accounts. Zwei Dateien anpassen, dann einmalig einen Token anlegen.

### `.npmrc`

```
scope=@{namespace}
access=public
```

### `.github/workflows/publish.yml`

Im `setup-node`-Schritt `registry-url` ergänzen und beim `npm publish`-Schritt den
Token als Umgebungsvariable setzen:

```yaml
- name: Install node
  uses: actions/setup-node@v6.0.0
  with:
    node-version: "20.17.0"
    cache: "yarn"
    registry-url: "https://registry.npmjs.org"   # <-- neu

# ...

- name: Publish to npm
  run: npm publish
  env:
    NODE_AUTH_TOKEN: ${{secrets.NPM_TOKEN}}       # <-- neu
```

Außerdem den JIRA-Block entfernen und `env:` auf das Minimum kürzen:

```yaml
# Diesen Block löschen:
- name: Create Github release and tag JIRA issues
  run: |
    ./node_modules/.bin/gulp release \
      --github-token ${{secrets.GITHUB_TOKEN}} \
      --jira-base-url ${{env.JIRA_BASE_URL}} ...

# Ersetzen durch:
- name: Create Github release
  run: ./node_modules/.bin/gulp release --github-token ${{secrets.GITHUB_TOKEN}}
```

### Einmalig: npm Access Token anlegen und als GitHub Secret hinterlegen

1. **npmjs.org** → Avatar → Access Tokens → Generate New Token → **Granular Access Token**
   - Scope: `@{namespace}`
   - Permission: Read and write
2. **GitHub Repo** → Settings → Secrets and variables → Actions → **New repository secret**
   - Name: `NPM_TOKEN`
   - Value: der eben erstellte Token

Danach genügt ein Tag-Push zum Publishen:

```powershell
git tag v0.1.0
git push origin v0.1.0
```

---

## Schritt 8 — README.md aktualisieren

- Alle `educandu-plugin-example` durch `educandu-plugin-{plugin}` ersetzen.
- Alle `@educandu/educandu-plugin-example` durch `@{namespace}/educandu-plugin-{plugin}` ersetzen.
- Alle `ExamplePlugin` / `ExampleController` durch sprechende neue Namen ersetzen.
- Beschreibungstext anpassen.

---

## Schritt 9 — Controller und Server-Zeit-Logik entfernen

Das Template enthält einen Beispiel-Controller (Server-Zeit per API), der in den meisten
Plugins nicht gebraucht wird. Folgendes löschen / bereinigen:

**`src/{plugin}-controller.js` löschen:**
```powershell
Remove-Item src/{plugin}-controller.js
```

**`src/{plugin}-info.js`** — `allowsInput = true` entfernen:
```js
// Diese Zeile löschen:
allowsInput = true;
```

**`src/{plugin}-display.js`** — auf minimale Darstellung reduzieren:
```js
import React from 'react';
import Markdown from '@educandu/educandu/components/markdown.js';
import { sectionDisplayProps } from '@educandu/educandu/ui/default-prop-types.js';

export default function {Plugin}Display({ content }) {
  return (
    <div className="EP_{Namespace}_{Plugin}_Display">
      <div className={`u-horizontally-centered u-width-${content.width}`}>
        <Markdown renderAnchors>
          {content.text}
        </Markdown>
      </div>
    </div>
  );
}

{Plugin}Display.propTypes = {
  ...sectionDisplayProps
};
```

**`test-app/src/index.js`** — Controller-Import und -Eintrag entfernen:
```js
// Diese Zeile löschen:
import {Plugin}Controller from '../../src/{plugin}-controller.js';

// Und additionalControllers leeren:
additionalControllers: [],
```

---

## Schritt 10 — Eigene Plugin-Logik implementieren

In folgenden Dateien den Inhalt durch eigene Implementierung ersetzen:

- `src/{plugin}-display.js` — eigene Darstellungskomponente
- `src/{plugin}-editor.js` — eigener Editor
- `src/{plugin}.yml` — eigene Übersetzungsschlüssel ergänzen

---

## Schritt 11 — Schnell-Prüfung vor dem ersten Commit

```powershell
# Alle verbleibenden "example"-Vorkommen im Code finden (PowerShell):
Select-String -Path "src\*", "test-app\src\*", "gulpfile.js", "package.json" `
  -Pattern "example|ExampleInfo|ExampleController|ServerTime|EP_Educandu" -SimpleMatch |
  Select-Object Filename, LineNumber, Line
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
- [ ] `package.json` — name, description, author, homepage, repository angepasst
- [ ] `src/index.js` — Import-Pfad angepasst
- [ ] `src/{plugin}-info.js` — typeName, Klassen-Name, getDisplayName, Icon, Content-Schema angepasst
- [ ] `src/{plugin}.yml` — Namespace-Schlüssel angepasst
- [ ] `src/{plugin}-display.js` / `src/{plugin}-editor.js` — Importe und CSS-Klassen angepasst
- [ ] `src/{plugin}.less` — CSS-Präfix angepasst
- [ ] `test-app/src/custom-resolvers.js` — `ExampleInfo` durch `{Plugin}Info` ersetzt
- [ ] `test-app/src/index.js` — Controller-Pfad, Controller-Variable und plugin-typeName angepasst
- [ ] `test-app/src/main.less` — `example.less` auf `{plugin}.less` umgebogen
- [ ] `gulpfile.js` — `createLabelInJiraIssues` entfernt, `release()`-Funktion vereinfacht
- [ ] `.npmrc` — `scope=@{namespace}` gesetzt
- [ ] `.github/workflows/publish.yml` — `registry-url` + `NODE_AUTH_TOKEN` ergänzt, JIRA-Block entfernt
- [ ] npm Access Token auf npmjs.org erstellt
- [ ] GitHub Secret `NPM_TOKEN` im Repo hinterlegt
- [ ] `src/{plugin}-controller.js` gelöscht
- [ ] `src/{plugin}-info.js` — `allowsInput = true` entfernt
- [ ] `src/{plugin}-display.js` — auf minimale Darstellung reduziert
- [ ] `test-app/src/index.js` — Controller-Import und `additionalControllers` entfernt
- [ ] `README.md` aktualisiert
- [ ] Schnell-Prüfung durchgeführt (keine `example`-Reste)
- [ ] Initialer Commit erstellt und gepusht
