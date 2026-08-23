# Oppgave 1 – tallsporbarhet og fasittest

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
| `154301` budsjett | Samme budsjettfiler | `dim_1` er verken `212` eller `761` |
| `154345` budsjett | Samme budsjettfiler | `dim_1 = 212` |
| `154322+045101` budsjett | Samme budsjettfiler | `dim_1 = 761` |
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

Reglene er faglig godkjent 6. august 2026 og versjonert som `2026-08-06` i
det publiserte datasettet. `154345` følger valgt rapportperiode.

Excel-fasiten bruker den tidligere ADK-nevneren for lønnsandel på
`154322+045101`. Den godkjente regelen gir derfor et forventet, dokumentert
avvik i denne cellen. Testen kontrollerer at beregningen ikke endres tilbake til
den gamle Excel-regelen.

## Testbevis

`kode/tests/test_task1_excel_fasit.py`:

- sammenligner 12 fortsatt gjeldende dashboardverdier mot Excel;
- kontrollerer regnestykket og kildemerkingen på alle 27 KPI-rader;
- krever at konto `7400` og den avledede lønnsandelen matcher etter oppdatering
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
