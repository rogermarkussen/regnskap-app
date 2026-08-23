# Oppgave 3 – workflow og fakturastatus

**Sist oppdatert:** 29. juli 2026

## Formål

Oppgave 3 har nå to deler:

- kobling av workflowoppgaver mot bokført regnskap;
- automatisk månedsavslutningsoppsett basert på den mottatte Excel-malen.

Månedsavslutningen viser hovedbok og budsjett for aktuell måned, forrige måned
og hittil i år per seksjon og finansiering. Den lager også Nkom-totaler per
finansiering og viser ikke-bokførte fakturaer som kan være til godkjenning eller
i etterkontroll.

Rapporten finnes på `/` når det selvstendige oppgave 3-prosjektet kjører.

Beslutningsgrunnlag og møteagenda for faglig statusavklaring finnes i
[`oppgave3-workflow-statusavklaring.md`](oppgave3-workflow-statusavklaring.md).
Kartlegging og beslutningstabell for regnskapsreglene finnes i
[`oppgave3-regnskapsregler.md`](oppgave3-regnskapsregler.md).
Årsakene bak tvetydige og umatchede koblinger er dokumentert i
[`oppgave3-koblingsanalyse.md`](oppgave3-koblingsanalyse.md).

## Kilder

- `data-ny/2026/awftaskfin.parquet`: workflowoppgaver og fakturaflyt.
- `data-ny/2026/agltransact.parquet`: regnskapslinjer og ekstern
  fakturareferanse.
- `data/apltransact.parquet` og `data/apltransactvalue.parquet`:
  budsjettversjon `2026B`.
- `data-fra-økonomi/Ønsket mal_mnds avsl.xlsx`: presentasjons- og eksportmal.

Workflow har ikke én rad per faktura. En faktura kan ha flere flyter, oppgaver,
brukere og statuser. Rapporten aggregerer derfor til én rad per fakturanummer,
men beholder antall underliggende flyter og aktive oppgaver.

## Koblingsregel

Primærkoblingen er:

```text
workflow.col2_value = regnskap.ext_inv_ref
```

Koblingen brukes bare når `col2_descr = 'Fakturanr'`. Leverandør-id brukes som
kontrollnøkkel.

Koblingskvaliteten klassifiseres slik:

- **Sikker:** ett workflowobjekt, én workflowleverandør, én
  regnskapsleverandør og samsvarende leverandør-id.
- **Mulig:** ett workflowobjekt og høyst én regnskapsleverandør, men ikke nok
  leverandørinformasjon til å kalle koblingen sikker.
- **Tvetydig:** flere workflowflyter eller leverandører deler fakturanummer.
- **Ikke matchet:** fakturanummeret finnes ikke som `ext_inv_ref` i
  regnskapsuttrekket.

Workflowbeløpet brukes ikke som koblingsnøkkel fordi beløpsfeltet varierer
mellom oppgavene for mange fakturanumre.

## Statusregel

En faktura vises som **Har aktive oppgaver** når minst én underliggende rad har
`wf_status = 'ACT'`.

Dette betyr ikke nødvendigvis at fakturaen ligger hos bare én person. Rapporten
viser derfor både antall aktive oppgaver, antall aktive brukere og brukerlisten.
Hvis ingen oppgaver er aktive, brukes siste kjente hendelsesstatus.

## Første kontrollresultat

| Kontroll | Antall |
| --- | ---: |
| Workflowoppgaver | 33 815 |
| Workflowflyter | 3 557 |
| Unike fakturanumre | 2 580 |
| Sikre regnskapskoblinger | 1 940 |
| Mulige koblinger | 3 |
| Tvetydige koblinger | 433 |
| Uten regnskapskobling | 204 |
| Flere workflowflyter per fakturanummer | 483 |
| Varierende workflowbeløp | 1 911 |
| Fakturaer med aktive oppgaver | 2 579 |

## Begrensninger

- Snapshotets uttrekkstidspunkt vises ikke ennå.
- Nesten alle fakturaene har aktive oppgaver. Statussemantikken må valideres
  med en fagperson som kjenner DFØ-workflowen.
- Fakturanummer er ikke globalt entydig. Tvetydige koblinger skal ikke brukes
  til automatiske beslutninger.
- Workflowbilagsnummer er ikke nødvendigvis lik bokført bilagsnummer.
- Beløpsfeltet varierer mellom oppgaver og vises bare når fakturaen har én
  entydig workflowverdi.
- Rapporten viser status fra et lokalt snapshot, ikke sanntidsdata.

## Månedsavslutning

Siste avsluttede hovedboksperiode velges automatisk. En periode regnes som
avsluttet når den har lønnsposteringer og siste transaksjonsdato når månedsslutt.
Med mottatt snapshot er dette `202606`; `202607` er utelatt fordi perioden bare
har 496 hovedboksrader og to lønnsrader. Rapporten beregner:

- lønnskostnader fra konto `5000–5999`;
- avskrivninger fra konto `6000–6109`;
- ADK fra konto `6110–7834`;
- driftskostnader som lønn pluss avskrivninger og ADK;
- hovedbok og budsjett for aktuell måned, forrige måned og hittil i år;
- seksjonsvisning for `711`, `712`, `721`, `731` og `741`;
- total for hele Nkom per finansiering.

Avvik beregnes som budsjett minus hovedbok, i samme retning som Excel-fasiten.
Hovedboksposter uten finansiering beholdes som `Uten finansiering`, slik at de
inngår i Nkom-totalen og samtidig er synlige som datakvalitetsavvik.

Budsjettdataene har ikke en egen finansieringsdimensjon. Den eksisterende,
utledede regelen brukes derfor: seksjon `212` til `154345`, seksjon `761` til
`154322+045101`, og øvrige seksjoner til `154301`. Finansieringer som bare
finnes i hovedboken får budsjett `0` etter denne regelen. Når en tilgjengelig
hovedbok- eller budsjettkilde ikke har noen postering på kombinasjonen, vises
`0`; dette skilles fra reelt manglende kilde, som vises med `–` og forklaring.

### Fakturaer i månedsavslutningen

Workflowdimensjoner leses fra `logged_values`:

- `A0` → konto;
- `C1` → seksjon;
- `B0` → prosjekt;
- `R00` → finansiering.

Bare fakturaer som ikke finnes som `ext_inv_ref` i mottatt hovedbok tas med.
Siste dokumenterte handling `ATTEST` vises som «Til godkjenning», og `BDMGOD`
vises foreløpig som «I etterkontroll». Dette er en teknisk tolkning som må
godkjennes av workfloweier. Alle ti nåværende kandidater er eldre enn 31 dager
og er derfor tydelig merket for kontroll.

### Excel og bilag

Den utfylte filen genereres som `static/manedsavslutning-siste.xlsx` og kan
lastes ned fra oppgave 3-siden. Den inneholder originalfanene samt:

- `Seksjon per finansiering`;
- `Nkom per finansiering`;
- `712 kontantdetaljer`, med underlaget for konto `8720`;
- `Bilagsutkast kontroll`.

Bilagsutkastet er ikke en bokføringsklar fil. Automatisk postering er sperret
inntil statuskoder, fortegn, motkonto, bilagsart og godkjenningsløp er faglig
avklart. Fanen `712` bruker foreløpig de mottatte hovedboksposteringene på konto
`8720`, seksjon `712` og finansiering `154370`. Dette gir måned og hittil i år,
men må bekreftes faglig som riktig kontantgrunnlag før produksjonsbruk.

## Viktigste filer

| Fil | Rolle |
| --- | --- |
| `scripts/workflow_data.py` | Normaliserer workflow og kobler mot regnskap |
| `scripts/monthly_close_data.py` | Beregner månedsavslutning og fyller Excel-malen |
| `scripts/validate_task3.py` | Kontrollerer korn og sikre koblinger |
| `generated/.../oppgave3/web/workflow_invoice_status.parquet` | Én rapportlinje per fakturanummer |
| `generated/.../oppgave3/web/workflow_invoice_validation.parquet` | Kontrollresultater |
| `src/App.svelte` | Statisk appskall og datalasting |
| `components/WorkflowInvoiceReport.svelte` | Filtre, tabell og detaljvisning |
| `components/MonthlyCloseReport.svelte` | Seksjon, finansiering, Nkom-total og Excel-nedlasting |

## Kommandoer

```bash
npm run refresh
npm run validate:task3
npm run dev:fast
```

## Gjennomført 29. juli 2026

- Hendelseshistorikk per workflow-`oid` er tilgjengelig i fakturadetaljene.
- Datadekning og lokal endringsdato for kildefilene vises på siden.
- De 433 tvetydige og 204 umatchede koblingene er kategorisert og eksportert
  som kontrollgrunnlag.
- Koblingsårsaken vises på hver faktura.
- Uttrekkstidspunkt finnes fortsatt ikke i kildene og kan derfor ikke
  dokumenteres som en faktisk snapshotdato.

## Neste steg

1. Valider betydningen av `ACT`, `FIN`, `FWD`, `REJ`, `TMD`, `WTN`, `ATTEST`,
   `BDMGOD` og `AP` med workfloweier. Bruk beslutningsgrunnlaget i
   [`oppgave3-workflow-statusavklaring.md`](oppgave3-workflow-statusavklaring.md).
2. Avklar hvordan flere aktive oppgaver og workflow-`oid` skal prioriteres
   eller grupperes.
3. Få et nytt uttrekk med eksplisitt snapshotdato og dokumentert
   oppdateringsfrekvens.
4. Avklar tilgangsstyring før brukeridentifikatorer publiseres bredt.
5. Bekreft faglig at konto `8720` og finansiering `154370` er riktig
   kontantgrunnlag for fane `712`.
6. Godkjenn budsjettfordelingen til finansiering.
7. Definer prosjektnummer/regler for tilleggsforslag, overligger og nye
   ansvarsområder.
8. Godkjenn bilagsart, fortegn, motkonto og kontrollflyt før bilagsfil kan
    automatiseres.

## Status

- Teknisk prototype for workflow og månedsavslutning: ferdig.
- Automatisk validering: bestått.
- Faglig statusdefinisjon: ikke godkjent.
- Automatisk bilagsbokføring: sperret; bare kontrollutkast.
- Produksjonsklar: nei.
