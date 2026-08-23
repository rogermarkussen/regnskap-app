# Oppgave 2 – oppdatering og godkjenning

Kontogrupperingsrapporten beregnes fra datasettene med rollen `operative` eller
`operative-temporary` i rotens `data-manifest.json`. Datasettene med rollen
`fasit` brukes bare til konto-for-konto- og totalkontroll.

Hovedbok summeres fra `Finansiering 154301_ADK 01-03.xlsx`. Budsjett,
månedsverdier og kontant hentes fra de detaljerte arkene i
`Dashboard - KPIer 19.06.26.xlsx`, og kontostrukturen kommer fra
`Kontogruppering 17.06.26.xlsx`.

## Oppdater rapporten

1. Opprett et nytt uforanderlig snapshot under den eksterne dataroten.
2. Legg operative uttrekk og fasit i hver sin klassifiserte mappe.
3. Oppdater datasettreferanser og SHA-256 i `data-manifest.json`.
4. Kjør `npm run check:data` fra repositoryroten.
5. Kjør:

Kjør fra `oppgave2/kode/`:

```bash
npm run refresh
```

Kommandoen beregner rapporten fra operative kilder, avstemmer mot fasit, lager
den komprimerte Parquet-filen for nettleseren og bygger Vite-applikasjonen.

## Automatiske kontroller

Bygget kontrollerer at:

- alle finansierings-, periode- og seksjonsvalg finnes;
- hver rapport har én totalrad for driftskostnader;
- budsjett minus hovedbok er lik avvik;
- summen av månedsbudsjettene er lik årsbudsjettet;
- kontantbudsjett minus kontant er lik kontantavviket;
- alle nødvendige Excel-filer finnes;
- beregnede kontorader og totaler avstemmes mot fasit.
- seksjonssummene avstemmes mot totalsynet;
- kontantverdier ikke publiseres per seksjon når kilden mangler fordeling.

Kontoer som finnes i grupperingsdefinisjonen, men ikke i tallrapporten, rapporteres som en merknad. Det stopper ikke bygget.

## Faglig godkjenning

En økonomibruker bør kontrollere følgende ved første levering og ved større endringer:

- totalsummene for `154301` og alle finansieringer;
- at positive og negative avvik tolkes riktig;
- at kontoene ligger under riktig kontogruppe;
- at manglende kontoer faktisk kan utelates som nullkontoer;
- at Excel-eksporten har ønskede kolonner og desimaler;
- at kildefil, periode og budsjettversjon er korrekt.

Den tekniske valideringen kan avdekke struktur- og beregningsfeil, men erstatter ikke faglig godkjenning.
