# Nedlastings-oppskrift

Denne oppskriften beskriver flyten som virket for å hente oppdaterte regnskapsdata fra Azure Storage til dette prosjektet.

## 1. PIM inn riktig Azure-bruker

Før nedlasting må jeg huske å PIM-e inn med Azure-brukeren min:

- `azrom@nkom365.onmicrosoft.com`

Dette må gjøres på Windows-siden før vi prøver å hente data fra WSL.

## 2. Logg inn med Azure CLI i Windows PowerShell

Ikke bruk Linux/WSL-`az login` for denne jobben. Den kan feile på Conditional Access fordi innloggingen ikke får med seg Windows-enhetskonteksten.

Åpne Windows PowerShell og kjør:

```powershell
az login --tenant ad83e65c-03f6-4cfd-b799-47a2fafd7bce --username azrom@nkom365.onmicrosoft.com --allow-no-subscriptions
```

Fullfør innloggingen i Windows-nettleseren og kontroller at aktiv konto er `azrom@nkom365.onmicrosoft.com`.

```powershell
az account show
```

## 3. Bruk Windows-az fra WSL

Når Windows PowerShell-innloggingen er fullført, kan Codex/WSL bruke samme Windows Azure CLI-installasjon direkte:

```bash
'/mnt/c/Program Files/Microsoft SDKs/Azure/CLI2/python.exe' -IBm azure.cli account show --output json
```

Den skal vise:

- `user.name`: `azrom@nkom365.onmicrosoft.com`
- `tenantId`: `ad83e65c-03f6-4cfd-b799-47a2fafd7bce`
- `name`: `sub-nkom-lz-prd-gnom`

Dette var den fungerende løsningen. Ikke start med vanlig WSL-`az login` eller device-code-flyt med mindre Windows-CLI-flyten slutter å virke.

## 4. Finn og hent data fra Azure Storage

Dataene ligger i Azure Storage:

- storage account: `stgnomdprprdnoe1`
- container: `dataproducts`
- regnskapsdata: `dfo_data/regnskapsdata/`
- budsjettdata: `dfo_data/budsjettdata/`

Fra WSL, bruk Windows-`az` slik:

```bash
'/mnt/c/Program Files/Microsoft SDKs/Azure/CLI2/python.exe' -IBm azure.cli storage blob list \
  --account-name stgnomdprprdnoe1 \
  --container-name dataproducts \
  --auth-mode login \
  --prefix dfo_data \
  --num-results 50 \
  --output table
```

Last ned til en ekte Windows-mappe, ikke en WSL-relativ mappe. `download-batch` kan ellers feile med backslash-stier.

```bash
/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe -NoProfile -Command \
  "Remove-Item -Recurse -Force 'C:\Users\rom\AppData\Local\Temp\regnskap_azure_YYYYMMDD' -ErrorAction SilentlyContinue; New-Item -ItemType Directory -Force 'C:\Users\rom\AppData\Local\Temp\regnskap_azure_YYYYMMDD' | Out-Null"

'/mnt/c/Program Files/Microsoft SDKs/Azure/CLI2/python.exe' -IBm azure.cli storage blob download-batch \
  --account-name stgnomdprprdnoe1 \
  --source dataproducts \
  --destination 'C:\Users\rom\AppData\Local\Temp\regnskap_azure_YYYYMMDD' \
  --auth-mode login \
  --pattern 'dfo_data/regnskapsdata/**/*.parquet' \
  --output json

'/mnt/c/Program Files/Microsoft SDKs/Azure/CLI2/python.exe' -IBm azure.cli storage blob download-batch \
  --account-name stgnomdprprdnoe1 \
  --source dataproducts \
  --destination 'C:\Users\rom\AppData\Local\Temp\regnskap_azure_YYYYMMDD' \
  --auth-mode login \
  --pattern 'dfo_data/budsjettdata/**/*.parquet' \
  --output json
```

## 5. Skriv repoets Parquet-filer med DuckDB

Bruk DuckDB fra WSL mot Windows-stagingstien under `/mnt/c/...`, og skriv repoets Parquet-filer med `COMPRESSION ZSTD`.

Ta alltid backup av eksisterende data først:

```bash
mkdir -p data/backup_YYYYMMDD_azure_refresh
cp data/*.parquet data/backup_YYYYMMDD_azure_refresh/
```

Deretter skriv nye enkeltfiler fra Azure-partisjonene:

```sql
COPY (
  SELECT * FROM read_parquet('/mnt/c/Users/rom/AppData/Local/Temp/regnskap_azure_YYYYMMDD/dfo_data/regnskapsdata/agltransact/*.parquet')
) TO 'data/agltransact.parquet' (FORMAT PARQUET, COMPRESSION ZSTD);
```

Gjør tilsvarende for:

- `data/agldimvalue.parquet`
- `data/apltransact.parquet`
- `data/apltransactvalue.parquet`
- `data/aplversion.parquet`

Bygg også `data/agltransact_beriket.parquet` på nytt etterpå, basert på ny `agltransact`, ny `agldimvalue` og lokal `kontoplan.csv`.

## 6. Valider etterpå

Minimumsvalidering:

```bash
duckdb -c "
SELECT 'agltransact' AS table_name, count(*) AS row_count, min(period) AS min_period, max(period) AS max_period FROM read_parquet('data/agltransact.parquet')
UNION ALL SELECT 'agltransact_beriket', count(*), min(period), max(period) FROM read_parquet('data/agltransact_beriket.parquet')
UNION ALL SELECT 'agldimvalue', count(*), NULL, NULL FROM read_parquet('data/agldimvalue.parquet')
UNION ALL SELECT 'apltransact', count(*), NULL, NULL FROM read_parquet('data/apltransact.parquet')
UNION ALL SELECT 'apltransactvalue', count(*), min(period), max(period) FROM read_parquet('data/apltransactvalue.parquet')
UNION ALL SELECT 'aplversion', count(*), NULL, NULL FROM read_parquet('data/aplversion.parquet');
"
```

Sjekk spesielt at:

- `agltransact` og `agltransact_beriket` har samme radtall.
- `agltransact.max_period` har økt hvis det er kommet ny regnskapsperiode.
- `agldimvalue` har forventet radtall.
- gamle filer ligger i backup-mappen.

## Viktig erfaring fra sist

Det som virket var:

1. PIM inn `azrom` på Windows-siden.
2. Kjør `az login` i Windows PowerShell, ikke i WSL.
3. Fra WSL: bruk Windows Azure CLI via `'/mnt/c/Program Files/Microsoft SDKs/Azure/CLI2/python.exe' -IBm azure.cli ...`.
4. Last ned blobs til en Windows-tempmappe.
5. Bruk DuckDB fra WSL til å samle og skrive ZSTD-komprimerte Parquet-filer i `data/`.

Det som ikke virket godt:

- WSL-`az login --use-device-code`: ble stoppet av Conditional Access.
- WSLg/browser-callback fra vanlig WSL-`az login`: kunne henge.
- `download-batch` direkte til WSL-relativ mappe: feilet på Windows-backslash-stier.
