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
- Die eigentliche Charts-Logik ist noch **nicht implementiert** — display und editor enthalten noch den minimalen Markdown+Width-Platzhalter aus dem Template

## Schlüsseldateien

| Datei | Zweck |
|-------|-------|
| `src/charts-info.js` | Plugin-Metadaten, typeName, Schema |
| `src/charts-display.js` | Darstellungskomponente (zu implementieren) |
| `src/charts-editor.js` | Editor-Komponente (zu implementieren) |
| `src/charts.yml` | Übersetzungsschlüssel |
| `src/charts.less` | Plugin-CSS |
| `test-app/src/index.js` | Lokale Test-App-Konfiguration |
| `gulpfile.js` | Build, Serve, Test, Release |

## Publishing

```powershell
git tag v0.x.x
git push origin v0.x.x
```

Tag-Push triggert GitHub Actions → baut → publiziert auf npm automatisch.
Voraussetzung: GitHub Secret `NPM_TOKEN` ist gesetzt (bereits erledigt).

## Arbeitsweise

- **Niemals selbständig committen oder pushen** — immer erst auf explizite Aufforderung von Ulrich warten.

## Architektur-Entscheidungen

### Ein Plugin, zwei Modi

Das Plugin hat einen **Mode-Toggle** (`mode: 'chart' | 'voting'`) statt zwei getrennter Plugins.
Begründung: beide Modi enden mit einer Chart-Darstellung, ein gemeinsamer User-Guide ist sinnvoller,
und Plugin-Proliferation in der Open Music Academy soll vermieden werden.

### Content-Modell (Ziel)

```js
{
  mode: 'chart',      // 'chart' | 'voting'

  // chart-Mode:
  chartType: 'bar',   // 'bar' | 'line' | 'pie' | ...
  dataUrl: '',        // CDN-URL der hochgeladenen Excel-Datei

  // voting-Mode:
  question: '',
  options: [],        // Array von Antwortoptionen
  isLocked: false     // true = Abstimmung gesperrt, Ergebnis wird angezeigt
}
```

### Joi-Schema

Konditionale Validierung je nach `mode` — kein Problem.

### Externe Packages

| Package | Zweck | Art |
|---------|-------|-----|
| `react-chartjs-2` + `chart.js` | Chart-Darstellung (beide Modi) | `dependencies` |
| `xlsx` (SheetJS) | Excel-Datei parsen | `dependencies` |

`fuse.js` wird nicht benötigt.

### Controller

Nur für den voting-Mode nötig (Votes speichern, Abstimmung sperren).
Für den chart-Mode wird er nie aufgerufen.
→ Controller muss wieder ins Plugin (wurde in der Setup-Phase entfernt).

### Editor

Oben ein Mode-Selector (Ant Design `Segmented`), darunter je nach Mode
der passende Formteil (Excel-Upload + ChartType-Auswahl **oder** Voting-Konfiguration).

### Display

Rendert je nach `content.mode` entweder die Excel-Chart-Ansicht oder das Voting-Interface.

## Nächste Session: mit chart-Mode starten

**Reihenfolge der Implementierung:**
1. **chart-Mode zuerst** (kein Controller nötig, schnellere Erfolgserlebnisse)
   - `xlsx` installieren, Excel-Datei hochladen und parsen
   - Daten an `react-chartjs-2` übergeben
   - Chart-Typ im Editor wählbar machen (bar, line, pie)
2. **voting-Mode danach** (erfordert Controller + Server-seitige Vote-Speicherung)

**Zum Einstieg in der nächsten Session:**
- `xlsx` und `react-chartjs-2` + `chart.js` als dependencies installieren
- Content-Modell in `charts-info.js` aufbauen (mit `mode`-Feld, zunächst nur chart-Felder)
- Display-Komponente für chart-Mode implementieren
- Editor mit Excel-Upload und ChartType-Selector
