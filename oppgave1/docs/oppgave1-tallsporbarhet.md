# Oppgave 1 – tallsporbarhet og fasittest

> Oppdatert 07.09.2026: Appene bruker `2026RV` og finansiering fra `dim_4` for
> rapportåret 2026. Eldre avstemminger mot `2026B` nedenfor er historiske.
> De nye opplastingstestene avstemmer direkte mot RV i `data/lokaldata`;
> forventningsverdiene i gamle Excel-fasitfiler er ikke endret.

> Datastiene i dette dokumentet er logiske kilder. De fysiske filene ligger
> under den eksterne dataroten og slås opp som `common.ledger`,
> `common.budget_header`, `common.budget_values` og `fasit.dashboard_kpi` i
> rotens `data-manifest.json`.

**Sist oppdatert:** 29. juli 2026

## Prinsipp

Oppgave 1 beregner alle publiserte KPI-er i
`kode/scripts/dashboard_kpi_data.py`. Produksjonssiden leser bare den beregnede
tabellen `dashboard_kpi_calculated`. Excel-filen under `Fasit/` leses ikke av
beregningsmodulen eller dashboardet.

## Kilder

| Tall | Operativ kilde | Regel |
| --- | --- | --- |
| Hovedbok | `data/agltransact.parquet` | Summeres per finansiering, periode og kontoregel |
| Budsjett | `data/apltransact.parquet` + `data/apltransactvalue.parquet` | Versjon `2026B` |
| `154301` budsjett | Samme budsjettfiler | `dim_4 = 154301` |
| `154345` budsjett | Samme budsjettfiler | `dim_4 = 154345` |
| `154322+045101` budsjett | Samme budsjettfiler | `dim_4 IN (154322, 045101)` |
| Testlab | Hovedbok med `dim_2 = 7114`, konto `5000–7834` | Budsjett vises som manglende når kilden ikke har rader |

Rapportperiodene er januar–mars, januar–april og januar–juni 2026.

## KPI-regler

| KPI | Kontoregel |
| --- | --- |
| ADK | `6110–7834` |
| Konsulenter | `6700, 6710, 6720, 6730, 6731, 6732` |
| Reise | `7100, 7130, 7131, 7150, 7190, 7199` |
| Overtid | `5050, 5150` |
| Lønnsandel `154301` | `5000–5999 / 5000–7834` |
| Lønnsandel `154322+045101` | `5000–5999 / 5000–7834` |

Lønnsandelen er satt tilbake til den opprinnelige beregningen etter korrigert
brukerbeslutning 8. september 2026, med regelversjon `2026-09-08-r2`.
Begge finansieringsgruppene bruker lønn delt på totale kostnader, inkludert
lønn, avskrivninger og andre driftskostnader (`5000–7834`). Null i nevneren
gir manglende verdi. Den opprinnelige sirkelvisningen er gjeninnført.
`154345` følger valgt rapportperiode.

Budsjettunntaket for den dobbeltførte posten `5219663` på `711` i `2026RV`
gjelder også oppgave 1. Erstatningsposten `5733017` på `771` beholdes.
Se `DATA.md` for avgrensningen. Finansiering bestemmes fortsatt av `dim_4`.

Excel-fasiten er et uendret, uavhengig historisk testorakel. C15 bruker
nevneren med totale kostnader. C32 bruker ADK-nevneren og gir derfor et
forventet avvik fra den gjeldende regelen. Budsjettceller fra opprinnelig
budsjett kan avvike fra 2026RV og det bekreftede duplikatunntaket; slike
avvik skal dokumenteres.

## Testbevis

`kode/tests/test_task1_excel_fasit.py`:

- sammenligner 12 fortsatt gjeldende dashboardverdier mot Excel;
- kontrollerer regnestykket og kildemerkingen på alle 27 KPI-rader;
- krever at konto `7400` matcher etter oppdatering
  til hovedboksnapshotet fra 14. juli 2026;
- kontrollerer manglende Testlab-budsjett;
- lager et alternativt hovedboksgrunnlag og beviser at berørte KPI-er endres
  etter formelen, mens en urelatert KPI står stille;
- stopper hvis produksjonssiden begynner å lese fasit-JSON eller den gamle
  `dashboard_kpi`-tabellen igjen.
- bygger alle KPI-radene i en isolert mappe der `Fasit/` ikke finnes;
- søker etter kopierte fasittotaler, `.xlsx`, `openpyxl` og
  `data-fra-økonomi` i beregningsmodulen.

Oppgave 1-løpet kjører i tillegg de Parquet-baserte detaljkontrollene fra
oppgave 2 for de samme fire finansieringsarkene:

- 2 408 budsjettceller beregnes fra `2026B` i budsjett-Parquet;
- 418 hovedbok- og avledede celler beregnes fra hovedbok-Parquet;
- alle hovedbok- og avledede celler matcher innenfor toleransen.

Det gir 2 826 konto-/cellekontroller før dashboardtotalene og de 27
kortregnestykkene kontrolleres. Kontantkolonnene inngår ikke i oppgave 1 og
kjøres derfor ikke som del av dette testløpet.

Kjør hele løpet:

```bash
npm run refresh
```

## Produksjonsstatus

Den tekniske beregningen bruker nå ett operativt Parquet-grunnlag for både
publisering og kontroll. Dashboardet viser:

- et SHA-256-basert datasett-ID som identifiserer de tre kildefilene;
- hovedbokens periodedekning og siste transaksjonsdato;
- eksplisitt advarsel når uttrekkstidspunkt og periodestatus ikke finnes i
  kildefilene.

`npm run validate:kpi` stopper dersom metadata mangler, datasett-ID-en er
ugyldig, eller hovedbok/budsjett ikke dekker alle publiserte perioder.

De fire KPI-beslutningene er godkjent og datert i
`docs/faglig-godkjenning.md`. Det gjenstår å registrere godkjennerens navn og å
få faktisk uttrekkstidspunkt og periodestatus fra den operative dataleveransen;
lokal filendring brukes ikke som erstatning for dette.

`kode/tests/e2e/budgetFinancing.spec.js` laster de faktiske tolv filene i alle
tre apper og avstemmer budsjettene med uavhengig DuckDB-SQL som utelater kun
den bekreftede posten. Oppgave 1 avstemmes også for begge lønnsandelene.
`tests/financing.test.mjs` kontrollerer avgrensningen av unntaket, kontogrenser for lønn og totale kostnader,
inkludering av avskrivninger og null i nevneren.
