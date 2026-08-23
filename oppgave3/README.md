# Oppgave 3: fakturaworkflow og månedsavslutning

Oppgave 3 har to leveranser:

1. en Evidence-side for workflowstatus, koblingskvalitet og kontrollpunkter;
2. månedsavslutning med hovedbok, budsjett, avvik og en utfylt Excel-mal.

## Struktur

```text
oppgave3/
├── components/            rapportvisninger
├── config/                versjonerte forretningsregler
├── pages/                 Evidence-side og spørringer
├── scripts/               dataadapter, beregninger og validering
├── sources/               regenererbar lokal Evidence/DuckDB-kilde
├── tests/                 fasit- og regeltester
├── static/                regenererbare Excel-filer for intern nedlasting
└── package.json
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
`$REGNSKAP_DATA_ROOT/generated/<snapshot-id>/oppgave3`. De to Excel-filene som
skal tilbys internt fra nettsiden kopieres derfra til den ignorerte `static/`-
mappen før bygg.

## Regler

`config/task3_rules.json` inneholder rapportår, budsjettversjon, seksjoner,
kontointervaller, finansieringsmapping, kontantregel og workflowhandlinger.
`scripts/task3_rules.py` validerer konfigurasjonen. Statusen er
`forelopig_ikke_faglig_godkjent`, så endringer krever dokumentert faglig
beslutning og ny full test.

## Kjøring

Fra repositoryroten:

```bash
npm run dev:task3
npm run refresh:task3
npm run build:task3
```

Appen bruker port 3002. Et ferdig bygg er kun godkjent for autentisert, intern
hosting med dagens data. Se [`../DATA.md`](../DATA.md).

Detaljert Excel-sporbarhet finnes i
[`README-EXCEL-SPORBARHET.md`](README-EXCEL-SPORBARHET.md).
