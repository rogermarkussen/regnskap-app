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

Den flate `data/`-mappen i arbeidskopien er ignorert av versjonskontroll og kan
brukes som komplett, lokalt testgrunnlag. Den overstyrer bare kildene som er
oppført under `test_datasets` i manifestet. Fasit og Excel-mal leses fortsatt
fra den ordinære, separate dataroten.

Kjør alle tre databygg og kontroller fra repositoryroten:

```bash
npm run test:data-folder
```

De offentlige appene bruker ikke disse avledede filene. Brukeren velger i stedet
én felles, flat mappe som inneholder nøyaktig de 12 operative Parquet-filene.
Alle tre appene validerer den samme fillisten og beregner rapportgrunnlaget
lokalt i nettleseren. Eksempel på lokal mappe er `korrekt-data/`.

Hovedbokssnapshotet bruker den komplette, avstemte perioden `202602` fra
snapshot `2026-08-23` og alle andre perioder fra den lokale dataleveransen.
Den opprinnelige lokale hovedboksfilen er ikke overskrevet. Det sammenslåtte,
ZSTD-komprimerte snapshotet ligger under
`data/snapshots/2026-08-29-february-repaired/` og er kilden manifestet peker på.

Testmappen inneholder hovedbok for 2024–2026, budsjettversjonene for de samme
årene, kontantposteringer periodisert med `acatrans.pay_period`, kontoplan,
dimensjonsregister, reskontro, fakturakø, bilagskart og workflowhistorikk.
Kontantbudsjett er fortsatt et dokumentert datagap. Ingen av Parquet-kildene
har en egen, periodisert kontantbudsjettserie. Appen viser derfor operativt
kontantregnskap, men holder kontantbudsjett og kontantavvik tomme.

## Datakontrakten

### Opplastingssnapshot med finansiering

De tolv filene i den lokale `data/lokaldata/`-mappen er kontrollert mot et
uforanderlig snapshot under ekstern datarot:
`snapshots/2026-09-07-lokaldata-dim4/operative/`. Oppføringene `upload.*` og
`upload_snapshot_id` i `data-manifest.json` beskriver dette snapshotet.
De tre budsjettfilene fra `lokaldata/snapshot/` er flyttet opp til fellesmappen.
De erstattede filene er arkivert utenfor repositoryet.

Kontroller snapshotet og eventuelt opplastingsmappen:

```bash
npm run check:upload-data
python scripts/validate_data_contract.py --upload --folder data/lokaldata
REGNSKAP_COMMON_DATA_FOLDER="$PWD/data/lokaldata" npm run test:upload-apps
```

Alle tre apper bruker `apltransact.dim_4` som budsjettets finansiering.
Koststed (`dim_1`) brukes bare til seksjonsutvalg, aldri som reserveverdi for
finansiering. `154322` og `045101` vises fortsatt samlet. Tom kode vises som
`Uten finansiering`. Andre koder beholdes og kan velges i kontogrupperingen.
Opplastingen avviser budsjettfiler der hele `dim_4`-kolonnen mangler.
Rapportåret 2026 bruker utelukkende revidert budsjett (`2026RV`), uten reserveverdi
fra `2026B`. Tidligere rapportår beholder opprinnelig budsjett (`ÅÅÅÅB`).

Dette nye opplastingssnapshotet erstatter ikke de historiske `common.*`- og
fasitoppføringene. Det eldre komplette testløpet og internbygget krever fortsatt
at kildene fra snapshot `2026-08-23` finnes. En gammel budsjettkilde uten `dim_4`
må oppdateres fra operative data før den kan brukes med den nye beregningen.

### Felles kontrakt

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

Oppgave 2 bruker de tre eldre Excel-kildene bare for det gamle
produksjonssnapshotet. Når `REGNSKAP_TEST_DATA_ROOT` er satt, bygges kontoplan,
hovedbok, budsjett og kontantregnskap fra Parquet. Fasit brukes bare i den
separate avstemmingstesten.

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
offentlig app starter tom og krever at brukeren velger den samme lokale mappen
med de 12 operative Parquet-filene. Filene leses og beregnes lokalt i
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
