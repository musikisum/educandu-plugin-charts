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
- Auf npm veröffentlicht als `v0.0.0`
- **chart-Mode vollständig implementiert** (siehe unten)
- voting-Mode noch nicht implementiert

## Schlüsseldateien

| Datei | Zweck |
|-------|-------|
| `src/charts-info.js` | Plugin-Metadaten, typeName, CHART_TYPE, AXIS_CHART_TYPES, Joi-Schema |
| `src/charts-display.js` | Darstellungskomponente — rendert Chart via react-chartjs-2 |
| `src/charts-editor.js` | Editor — Datei-Upload, Chart-Typ-Selector, Achsen-Controls |
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
  question: '',
  options: [],          // Array von Antwortoptionen
  isLocked: false       // true = Abstimmung gesperrt, Ergebnis wird angezeigt
}
```

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

Nur für den voting-Mode nötig (Votes speichern, Abstimmung sperren).
Chart-Mode braucht keinen Controller.
→ Muss noch ins Plugin eingefügt werden, wenn voting-Mode implementiert wird.

---

## Nächste Schritte

1. **voting-Mode implementieren**
   - Controller einbauen (Server-seitige Vote-Speicherung)
   - Editor: Mode-Selector (`Segmented`), Frage + Antwortoptionen konfigurieren
   - Display: Abstimmungs-Interface + Ergebnisanzeige wenn `isLocked`
   - Schema um voting-Felder erweitern (konditionale Joi-Validierung je nach `mode`)
2. **Veröffentlichung** — `git tag v0.1.0 && git push origin v0.1.0`
