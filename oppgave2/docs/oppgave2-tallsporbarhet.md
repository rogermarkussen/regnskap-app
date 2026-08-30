# Oppgave 2 – tallsporbarhet og Excel-test

> Fysiske data- og fasitfiler ligger nå under den eksterne dataroten. Tabellen
> nedenfor beskriver innholdet, mens `data-manifest.json` er autoritativ for
> faktisk sti, klassifisering og kontrollsum.

**Sist oppdatert:** 23. august 2026

## Prinsipp

Excel-filene under `Fasit/` er testorakler og brukes ikke til å fylle
publiserte hovedbok- eller budsjettverdier. Testen beregner tallene fra
Parquet og sammenligner deretter hver relevant Excel-celle med resultatet.

## Operative kilder og fasitfiler

| Rolle | Fil | Bruk |
| --- | --- | --- |
| Hovedbok, Parquet-kontroll | `data/agltransact.parquet` | Summeres per konto, finansiering og periode |
| Budsjetthoder | `data/apltransact.parquet` | Filtreres til versjon `2026B` |
| Budsjettverdier | `data/apltransactvalue.parquet` | Kobles til budsjetthodet med `trans_id` |
| Operativ hovedbok, januar–mars for `154301` og `alle` | `data-fra-økonomi/Finansiering 154301_ADK 01-03.xlsx` | Midlertidig Excel-kilde som skal fases ut til fordel for Parquet |
| Operativt budsjett og kontant | `data-fra-økonomi/Dashboard - KPIer 19.06.26.xlsx` | Excel-avhengighet for `154301` og kontant; kontant mangler Parquet-kilde |
| Kontogrupperingsregler | `data-fra-økonomi/Kontogruppering 17.06.26.xlsx` | Definerer hovedgrupper, kontogrupper og kontoer |
| Detaljfasit for Parquet-test | `Fasit/Dashboard - KPIer 19.06.26.xlsx` | Tre finansieringsfaner, 2 845 numeriske kontroller |
| Fasit for kontogruppering `154301` | `Fasit/Kontogruppering med tall 18.06.26 (finansiering 154301).xlsx` | Visuell og automatisk konto-/totalkontroll |
| Fasit for kontogruppering `alle` | `Fasit/Kontogruppering med tall 18.06.26 (finansiering ALLE).xlsx` | Visuell og automatisk konto-/totalkontroll |

Den publiserte kontogrupperingen leser den eksternt genererte og
ZSTD-komprimerte filen `task2-report.parquet`. Valideringen leser
`grouped_finance_rows.parquet`, `section_grouped_finance_rows.parquet` og
`grouped_finance_validation.parquet` utenfor det statiske bygget.
Normalisert fasit produseres ikke som en produksjonstabell. Den finnes bare i
testminnet gjennom `kode/tests/fasit_support.py`.

## Kartlegging av Parquet-grunnlaget

Kartleggingen av de operative Parquet-filene viser følgende:

| Behov | Tilgjengelig grunnlag | Konklusjon |
| --- | --- | --- |
| Virksomhetsregnskap | `agltransact.parquet`, feltet `amount`, gruppert på `account`, `dim_4` og `period` | Kan beregnes fra Parquet |
| Virksomhetsbudsjett | `apltransact.parquet` koblet med `apltransactvalue.parquet` via `trans_id`, filtrert på versjon `2026B` | Kan beregnes fra Parquet for alle tolv måneder |
| Kontantregnskap | Ingen egen Parquet-tabell eller felt som gir samme kontantverdier som Excel-rapporten | Må fortsatt hentes fra operativ Excel-kilde eller en ny kontantkilde |
| Investeringsrapport | `agltransact.parquet`, konto 1250, 1270, 1280 og 1281 | Egen hovedgruppe med samme periode-, finansierings- og seksjonsfilter som rapporten ellers |
| Investeringsbudsjett | Ingen budsjettposter for de fire investeringskontoene i valgt operativt grunnlag | Budsjett, avvik og forbruk holdes tomme |
| Seksjon/kostnadssted | `dim_1` i hovedbok og budsjett, navn fra dimensjonsregisterets `attribute_id = C1` | Kan filtreres fra operative Parquet-kilder |

Hovedboksfilen inneholder perioder fra `202601` til `202607`, mens
budsjettverdiene for `2026B` dekker `202601` til `202612`. Nyeste periode i
en fil skal ikke automatisk regnes som en komplett måned; rapportens regel
for «nyeste tilgjengelige periode» må derfor kontrollere periodekompletthet.

Kontantverdiene kan ikke erstattes med virksomhetens hovedbok. En
kontosammenligning for finansiering `154301` viser at Parquet reproduserer
hovedbokskolonnen i Excel, mens kontantkolonnen har et annet
periodiseringsgrunnlag. Dette gjelder blant annet lønn, feriepenger,
avskrivninger og konsulentkostnader.

Kontantkilden har ikke en pålitelig seksjonsfordeling. Når brukeren velger en
seksjon, viser appen derfor kontantfeltene som manglende. Den fordeler ikke
totalverdier og fyller ikke inn null.

## Beregningsfunksjoner

| Tall | Funksjon/kilde | Regel |
| --- | --- | --- |
| Hovedbok | `parquet_actuals_by_account` | Summerer `data/agltransact.parquet` per konto |
| Månedsbudsjett | `synapse_budget_by_account` | Summerer `2026B` fra `apltransact*.parquet` |
| Periodebudsjett | `calculated_account_values` | Summerer månedene i valgt periode |
| Årsbudsjett | `calculated_account_values` | Summerer alle tolv måneder |
| Avvik | `calculated_account_values` | Budsjett minus hovedbok |
| Forbruk | `_summed_values` og kontoberegningen | Hovedbok delt på årsbudsjett |
| Kontant | Operativt Excel-uttrekk | Uavhengig Parquet-kilde finnes ikke ennå |
| Investeringsrapport | `build_parquet_report` / `buildTask2Report` | Hovedbok for konto 1250, 1270, 1280 og 1281, gruppert under «Varige driftsmidler» |

## Finansieringsregler

| Rapportvalg | Hovedbok | Budsjett | Periode |
| --- | --- | --- | --- |
| `154301` | `dim_4 = 154301` | Eksisterende operative detaljkilde for Jan–mar; Parquet for øvrige perioder | Jan–mar, Jan–apr, Jan–jun |
| `154345` | `dim_4 = 154345` | `dim_1 = 212` | Jan–mar, Jan–apr, Jan–jun |
| `154322+045101` | `dim_4 IN (154322, 045101)` | `dim_1 = 761` | Jan–mar, Jan–apr, Jan–jun |
| Alle | Summen av rapportens finansieringsvalg, med driftskonto 5000–7834 og investeringskonto 1250, 1270, 1280 og 1281 | Hele `2026B`; manglende investeringsbudsjett beholdes tomt | Alle tilgjengelige måneder |

Excel-fasiten for januar–mars 2026 bekrefter denne avgrensningen. Den
beregnede hovedboken er 97 658,4861 tusen kroner både i Parquet og fasit.
Utvalget inkluderer finansieringskoder uten eget filtervalg, men holder
inntekts- og finansposter utenfor driftskostnadsrapporten.

Alle rapportvalg har i tillegg perioden `Til nyeste komplette måned`.
Komplett betyr at hovedboken har minst ett bilag datert til månedens siste
dag. I gjeldende uttrekk er juni 2026 siste komplette måned; juli inneholder
bare bilag til og med 3. juli og tas derfor ikke med.

Månedsvisningen er uavhengig av det akkumulerte periodevalget og viser alltid
budsjettet for alle tolv måneder fra januar til desember. For perioden
`Jan–jun` beregnes periodebudsjettet som summen av januar, februar, mars,
april, mai og juni. Hovedboken summeres tilsvarende til og med periode
`202606`. Årsbudsjettet er summen av januar til desember. Fullvisningen og
Excel-eksporten gjentar derfor ikke den samme summen etter desember.

## Testdekning

`kode/tests/test_task2_excel_fasit.py` kontrollerer 2 845 numeriske celler fra de
tre detaljarkene i dashboardfasiten:

- 2 282 budsjettceller: tolv måneder, periodebudsjett og årsbudsjett;
- 400 hovedbok- og avledede celler;
- 163 kontantidentiteter.

Testen sammenligner 163 kontorader. Alle budsjett- og hovedbokceller kan
reproduseres fra Parquet. Det tidligere avviket på konto `7400` for `154301`
ble lukket da hovedboksnapshotet fra 14. juli 2026 ble tatt i bruk. Nye avvik
stopper testen.

Kontantkolonnene testes bare for identiteten
`kontantbudsjett − kontant = kontantavvik`. De kan ikke kalles uavhengig
avstemt før økonomi leverer en operativ kontantkilde utenfor Excel.

En eksplisitt nullverdi i det operative Excel-arket beholdes som `0`.
Hvis en konto eller kontantverdi mangler i kilden, beholdes den som tom verdi
og kontantavvik beregnes ikke. Rapporten viser tom verdi som `–`; manglende
kontantgrunnlag skal aldri erstattes med et konstruert nullbudsjett.

Det samme gjelder virksomhetsbudsjettet fra Parquet. En eksplisitt nullpost
beholdes som `0`, mens en konto uten budsjettpost vises som `–`. Rapporten
beregner ikke avvik eller forbruk når hovedbokskontoen mangler budsjettgrunnlag.
I `2026B` finnes budsjettposter bare i kontoklasse 5, 6 og 7. Inntekter i
kontoklasse 3 og finansposter i kontoklasse 8 har derfor tomt budsjettgrunnlag,
ikke nullbudsjett.

## Kjøring

Kommandoene under kjøres fra `oppgave2/kode/`.

```bash
npm run test:excel
npm run refresh
```

## Visuell sammenligning

Den separate kontrollapplikasjonen ligger i
`outputs/oppgave2_kontogruppering_sammenligning.html`.

- Valget `Finansiering 154301` sammenlignes med fasitfilen for `154301`.
- Valget `Alle finansieringer` sammenlignes med fasitfilen for `ALLE`.
- Hvert felt viser Excel-verdi, beregnet verdi, differanse og status.
- `Vis bare avvik` skal gi null rader når alt matcher.

Bygg kontrollapplikasjonen på nytt med:

```bash
npm run report
```

Kontrollapplikasjonen leser fasit kun for sammenligning. Fasitverdier kopieres
ikke inn i den beregnede kontogrupperingen.
