# Data, fasit og statiske bygg

## Grensen mellom kode og data

Repositoryet skal bare inneholde kode, konfigurasjon, dokumentasjon og
syntetiske testfiler. Følgende skal ligge i en separat datarot:

- operative Parquet- og Excel-kilder;
- uavhengige fasitfiler;
- Excel-maler;
- genererte Parquet-tabeller, rapporter og regneark;
- arkiver og tidligere datasnapshots.

Standard lokal struktur er:

```text
Regnskap/                       kode-only repository
Regnskap-data/
├── snapshots/2026-08-23/
│   ├── operative/              beregningskilder
│   ├── fasit/                  skrivebeskyttede testorakler
│   ├── templates/              presentasjonsmaler
│   └── reference/              referansedata
├── generated/2026-08-23/       avledede tabeller og leveranser
└── archives/                   eldre og ubrukte data
```

Sett en annen datarot slik:

```bash
export REGNSKAP_DATA_ROOT=/sikker/plassering/Regnskap-data
```

## Datakontrakten

[`data-manifest.json`](data-manifest.json) er den eneste autoritative
koblingen fra kode til data. Hver oppføring har:

- stabil datasett-ID, for eksempel `common.ledger`;
- relativ filsti under dataroten;
- format og rolle;
- sikkerhetsklassifisering;
- SHA-256 for å oppdage feil eller utilsiktet filbytte.

All applikasjonskode går gjennom `shared/data_contract.py` og en liten adapter
for den enkelte app. Absolutte eller oppgavespesifikke rådatastier skal ikke
legges inn i produksjonskode.

Valider kontrakten før test og bygg:

```bash
npm run check:data
```

Ved en ny dataleveranse opprettes et nytt uforanderlig snapshot. Kopier aldri
over et snapshot som allerede er referert i Git. Kontroller filene, oppdater
manifestets snapshot-ID, stier og SHA-256, og kjør hele test- og byggløpet.

## Operative data og fasit

Operative data er eneste beregningskilde for publiserte tall. Fasit har rollen
`fasit` og leses bare fra tester og kontrollrapporter. Produksjonsbygg skal ikke
lese fasit og skal aldri bruke den som reserveverdi.

Oppgave 2 har fortsatt tre operative Excel-avhengigheter. De er merket
`operative-temporary` i manifestet og skal erstattes av autoritative Parquet-
kilder når disse blir tilgjengelige.

## Genererte filer

Databygg skriver til:

```text
$REGNSKAP_DATA_ROOT/generated/<snapshot-id>/<oppgave>/
```

Evidence lager en lokal, regenererbar DuckDB under appens `sources/` og et
statisk `build/`. Begge er ignorert av versjonskontroll. Bare eksplisitt
tillatte avledede filer kan følge med et statisk bygg.

## Hosting

Alle tre appene er klassifisert for intern bruk med dagens data. Oppgave 3
krever autentisert hosting fordi den inneholder faktura-, leverandør-, bilags-
og brukeridentifikatorer. Et offentlig bygg er sperret av
[`deployment-policy.json`](deployment-policy.json).

En framtidig offentlig variant må enten bruke et særskilt anonymisert og
godkjent datasett eller hente beskyttede data etter innlogging. Det holder ikke
å skjule lenker i brukergrensesnittet, fordi filer i et statisk bygg kan lastes
ned direkte.

## Sikker oppdateringsrekkefølge

1. Opprett et nytt snapshot utenfor kode-repositoryet.
2. Klassifiser filene som operative, fasit, mal eller referanse.
3. Oppdater manifest og kontrollsummer.
4. Kjør `npm run check:data` og `npm test`.
5. Kjør `npm run build:internal`.
6. Undersøk alle faglige avvik. Ikke juster beregninger til fasitverdier.
7. Publiser bare de verifiserte `build/`-mappene på godkjent intern hosting.
