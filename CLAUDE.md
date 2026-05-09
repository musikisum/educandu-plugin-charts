# CLAUDE.md — Projektkontext educandu-plugin-charts

## Was ist das hier?

Ein educandu-Plugin für die **Open Music Academy** (Hochschule für Musik und Theater München).
Es wird unter dem npm-Scope `@musikisum` veröffentlicht.

## Identitäten

| Was | Wert |
|-----|------|
| npm-Paket | `@musikisum/educandu-plugin-charts` |
| plugin typeName | `musikisum/educandu-plugin-charts` |
| CSS-Präfix | `EP_Musikisum_Charts_` |
| GitHub | `git@github.com:musikisum/educandu-plugin-charts.git` |
| Projektleitung | Ulrich Kaiser (`kontakt@kaiser-ulrich.de`) |

## Aktueller Stand

- Template vollständig umgebogen (alle `example-*` → `charts-*`)
- Basis-Struktur läuft (yarn, Docker, gulp serve funktionieren)
- **chart-Mode vollständig implementiert** (siehe unten)
- **voting-Mode vollständig implementiert** (siehe unten)
- Auf npm veröffentlicht als `v0.8.0`

## Schlüsseldateien

| Datei | Zweck |
|-------|-------|
| `src/charts-info.js` | Plugin-Metadaten, typeName, CHART_TYPE, AXIS_CHART_TYPES, Joi-Schema, beide Modi |
| `src/charts-display.js` | Darstellungskomponente — Chart-Mode und Voting-Mode (Formular + Ergebnisanzeige) |
| `src/charts-editor.js` | Editor — Datei-Upload, Chart-Typ, Achsen-Controls, Fragen-Editor, Sperr-Button |
| `src/chart-icon.js` | Custom SVG-Icon (aus Inkscape bereinigt, nutzt currentColor) |
| `src/charts.yml` | Übersetzungsschlüssel (Quelle!) |
| `src/translations.json` | Generiert aus charts.yml — nie direkt bearbeiten! |
| `src/charts.less` | Plugin-CSS |
| `test-app/src/index.js` | Lokale Test-App-Konfiguration |
| `gulpfile.js` | Build, Serve, Test, Release |

## Übersetzungen — wichtige Regel

**Nie `translations.json` direkt bearbeiten.** Immer nur `charts.yml` ändern,
dann neu generieren:

```powershell
node -e "import('@educandu/dev-tools').then(m => m.mergeYamlFilesToJson({ inputFilesPattern: './src/**/*.yml', outputFile: './src/translations.json' }).then(() => console.log('done')))"
```

Educandu nutzt **i18next-icu** → Interpolationsvariablen mit **einfachen** Klammern:
```yaml
uploadSuccess:
  de: "{fileName} — {labelCount} Labels geladen"   # korrekt
  # de: "{{fileName}} — {{labelCount}} Labels geladen"  # falsch!
```

## Publishing

```powershell
git tag v0.x.x
git push origin v0.x.x
```

Tag-Push triggert GitHub Actions → baut → publiziert auf npm automatisch.
Voraussetzung: GitHub Secret `NPM_TOKEN` ist gesetzt (bereits erledigt).

## Arbeitsweise

- **Niemals selbständig committen oder pushen** — immer erst auf explizite Aufforderung von Ulrich warten.

---

## Architektur-Entscheidungen

### Ein Plugin, zwei Modi

Das Plugin hat einen **Mode-Toggle** (`mode: 'chart' | 'voting'`) statt zwei getrennter Plugins.
Begründung: beide Modi enden mit einer Chart-Darstellung, ein gemeinsamer User-Guide ist sinnvoller,
und Plugin-Proliferation in der Open Music Academy soll vermieden werden.

### Content-Modell (chart-Mode)

```js
{
  mode: 'chart',        // aktuell einziger implementierter Wert

  chartType: 'bar',     // 'bar' | 'barHorizontal' | 'line' | 'pie' |
                        // 'doughnut' | 'radar' | 'polarArea'

  axisMin: null,        // null = Auto-Skalierung; optional (fehlt in alten Inhalten)
  axisMax: null,        // null = Auto-Skalierung; optional (fehlt in alten Inhalten)
                        // Constraint: axisMin < axisMax wenn beide gesetzt

  chartData: {
    labels: [],         // X-Achsen-Beschriftungen (aus erster Spalte der Datei)
    datasets: [         // Eine Zeile pro Datensatz
      { label: string, data: number[] }
    ]
  }
}
```

**Wichtig:** Die Excel/ODS/CSV-Datei wird im Editor lokal mit xlsx geparst —
kein CDN-Upload, keine URL gespeichert. Die geparsten Daten landen direkt im Content.

### Content-Modell (voting-Mode, noch nicht implementiert)

```js
{
  mode: 'voting',

  questions: [              // beliebig viele Fragen pro Plugin-Instanz
    {
      key: 'q1',            // eindeutiger Schlüssel, generiert mit uniqueId.create()
      text: 'Frage...',
      options: [            // Antwortoptionen
        { key: 'o1', text: 'Option A' },
        { key: 'o2', text: 'Option B' }
      ]
    }
  ],

  isLocked: false,          // true = Abstimmung gesperrt, Editor setzt diesen Wert

  results: null             // null solange offen; nach dem Sperren: aggregierte Zähler
                            // { q1: { o1: 3, o2: 7 }, q2: { o1: 1, o2: 5 } }
}
```

**Wichtige Design-Entscheidungen:**

- **Mehrere Fragen** pro Plugin-Instanz — eine Instanz = eine Voting-Session
- **`isLocked` im Content** — der Room-Owner setzt es via Editor (kein separater Endpunkt)
- **`results` im Content** — der Editor aggregiert beim Sperren und speichert die Zähler
  direkt im Content → alle sehen das Ergebnis nach einem einfachen Refresh
- **Kein eigener Controller, keine eigene DB-Collection, kein Migrations-Script**

### Erwartetes Dateiformat (Excel/ODS/CSV)

Erste Zeile = Header: erste Zelle beliebig (wird ignoriert), Rest = Dataset-Namen.
Ab Zeile 2: erste Spalte = X-Achsen-Label, weitere Spalten = Zahlenwerte.

```
         | Dataset1 | Dataset2
Jan      |    10    |    5
Feb      |    20    |   15
Mar      |    30    |   25
```

### Chart-Typen und Achsen

`CHART_TYPE` in `charts-info.js`:

| Wert | Beschreibung | Achsen-Controls |
|------|-------------|-----------------|
| `bar` | Balken vertikal | ja (y) |
| `barHorizontal` | Balken horizontal | ja (x) |
| `line` | Linie | ja (y) |
| `pie` | Kreisdiagramm | nein |
| `doughnut` | Donut | nein |
| `radar` | Netzdiagramm | ja (r) |
| `polarArea` | Polarfläche | ja (r) |

`AXIS_CHART_TYPES` (Set) bestimmt, ob Min/Max-Controls im Editor erscheinen.

Farben: bei pie/doughnut/polarArea eine Farbe pro Label (aus `PIE_LIKE_TYPES`),
bei allen anderen eine Farbe pro Dataset.

### Upload-Validierung im Editor

`parseWorkbook()` in `charts-editor.js` gibt zurück:
- `error`: harter Fehler (Datei wird nicht geladen) → Schlüssel für t()
- `warnings`: Array von Warnungen (Datei wird geladen, Hinweise erscheinen)

| Situation | Art | Schlüssel |
|-----------|-----|-----------|
| < 2 Zeilen | Fehler | `parseErrorTooFewRows` |
| < 2 Spalten | Fehler | `parseErrorTooFewColumns` |
| Alle Zellen leer/Text | Fehler | `parseErrorNoData` |
| Text in Datenzellen | Warnung | `parseWarningTextCells` |
| Leere Datenzellen | Warnung | `parseWarningEmptyCells` |

Nach erfolgreichem Upload: grünes Alert mit Dateiname + Statistik (`uploadSuccess`).

### Joi-Schema Besonderheit

`axisMin`/`axisMax` sind `.optional()` (nicht `.required()`), damit alte gespeicherte
Inhalte ohne diese Felder nicht scheitern. Im Display wird `typeof value === 'number'`
geprüft statt `!== null`.

### Externe Packages (dependencies)

| Package | Zweck |
|---------|-------|
| `react-chartjs-2` | React-Wrapper für Chart.js |
| `chart.js` | Chart-Rendering |
| `xlsx` (SheetJS) | Excel/ODS/CSV parsen |

### Controller

**Chart-Mode:** kein Controller nötig.
**Voting-Mode:** ebenfalls kein eigener Controller nötig — siehe unten.

**Wichtig — Registrierung (für zukünftige Referenz):**
Falls doch ein Controller nötig wird: er wird NICHT in der Info-Klasse registriert
(es gibt kein `resolveController()`). Er wird separat in der jeweiligen App-Config eingetragen:

```js
// in OMA-App oder test-app/src/index.js:
import ChartsController from '../node_modules/@musikisum/educandu-plugin-charts/dist/charts-controller.js';
// ...
additionalControllers: [ChartsController],
```

educandu ruft `registerApi(router)` auf (nicht `registerMiddleware`) — das ist die
korrekte Methode für Plugin-Controller mit API-Routen.

---

### Voting-Mode — Architektur (documentInput-System)

#### Das Schlüssel-Konzept: educandus `documentInput`-System

educandu hat ein eingebautes System für interaktive Plugins im Room-Kontext, das von
den internen Plugins *Auswahl*, *Texteingabe*, *Datei-Upload* und *Whiteboard* genutzt wird.
Es heißt **documentInput** und löst alle wesentlichen Probleme des voting-Modes:

**Wie es funktioniert:**
- `allowsInput: true` in der Info-Klasse aktiviert das System für das Plugin
- Der Display-Component bekommt zwei zusätzliche Props: `input` (eigene gespeicherte Daten)
  und `onInputChanged(newData)` (Funktion zum Speichern)
- Wenn ein Student `onInputChanged({ q1: 'o2' })` aufruft, speichert educandu das
  automatisch in der `documentInputs`-Collection — ohne dass der Plugin-Code weiß wie

**Struktur eines documentInput-Datensatzes in der DB:**
```js
{
  _id: 'input-id',
  documentId: 'abc123',
  documentRevisionId: 'rev-xyz',
  createdBy: 'student-user-id',      // userId des Studenten
  sections: {
    'sectionKey': {                   // sectionKey = eindeutiger Key dieser Plugin-Sektion
      data: { q1: 'o2', q2: 'o1' }, // hier landen die Votes (via onInputChanged)
      files: [],
      comments: []
    }
  }
}
```

**Was das System automatisch für uns erledigt:**

| Problem | Lösung durch documentInput |
|---------|---------------------------|
| Wo Votes speichern? | `onInputChanged` → documentInputs-Collection automatisch |
| Nur Room-Member dürfen abstimmen? | Erzwungen im DocumentInputService (Zeile 132): `isRoomOwnerOrInvitedMember` — kein eigener Check nötig |
| Plugin im öffentlichen Bereich? | `createDocumentInput` wirft BadRequest wenn `!documentRevision.roomId` |
| DB-Cleanup wenn Plugin/Dokument gelöscht? | DocumentInputStore.deleteDocumentInputsByDocumentId — automatisch |
| Anonymität der Votes? | Display sieht nur eigenen `input`, nie andere Nutzer direkt |

#### Der vollständige Ablauf (Schritt für Schritt)

**Phase 1 — Vorbereitung (Room-Owner im Editor):**
1. Room-Owner wählt voting-Mode via Mode-Toggle (`Segmented`-Komponente)
2. Room-Owner gibt Fragen und Antwortoptionen ein
3. Room-Owner speichert → Content enthält `{ mode: 'voting', questions: [...], isLocked: false, results: null }`
4. Room-Owner fordert alle Teilnehmer auf, das Dokument zu öffnen/refreshen

**Phase 2 — Abstimmung (Teilnehmer im Display):**
5. Teilnehmer sieht das Formular (Fragen + Optionen aus `content.questions`)
6. Teilnehmer klickt eine Option → `onInputChanged({ q1: 'o2', q2: 'o1' })`
7. educandu speichert automatisch in `documentInputs` für diesen Nutzer
8. Der eigene `input` zeigt die Auswahl (Buttons erscheinen als "gewählt")
9. Teilnehmer kann seine Wahl bis zur Sperrung ändern (erneutes `onInputChanged`)

**Phase 3 — Auswertung (Room-Owner im Editor):**
10. Room-Owner öffnet den Editor
11. Editor ruft educandus bestehende API auf:
    `GET /api/v1/document-inputs?documentId=<id>` — liefert alle Teilnehmer-Inputs
12. Editor aggregiert die Votes clientseitig:
    ```js
    // Alle inputs durchlaufen, sections[sectionKey].data auslesen, pro Option zählen
    const results = { q1: { o1: 3, o2: 7 }, q2: { o1: 5, o2: 2 } };
    ```
13. Editor speichert `{ isLocked: true, results: { q1: {...}, q2: {...} } }` im Content
14. Room-Owner fordert alle auf, zu refreshen

**Phase 4 — Ergebnisanzeige (alle im Display):**
15. Display sieht `content.isLocked === true` und `content.results !== null`
16. Display rendert die Ergebnisse als Chart (ein Bar-Chart pro Frage, oder Pie/Doughnut)
17. Keine API-Calls nötig — alles aus `content.results`

#### Warum kein eigener Controller und keine eigene DB nötig sind

```
Votes speichern:   onInputChanged()  →  educandus documentInputs-Collection
Votes aggregieren: Editor-Code       →  bestehende API GET /api/v1/document-inputs
Ergebnis zeigen:   content.results   →  statisch nach dem Sperren
```

Die gesamte Infrastruktur (DB-Collection, Room-Prüfung, Cleanup) stellt educandu bereit.

#### Was im Code geändert/hinzugefügt werden muss

**`src/charts-info.js`:**
```js
// NEU: allowsInput aktiviert das documentInput-System
allowsInput = true;

// NEU: voting-Felder im Schema (konditional je nach mode)
validateContent(content) {
  const baseSchema = joi.object({ mode: joi.string().valid('chart', 'voting') });
  if (content.mode === 'chart') { /* bisheriges Schema */ }
  if (content.mode === 'voting') { /* voting-Schema */ }
}

// NEU: cloneContent generiert neue question/option keys (damit Duplikate unabhängig sind)
cloneContent(content) {
  if (content.mode !== 'voting') return cloneDeep(content);
  return {
    ...cloneDeep(content),
    results: null,    // Ergebnisse werden nicht dupliziert
    isLocked: false   // Duplikat startet neu
  };
}

// NEU: getDefaultContent für voting
// (wird beim Mode-Wechsel im Editor aufgerufen, nicht beim Erstellen)
```

**`src/charts-editor.js`:**
- `Segmented`-Komponente oben: `chart | voting` Mode-Toggle
- Bei `voting`: Fragen-Editor (Fragen hinzufügen/entfernen, Optionen pro Frage)
- "Abstimmung sperren"-Button: ruft API auf, aggregiert, speichert Content
- Bei `isLocked`: Hinweis "Abstimmung gesperrt" + Ergebnis-Vorschau

**`src/charts-display.js`:**
- Bei `mode === 'voting'` und `!isLocked`: Abstimmungsformular anzeigen
  - Für jede Frage: Radio-Buttons (eine Antwort) oder Checkboxes (mehrere)
  - Aktuell gewählte Option aus `input.data` vorauswählen
  - Bei Klick: `onInputChanged({ ...input.data, [questionKey]: optionKey })`
- Bei `mode === 'voting'` und `isLocked`: Ergebnisse aus `content.results` als Chart
  - Chart-Typ: `bar` (horizontal, eine Bar pro Option, Zähler als Wert)
  - Oder pro Frage ein separates Diagramm

#### Joi-Schema für voting-Mode

```js
const votingSchema = joi.object({
  mode: joi.string().valid('voting').required(),
  questions: joi.array().items(joi.object({
    key: joi.string().required(),
    text: joi.string().allow('').required(),
    options: joi.array().items(joi.object({
      key: joi.string().required(),
      text: joi.string().allow('').required()
    })).min(2).required()
  })).min(1).required(),
  isLocked: joi.boolean().required(),
  results: joi.object().allow(null).required()
});
```

#### Wie der Editor die Votes aggregiert — vollständig verifiziert

**Problem:** Editor-Component kennt weder `documentId` noch `sectionKey` (context hat nur `isPreview`).
**Lösung:** Zwei Mechanismen kombiniert.

**1. `votingId` im Content (ersetzt sectionKey)**

In `getDefaultContent()` wird eine eindeutige `votingId` generiert:
```js
import uniqueId from '@educandu/educandu/src/utils/unique-id.js';
// in getDefaultContent():
votingId: uniqueId.create()
```

Votes werden unter dieser ID gespeichert:
```js
// im Display, wenn Student abstimmt:
onInputChanged({ [content.votingId]: { q1: 'o2', q2: 'o1' } })
```

Das landet in MongoDB als:
```js
documentInput.sections['<sectionKey>'].data = {
  '<votingId>': { q1: 'o2', q2: 'o1' }  // ← key ist die votingId, nicht der sectionKey
}
```

Der Editor muss sectionKey nicht kennen — er sucht beim Aggregieren einfach in ALLEN
sections aller documentInputs nach dem votingId-Key. Funktioniert weil `data` im Schema
`joi.object().allow(null)` ist (akzeptiert beliebige Keys, verifiziert in
`src/domain/schemas/document-input-schemas.js`).

**2. `documentId` aus der URL**

Educandu-Dokumente leben unter `/docs/:documentId/:slug`.
Der Editor kann die documentId zuverlässig aus der URL lesen:
```js
const docPageRegex = /^\/docs\/([a-zA-Z0-9]+)\b/i;
const documentId = window.location.pathname.match(docPageRegex)?.[1];
```
(Regex aus `src/utils/routes.js` übernommen — gilt für öffentliche und Room-Dokumente.)

**3. `DocumentInputApiClient` via DI**

educandu stellt `src/api-clients/document-input-api-client.js` bereit.
Im Editor-Component über `useService` (aus `src/components/container-context.js`) nutzen:

```js
import { useService } from '@educandu/educandu/src/components/container-context.js';
import DocumentInputApiClient from '@educandu/educandu/src/api-clients/document-input-api-client.js';

// im Editor-Component:
const documentInputApiClient = useService(DocumentInputApiClient);
```

Der DI-Container instanziiert `DocumentInputApiClient` automatisch mit seinem einzigen
Dependency `HttpClient` — der seinerseits keine Dependencies hat (nur axios-Wrapper).
Kein manuelles Registrieren nötig.

**Die Aggregations-Logik im Editor (Sperr-Button):**
```js
const handleLockVoting = async () => {
  const documentId = window.location.pathname.match(/^\/docs\/([a-zA-Z0-9]+)\b/i)?.[1];
  const { documentInputs } = await documentInputApiClient.getDocumentInputsByDocumentId(documentId);

  // Votes für diese votingId aus allen Inputs sammeln
  const allVotes = [];
  for (const input of documentInputs) {
    for (const section of Object.values(input.sections)) {
      const vote = section.data?.[content.votingId];
      if (vote) allVotes.push(vote);
    }
  }

  // Aggregieren: pro Frage pro Option zählen
  const results = {};
  for (const question of content.questions) {
    results[question.key] = {};
    for (const option of question.options) {
      results[question.key][option.key] = allVotes.filter(v => v[question.key] === option.key).length;
    }
  }

  // Content mit isLocked + results speichern
  onContentChanged({ ...content, isLocked: true, results });
};
```

#### Referenz-Plugins zum Nachschauen (im node_modules)

| Plugin | Datei | Was man lernen kann |
|--------|-------|---------------------|
| Auswahl | `src/plugins/select-field/select-field-display.js` | `input`/`onInputChanged`-Muster, Radio/Checkbox |
| Whiteboard | `src/plugins/whiteboard/whiteboard-display.js` | `onInputChanged` mit komplexem Datentyp |
| Datei-Upload | `src/plugins/file-upload-field/file-upload-field-display.js` | `input.data` + `input.files` |

Alle Plugins nutzen dasselbe Muster: kein direkter API-Call, nur `onInputChanged`.
Das `input`-Objekt hat immer die Struktur `{ data: {...}, files: [...] }`.

---

## Nächste Schritte

1. **OMA-App einbinden**:
   - `enabledPlugins`: `'musikisum/educandu-plugin-charts'` hinzufügen
   - `resources`: `translations.json` Pfad hinzufügen
   - Kein Controller-Eintrag nötig (voting läuft über documentInput-System)

2. **Veröffentlichung** — `git tag vX.Y.Z && git push origin vX.Y.Z`
   (Tag-Push triggert GitHub Actions → baut → publiziert auf npm automatisch)

3. **Testen** — Abstimmung mit anonymen Benutzern noch nicht getestet
