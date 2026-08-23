# Oppgave 2: kontogruppering

Statisk Vite/Svelte-app for kontogrupperte hovedbok-, budsjett- og kontanttall.
Rapporten har fire finansieringsvalg, fire perioder og filter for
seksjon/kostnadssted fra dimensjon `C1`/`dim_1`.

Koden ligger i `oppgave2/kode`. Felles Parquet-kilder og tre midlertidige
operative Excel-kilder hentes gjennom rotens datamanifest. De operative
Excel-filene skal fases ut når tilsvarende autoritative Parquet-kilder finnes.
Fasit brukes bare i tester og inngår ikke i produksjonstabellene.

Viktige filer:

- `kode/scripts/prepare_data.py`: kildebehandling og gruppering
- `kode/scripts/project_data.py`: appens adapter mot datakontrakten
- `kode/scripts/validate_task2.py`: tekniske produksjonskontroller
- `kode/tests/fasit_support.py`: test-only lesing av Excel-fasit
- `kode/src/App.svelte`: rapportvisning og brukerinteraksjon
- `kode/src/lib/reportModel.js`: utvalg, søk og kontogruppehierarki
- `kode/src/lib/task2ExcelExport.js`: Excel-eksport

Appen leser `task2-report.parquet` direkte fra mappen brukeren velger i
nettleseren. Filen ligger under
`$REGNSKAP_DATA_ROOT/generated/<snapshot-id>/oppgave2/static-app`, inneholder
avledede rapportlinjer og følger ikke med webbygget. Kontantkilden kan ikke
fordeles på seksjon. Kontantfelt vises derfor som manglende når en seksjon er
valgt.

Kjør fra repositoryroten:

```bash
npm run dev:task2
npm run refresh:task2
npm run build:task2
```

Data skal ikke kopieres inn i denne mappen. Se [`../DATA.md`](../DATA.md).
