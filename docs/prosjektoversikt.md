# Teknisk prosjektoversikt

De tre Evidence-appene deler én datakontrakt, men har egne beregninger,
Evidence-kilder, brukergrensesnitt og tester.

```text
Ekstern datarot
  -> data-manifest.json og SHA-256-kontroll
  -> appens project_data.py
  -> Python-beregninger
  -> eksterne genererte Parquet-tabeller
  -> lokal regenererbar Evidence/DuckDB-kilde
  -> statisk bygg med tillatte resultatfiler
```

| App | Kodeplassering | Hovedresultat |
| --- | --- | --- |
| Oppgave 1 | `oppgave1/kode` | KPI-er for regnskap og budsjett |
| Oppgave 2 | `oppgave2/kode` | Kontogrupperte regnskaps-, budsjett- og kontanttall |
| Oppgave 3 | `oppgave3` | Workflowstatus, månedsavslutning og Excel-leveranse |

Datagrensen og oppdateringsprosedyren er dokumentert i [`../DATA.md`](../DATA.md).
Filer under `arkiv/` beskriver tidligere struktur og er ikke driftsdokumentasjon.
