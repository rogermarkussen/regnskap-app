# Oppgave 3: fakturaworkflow og månedsavslutning

Oppgave 3 har to leveranser i én statisk webapp:

1. en arbeidsflate for workflowstatus, koblingskvalitet og kontrollpunkter;
2. månedsavslutning med hovedbok, budsjett, avvik og en utfylt Excel-mal.

## Struktur

```text
oppgave3/
├── components/            rapportvisninger i Svelte
├── config/                versjonerte forretningsregler
├── src/                   appskall og felles stil
├── scripts/               dataadapter, beregninger, eksport og validering
├── tests/                 fasit- og regeltester
├── static/                regenererbare data for interne bygg
└── vite.config.js         statisk produksjonsbygg
```

Operative data, mal, fasit og genererte leveranser ligger i den eksterne
dataroten. `scripts/project_data.py` er appens adapter til rotens
`data-manifest.json`.

## Kilder og resultater

- `common.ledger`: hovedbok og kobling mot bokførte fakturaer
- `common.budget_header` og `common.budget_values`: budsjett
- `task3.workflow`: fakturaer, oppgaver, handlinger og statushistorikk
- `task3.monthly_close_template`: struktur og presentasjon i Excel
- `fasit.account_grouping_*`: testorakler, aldri beregningskilder

Genererte Parquet-tabeller og Excel-leveranser skrives til
`$REGNSKAP_DATA_ROOT/generated/<snapshot-id>/oppgave3`. Validerte tabeller
eksporteres med DuckDB CLI til ignorerte JSON-filer under `static/data/` før
Vite bygger webappen. De to Excel-filene kopieres til `static/` for intern
nedlasting.

## Regler

`config/task3_rules.json` inneholder rapportår, budsjettversjon, seksjonene i
Excel-malen, kontointervaller, finansieringsmapping, kontantregel og
workflowhandlinger. Webrapporten viser alle reelle seksjoner som har hovedbok-
eller budsjettdata i valgt periode. Dummyseksjon `999` vises ikke.
`scripts/task3_rules.py` validerer konfigurasjonen. Statusen er
`forelopig_ikke_faglig_godkjent`, så endringer krever dokumentert faglig
beslutning og ny full test.

Workflowposter eldre enn 31 dager holdes utenfor den aktuelle arbeidslisten,
men beholdes som synlig kontrollgrunnlag. Workflowbeløp påvirker ikke
regnskapstall eller avsetningstall før utvalgsregelen er faglig godkjent.

## Kjøring

Fra repositoryroten:

```bash
npm run dev:task3
npm run refresh:task3
npm run build:task3
```

Appen bruker port 3002. `npm run build` lager et internt bygg med dagens data.
`npm run build:public` lager bare HTML, CSS, JavaScript og DuckDB-Wasm. Brukeren
velger den samme lokale mappen med 12 operative Parquet-filer som i oppgave 1
og oppgave 2. Månedsavslutning og workflowkontroll beregnes lokalt i nettleseren.
Excel-leveransene følger ikke det offentlige bygget. Se [`../DATA.md`](../DATA.md).

Detaljert Excel-sporbarhet finnes i
[`README-EXCEL-SPORBARHET.md`](README-EXCEL-SPORBARHET.md).
