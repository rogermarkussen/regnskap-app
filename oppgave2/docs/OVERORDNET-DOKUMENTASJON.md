# Oppgave 2 – overordnet dokumentasjon

**Sist oppdatert:** 14. august 2026

## Formål

Oppgave 2 er en kontogrupperingsrapport som viser budsjett og regnskap per
hovedgruppe, kontogruppe og konto. Rapporten skal gjøre det mulig å undersøke
økonomien uten å arbeide direkte i Excel eller Parquet-filer.

Rapporten har fire finansieringsvalg:

- `154301`;
- `154345`;
- `154322 + 045101`;
- alle finansieringer.

Alle beløp vises i tusen kroner.

## Det brukeren kan gjøre

Brukeren kan:

- velge finansiering;
- velge januar–mars, januar–april, januar–juni eller nyeste komplette periode;
- vise virksomhetsregnskap, kontantregnskap eller månedsbudsjett;
- filtrere på hovedgruppe;
- søke etter kontonummer, kontonavn eller kontogruppe;
- vise kontogrupper eller bare kontoer;
- åpne én kontogruppe eller alle kontogrupper;
- eksportere den valgte rapporten til Excel.

Månedsvisningen viser januar–desember og har en egen kolonne for summen av
alle månedene.

## Datakilder

### Hovedbok

Virksomhetsregnskapet beregnes fra:

```text
data/agltransact.parquet
```

Hovedboken summeres per konto, finansiering og valgt periode. Finansiering
ligger i feltet `dim_4`.

### Budsjett

Budsjettet beregnes fra:

```text
data/apltransact.parquet
data/apltransactvalue.parquet
```

Filene kobles med `trans_id`. Rapporten bruker budsjettversjon `2026B`.
Budsjettverdiene finnes for alle tolv måneder.

### Kontogrupper

Kontoenes plassering i hovedgrupper og kontogrupper kommer fra:

```text
data-fra-økonomi/Kontogruppering 17.06.26.xlsx
```

Løsningen viser fire hovedgrupper og 118 unike kontoer når
investeringsrapportens fire kontoer tas med. Investeringsrapporten står først.
Konto 5405 forekommer flere ganger i grupperingsfilen og dedupliseres for å
unngå dobbel summering.

### Kontantregnskap

Kontantverdiene kommer foreløpig fra:

```text
data-fra-økonomi/Dashboard - KPIer 19.06.26.xlsx
```

Det finnes ikke en selvstendig Parquet-kilde som kan reprodusere
kontantkolonnene. Kontantregnskapet kan ikke erstattes med hovedbok, fordi de
to regnskapene har forskjellig periodisering.

## Finansieringsregler

| Rapportvalg | Hovedbok | Budsjett |
| --- | --- | --- |
| `154301` | `dim_4 = 154301` | Budsjett uten `dim_1 = 212` og `dim_1 = 761` |
| `154345` | `dim_4 = 154345` | `dim_1 = 212` |
| `154322 + 045101` | `dim_4 IN (154322, 045101)` | `dim_1 = 761` |
| Alle finansieringer | Alle finansieringskoder på driftskostnadskonto 5000–7834 | Hele budsjettversjon `2026B` |

Kontoomfanget er avgjørende for samlet visning. Inntekts- og finansposter
utenfor 5000–7834 skal ikke inngå i driftskostnadene. Innenfor dette
kontoomfanget tar «Alle finansieringer» også med finansieringskoder som ikke
har et eget valg i grensesnittet.

## Periodeberegning

Periodebudsjettet er summen av budsjettmånedene fra januar til valgt måned.
Hovedboken summeres fra periode `202601` til valgt sluttperiode.

Eksempel for januar–juni:

```text
Periodebudsjett = januar + februar + mars + april + mai + juni
Hovedbok = alle relevante posteringer i periode 202601–202606
```

Valget «Til nyeste komplette måned» beregnes automatisk. En måned regnes som
komplett når hovedboken inneholder bilag datert til månedens siste dag. I
dagens uttrekk er juni 2026 siste komplette måned. Juli inneholder bare bilag
til og med 3. juli og tas derfor ikke med.

## Beregnede kolonner

### Virksomhetsregnskap

- Budsjett for valgt periode.
- Hovedbok for valgt periode.
- Avvik = budsjett minus hovedbok.
- Årsbudsjett = summen av januar–desember.
- Forbruk = hovedbok delt på årsbudsjett.

Et negativt avvik betyr at hovedbok er høyere enn budsjett.

### Månedsbudsjett

Månedsvisningen viser alle tolv budsjettmånedene. Årstotalen vises ikke en
gang til etter desember, siden den allerede står i kolonnen «Årsbudsjett».

### Kontantregnskap

Webvisningen og Excel-eksporten viser én kolonne med kontantregnskap. Det
operative grunnlaget har ikke et kontantbudsjett som kan brukes til å vise et
meningsfullt avvik.

Manglende kontantgrunnlag vises som `–` og erstattes ikke med konstruerte
nullverdier.

## Investeringsrapport

Investering vises som en egen hovedgruppe, ikke som to egne tallkolonner.
Hovedgruppen «Investeringsrapport» inneholder undergruppen «Varige
driftsmidler» og kontoene 1250, 1270, 1280 og 1281. Hovedbokstallene hentes
fra `agltransact.parquet` med de samme periode-, finansierings- og
seksjonsfiltrene som resten av rapporten.

For januar–mars 2026 og alle finansieringer summerer disse fire kontoene til
2 108,61732 tusen kroner. Det operative budsjettgrunnlaget har ingen
budsjettposter for kontoene. Budsjett, avvik og forbruk vises derfor som tomme
verdier, ikke som konstruerte nuller.

Investeringsrapporten har egen total «Totale investeringer» og inngår ikke i
totalen «Driftskostnader».

Hele kontostrukturen vises i rapporten, også når kontoene har null. Derfor
viser «Åpne alle grupper» alle 118 kontoer, inkludert de fire
investeringskontoene, selv om bare to kostnadskontoer har
regnskapstall for `154345`.

## Automatiske kontroller

Automatiske kontroller vises ikke på nettsiden, men beholdes internt. De
kontrollerer blant annet:

- at alle finansierings- og periodevalg finnes;
- at rapportene inneholder riktig antall kontoer og én totalrad;
- at budsjett minus hovedbok er lik avvik;
- at månedsbudsjettet summerer til årsbudsjettet;
- at januar–juni er summen av måned 1–6;
- at kontantavvik bare beregnes når kontantgrunnlaget finnes;
- at investeringsrapporten avstemmer konto 1250, 1270, 1280 og 1281 mot hovedboken;
- at beregnede hovedbok- og budsjettverdier stemmer mot Excel-fasiten.
- at alle seksjoner har 16 finansierings-/periodevalg og alle 118 kontoer;
- at seksjonssummene avstemmer mot totalsynet;
- at kontantverdier ikke konstrueres for seksjoner når kilden mangler fordeling.

Excel-filer under `Fasit/` brukes bare som testorakler. De brukes aldri til å
fylle publiserte hovedbok- eller budsjettverdier.

## Mappestruktur

```text
oppgave2/
├── kode/                 Applikasjon, beregninger, tester og bygg
│   ├── scripts/          Databygging og validering
│   ├── src/              Statisk Svelte-app, rapportmodell og Excel-eksport
│   ├── static/data/      Regenererbar Parquet-fil for nettleseren
│   └── tests/            Fasit-, periode- og eksporttester
├── docs/                 Dokumentasjon
└── README.md             Kort prosjektoversikt
```

Operative data, fasit og genererte kontrollrapporter ligger under den eksterne
`REGNSKAP_DATA_ROOT`, ikke i repositoryet.

## Kjøring

Fra repositoryets rot:

```bash
npm run dev:task2
```

Rapporten åpnes på:

```text
http://localhost:3001/
```

For å bygge data, kjøre alle tester og lage produksjonsbygget:

```bash
cd oppgave2/kode
npm run refresh
```

## Avklaringer som fortsatt bør gjøres

### 1. Endelig definisjon av investering

Økonomi bør bekrefte at konto 1250, 1270, 1280 og 1281 er den fullstendige
avgrensningen for investeringsrapporten. Løsningen følger disse kontoene på
tvers av rapportens finansierings-, periode- og seksjonsvalg. Eventuelle nye
investeringskontoer må legges til som en eksplisitt faglig regel.

### 2. Operativ Parquet-kilde for kontantregnskap

Kontantregnskapet er fortsatt Excel-avhengig. Økonomi eller dataplattformen
bør levere en operativ Parquet-kilde med dokumentert kobling til konto,
finansiering og periode.

### 3. Kontantregel for alle finansieringer

Dagens kontantsum for «Alle finansieringer» ekskluderer `154345` når
kildeperioden ikke samsvarer med rapportperioden. Regelen bør godkjennes som
en varig forretningsregel.

### 4. Fullstendighet for nyeste periode

Dagens regel bruker bilag på månedens siste dag som tegn på at perioden er
komplett. Det bør avklares om dataplattformen kan levere et eksplisitt
periodestengt- eller uttrekkstidspunktfelt. Det vil være sikrere enn å utlede
fullstendighet fra bilagsdato.

### 5. Visning av nullkontoer

Rapporten viser nå hele kontostrukturen. Dette gjør kildeomfanget synlig, men
gir mange nullrader for finansieringer med få posteringer. Det bør avklares om
standardvisningen heller skal vise aktive kontoer og tilby en bryter «Vis
nullkontoer».

### 6. Avgrensning av investeringskontoer

Investeringsrapporten er avgrenset til konto 1250, 1270, 1280 og 1281, slik
de fremgår av referanserapporten. Andre balanse- og inntektskontoer inngår
ikke uten en egen faglig regel.

## Anbefalt faglig godkjenning før levering

En økonomibruker bør kontrollere:

1. totalsummene for alle finansieringsvalg;
2. fortegnet på avvik;
3. plasseringen av kontoene i kontogruppene;
4. avgrensningen til investeringskonto 1250, 1270, 1280 og 1281;
5. at investeringsrapporten holdes utenfor driftskostnadstotalen;
6. kontantregnskapets kilde og periode;
7. regelen for nyeste komplette måned;
8. Excel-eksportens kolonner, enhet og desimaler.
