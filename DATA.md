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

## Lokal testmappe med rå Parquet-filer

Den flate `data/`-mappa i arbeidskopien er ignorert av versjonskontroll og kan
brukes som komplett, lokalt testgrunnlag. Ho overstyrer berre kjeldene som er
oppførte under `test_datasets` i manifestet. Fasit og Excel-mal blir framleis
lesne frå den ordinære, separate datarota.

Køyr alle tre databygg og kontrollar frå repositoryrota:

```bash
npm run test:data-folder
```

Kommandoen skriv avleidde filer under
`data/generated/2026-08-29-february-repaired/`. Etterpå kan den same `data/`-mappa veljast
i oppgåve 1, 2 og 3. Mappeveljaren leitar rekursivt og finn dei
oppgåvespesifikke Parquet-filene utan at rådata blir kopierte inn i appane eller
bygga.

Hovudbokssnapshotet bruker den komplette, avstemte perioden `202602` frå
snapshot `2026-08-23` og alle andre periodar frå den lokale dataleveransen.
Den opphavlege lokale hovudboksfila er ikkje overskriven. Det samanslåtte,
ZSTD-komprimerte snapshotet ligg under
`data/snapshots/2026-08-29-february-repaired/` og er kjelda manifestet peikar på.

Testmappa inneheld hovudbok for 2024–2026, budsjettversjonane for dei same åra,
kontantposteringar periodiserte med `acatrans.pay_period`, kontoplan,
dimensjonsregister, reskontro, fakturakø, bilagskart og workflowhistorikk.
Kontantbudsjett er framleis eit dokumentert datagap. Ingen av Parquet-kjeldene
har ein eigen, periodisert kontantbudsjettserie. Appen viser derfor operativt
kontantrekneskap, men held kontantbudsjett og kontantavvik tomme.

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

Oppgåve 2 bruker dei tre eldre Excel-kjeldene berre for den gamle
produksjonssnapshoten. Når `REGNSKAP_TEST_DATA_ROOT` er sett, blir kontoplan,
hovudbok, budsjett og kontantrekneskap bygde frå Parquet. Fasit blir berre brukt
i den separate avstemmingstesten.

## Genererte filer

Databygg skriver til:

```text
$REGNSKAP_DATA_ROOT/generated/<snapshot-id>/<oppgave>/
```

Hver app lager et regenererbart statisk `build/`. Oppgave 1 lager i tillegg en
lokal DuckDB for Evidence. Oppgave 2 bygger én avledet, ZSTD-komprimert
Parquet-fil som den statiske appen leser i nettleseren.
Bygg og mellomfiler er ignorert av versjonskontroll. Interne bygg kan inneholde
de avledede filene som er eksplisitt tillatt i publiseringspolicyen. Offentlige
bygg skal ikke inneholde datafiler.

## Hosting

Alle tre appene kan publiseres som datafrie grensesnitt på GitHub Pages. En
offentlig app starter tom og krever at brukeren velger den oppgavespesifikke
mappen med genererte Parquet-filer på egen maskin. Filene leses lokalt i
nettleserfanen, lastes ikke opp og lagres ikke i nettleseren. En ny sideåpning
krever derfor et nytt mappevalg.

[`deployment-policy.json`](deployment-policy.json) tillater bare denne
datafrie offentlige profilen. Produksjonskontrollen avviser Parquet-, Excel- og
andre datafiler i et offentlig artefakt. Interne bygg med dagens data er fortsatt
klassifisert for intern bruk, og oppgave 3 krever autentisert intern hosting.

## Sikker oppdateringsrekkefølge

1. Opprett et nytt snapshot utenfor kode-repositoryet.
2. Klassifiser filene som operative, fasit, mal eller referanse.
3. Oppdater manifest og kontrollsummer.
4. Kjør `npm run check:data` og `npm test`.
5. Kjør `npm run build:internal`.
6. Undersøk alle faglige avvik. Ikke juster beregninger til fasitverdier.
7. Publiser bare de verifiserte `build/`-mappene på godkjent intern hosting.
