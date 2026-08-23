# Syntetiske testdata for opplasting

Alle verdiene i denne mappen er genererte testverdier. Filene inneholder ikke
fasit- eller produksjonsdata.

## Excel

- `excel/oppgave1_testdata.xlsx`

Filen har 27 KPI-rader: ni separate rader for hver av rapportperiodene Jan–mar,
Jan–apr og Jan–jun. Kolonnen `rapportperiode` bestemmer hvilken periode hver rad
tilhører.
Prosentverdier er desimaltall, slik at `0,42` vises som 42 prosent.

## Parquet – beregnede KPI-er

- `parquet/beregnet/dashboard_kpi_demo_innenfor.parquet` – alle beløpskort er
  innenfor budsjett
- `parquet/beregnet/dashboard_kpi_demo_over_budsjett.parquet` – alle
  beløpskort er over budsjett
- `parquet/beregnet/dashboard_kpi_testdata.parquet` – blandede statusverdier

Velg én av disse filene alene med `Last opp beregnet Parquet`. Hver fil
inneholder alle 27 radene: ni KPI-er for hver av de tre rapportperiodene.
Importen godtas bare når alle forventede KPI-er finnes uten duplikater og
regelversjonen er `2026-08-06`.

## Parquet – operative rådata for beregningstest

Disse tre filene brukes av den automatiske komponenttesten for å kontrollere
at nettleserberegningen fortsatt gir samme KPI-er som serverberegningen:

- `parquet/operative/agltransact.parquet`
- `parquet/operative/apltransact.parquet`
- `parquet/operative/apltransactvalue.parquet`

Rådataopplasting vises ikke i den ordinære brukerflaten. Standardgrunnlaget
oppdateres i stedet gjennom prosjektets kontrollerte refresh og publisering.

Forskjellen mellom flytene er derfor:

- beregnet KPI-Parquet: **én fil** med alle 27 KPI-rader;
- operative rådata: **tre filer** (`agltransact`, `apltransact` og
  `apltransactvalue`), brukt av beregningstestene og den tidligere
  rådataopplastingen.

Operative Parquet-filer er fortsatt hovedformatet. Excel er manuell reserve.
Beregnet Parquet skal bare brukes når filen kommer fra en kontrollert
dataprosess.

Filene kan genereres på nytt med:

```bash
cd kode
uv run python scripts/generate_upload_testdata.py
```
