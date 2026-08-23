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

Grupperingsfilen definerer 3 hovedgrupper, 16 kontogrupper og 114 unike
kontoer. Konto 5405 forekommer flere ganger i kildefilen og dedupliseres for
å unngå dobbel summering.

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
| Alle finansieringer | Summen av rapportens finansieringer | Hele budsjettversjon `2026B` |

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

Månedsvisningen viser alle tolv budsjettmånedene. Kolonnen «Totalt alle
måneder» er summen av januar–desember og tilsvarer årsbudsjettet.

### Kontantregnskap

- Kontantbudsjett.
- Kontantregnskap.
- Kontantavvik = kontantbudsjett minus kontantregnskap.

Manglende kontantgrunnlag vises som `–` og erstattes ikke med konstruerte
nullverdier.

## Investering og finansiering 154345

Følgende arbeidsregel er godkjent for løsningen:

- investeringsbudsjett = budsjett `2026B` med `dim_1 = 212`;
- investeringsregnskap = hovedbok med `dim_4 = 154345`.

Kolonnene vises for `154345` og «Alle finansieringer». De er tomme for de
andre finansieringsvalgene.

For januar–juni 2026 gir regelen:

- investeringsbudsjett: 14 440 tusen kroner;
- investeringsregnskap: 7 028 tusen kroner.

I den operative hovedboken har `154345` kostnadstall på konto 6710 og 6730.
Begge kontoene ligger i kontogruppen «Konsulentkostnader». Budsjettet ligger
bare på konto 6710. Det finnes også en postering på inntektskonto 3900, men
den inngår ikke i rapportens driftskostnader.

Hele kontostrukturen vises i rapporten, også når kontoene har null. Derfor
viser «Åpne alle grupper» alle 114 kontoer, selv om bare to kostnadskontoer har
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
- at investeringskolonnene følger `154345`-regelen;
- at beregnede hovedbok- og budsjettverdier stemmer mot Excel-fasiten.
- at alle seksjoner har 16 finansierings-/periodevalg og alle 114 kontoer;
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

Økonomi bør bekrefte at `dim_1 = 212` og `dim_4 = 154345` representerer hele
investeringsområdet. Dagens kilder gir bare kostnadstall på konto 6710 og
6730. Det må avklares om investeringer også bokføres på balansekontoer, andre
finansieringer eller andre dimensjonsverdier.

Inntil dette er endelig bekreftet, kan kolonnenavnene «Budsjett 154345» og
«Regnskap 154345» være mer presise enn generelle investeringsbegreper.

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

### 6. Inntektskonto 3900 for finansiering 154345

Hovedboken inneholder en postering på konto 3900 for `154345`. Kontoen er en
inntektskonto og inngår ikke i driftskostnadstotalen. Økonomi bør bekrefte at
den også skal holdes utenfor investeringsregnskapet.

## Anbefalt faglig godkjenning før levering

En økonomibruker bør kontrollere:

1. totalsummene for alle finansieringsvalg;
2. fortegnet på avvik;
3. plasseringen av kontoene i kontogruppene;
4. investeringsregelen for `154345`;
5. behandlingen av konto 3900;
6. kontantregnskapets kilde og periode;
7. regelen for nyeste komplette måned;
8. Excel-eksportens kolonner, enhet og desimaler.
