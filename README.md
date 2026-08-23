# Regnskapsappene

Dette er et kode-only repository for tre selvstendige Evidence-applikasjoner:

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
de eksplisitt tillatte resultatfilene. Dagens datasett er ikke godkjent for
offentlig hosting. Se [`deployment-policy.json`](deployment-policy.json).

## Viktige grensesnitt

- `shared/data_contract.py`: felles kodegrensesnitt mot eksterne data
- `data-manifest.json`: logiske datasett-ID-er, klassifisering og SHA-256
- `deployment-policy.json`: tillatte artefakter og publiseringsnivå
- `oppgave3/config/task3_rules.json`: versjonerte regler for oppgave 3
- `scripts/validate_data_contract.py`: validerer hele datakontrakten
- `scripts/verify_static_build.py`: stopper utrygge statiske bygg

En mer faglig oversikt finnes i
[`REGNSKAPSOVERSIKT.md`](REGNSKAPSOVERSIKT.md).
