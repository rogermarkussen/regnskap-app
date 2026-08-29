# Regnskapsappene

Dette er et kode-only repository for tre selvstendige webapplikasjoner. Oppgave
2 og 3 er statiske Vite/Svelte-apper. Oppgave 1 bruker Evidence internt og har
en egen datafri Vite-app for offentlig publisering.

| App | Formål | Lokal port |
| --- | --- | ---: |
| `oppgave1/kode` | KPI-dashboard | 3003 |
| `oppgave2/kode` | Kontogruppering | 3001 |
| `oppgave3` | Fakturaworkflow og månedsavslutning | 3002 |

Operative data, Excel-maler, fasitfiler og genererte leveranser ligger utenfor
repositoryet. Koden finner dem gjennom [`data-manifest.json`](data-manifest.json)
og miljøvariabelen `REGNSKAP_DATA_ROOT`. Standard datarot er søskenmappen
`../Regnskap-data`.

Les [`DATA.md`](DATA.md) før du oppdaterer data eller publiserer et bygg.

Den komplette, lokale Parquet-mappa under `data/` kan testast slik:

```bash
npm run test:data-folder
```

Når kommandoen er ferdig, kan `data/` veljast direkte i alle tre appane.

## Kom i gang

Krav: Node.js 22, Python/uv og DuckDB CLI.

```bash
npm run install:all
npm run check:data
npm test
npm run build:internal
```

Start én app:

```bash
npm run dev:task1
npm run dev:task2
npm run dev:task3
```

`build:internal` bygger alle tre apper og kontrollerer at de statiske byggene
ikke inneholder rådata, fasit, databaser, Python/SQL-kode eller andre filer enn
de eksplisitt tillatte resultatfilene.

## Datafrie offentlige apper

```bash
npm run build:public
```

Kommandoen bygger tre rene klientapper uten Parquet, Excel, JSON-eksporter eller
andre rapportdata. Etter åpning velger brukeren en lokal oppgavemappe:

- oppgave 1: `$REGNSKAP_DATA_ROOT/generated/<snapshot-id>/oppgave1/evidence`;
- oppgave 2: `$REGNSKAP_DATA_ROOT/generated/<snapshot-id>/oppgave2/static-app`;
- oppgave 3: `$REGNSKAP_DATA_ROOT/generated/<snapshot-id>/oppgave3/web`.

`.github/workflows/pages.yml` bygger og publiserer alle tre under
`/oppgave1/`, `/oppgave2/` og `/oppgave3/` når `main` oppdateres på GitHub.
Rapportfilene leses bare i den aktuelle nettleserfanen. Se
[`deployment-policy.json`](deployment-policy.json) og [`DATA.md`](DATA.md).

## Viktige grensesnitt

- `shared/data_contract.py`: felles kodegrensesnitt mot eksterne data
- `data-manifest.json`: logiske datasett-ID-er, klassifisering og SHA-256
- `deployment-policy.json`: tillatte artefakter og publiseringsnivå
- `oppgave3/config/task3_rules.json`: versjonerte regler for oppgave 3
- `scripts/validate_data_contract.py`: validerer hele datakontrakten
- `scripts/verify_static_build.py`: stopper utrygge statiske bygg

En mer faglig oversikt finnes i
[`REGNSKAPSOVERSIKT.md`](REGNSKAPSOVERSIKT.md).
Kjente avhengighetsfunn og publiseringskrav er dokumentert i
[`SECURITY.md`](SECURITY.md).
