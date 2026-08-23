# Plan for én kanonisk datakilde

## Beslutning

Bruk `data/` som framtidig kanonisk område for Synapse-data. Den eksisterende
refresh-jobben skriver allerede hit, og HTML-avstemmingen leser herfra.
`data-ny/2026/` skal fases ut som direkte datakilde for KPI-dashboardet etter
at en ny refresh er validert.

Dette er en teknisk anbefaling. Selve kildebyttet skal ikke publiseres før
økonomi har godkjent KPI-definisjonene.

## Kontroll utført 17. juli 2026

| Kontroll | `data/agltransact.parquet` | `data-ny/2026/agltransact.parquet` |
| --- | ---: | ---: |
| Antall rader | 114 690 | 116 770 |
| Første periode | 202601 | 202601 |
| Siste periode | 202606 | 202607 |
| Rader for aktuelle finansieringer | 34 027 | 34 667 |

Filene har kolonnene som dagens KPI-spørringer trenger, men de representerer
ulike uttrekkstidspunkt. Forskjellen skyldes minst at `data-ny/2026` også har
juli. Lik filstruktur er derfor ikke tilstrekkelig grunnlag for et direkte bytte.

## Migreringsrekkefølge

1. Kjør Synapse-refresh slik at `data/` inneholder siste godkjente snapshot.
2. Registrer uttrekkstidspunkt, radtall og min-/maksperiode.
3. Kjør konto-for-konto-avstemmingen mot Excel.
4. Kjør KPI-kontrollene med `data/` som testkilde.
5. Sammenlign dashboardtotaler og detaljrader for alle perioder.
6. Endre Evidence SQL fra absolutte stier i `data-ny/2026` til en felles,
   prosjektrelativ kilde under `data/`.
7. Kjør `npm test` og bygg rapporten før publisering.
8. Arkiver snapshotmetadata og behold forrige godkjente snapshot for rollback.

## Akseptansekriterier

- én refresh oppdaterer datagrunnlaget som både dashboard og kontrollrapport leser;
- ingen SQL-filer inneholder absolutte bruker- eller prosjektstier;
- KPI-totalene er lik summen av detaljradene;
- konto-for-konto-avvik er forklart eller godkjent;
- dashboardet viser periode, uttrekkstidspunkt og budsjettversjon;
- alle automatiske valideringer og Evidence-bygget består.

## Ikke inkludert i kildebyttet

Kontogrupperingen beregnes nå fra operative Excel-uttrekk og avstemmes mot
fasit. Et senere steg er å erstatte Excel-uttrekket med den samme kanoniske
hovedbokskilden som resten av rapporteringen bruker.
