# Synapse testoppsett for DFØ økonomidata

Dette dokumentet oppsummerer gjeldende Synapse-endringer som ligger bak dataene i denne mappen.

## Workspace

- Synapse workspace: `syn-gnom-prd-noe-1`
- Resource group: `rg-gnom-synapse-prd-noe-1`
- Azure-bruker: `azrom@nkom365.onmicrosoft.com`
- Repo-kobling i Synapse: Azure DevOps `nkom365 / Dataplattform / nkom-dataplatform-synapse-green`, branch `main`

Arbeidet ble gjort i Synapse live-mode, ikke bare i Git-mode. Det var derfor testartefaktene først ble synlige i webvisningen etter at Synapse Studio sto i live-mode.

## Testmappe og notebooks

Det ble opprettet en live Synapse-mappe:

- `dfo_økonomidata_test`

Notebookene ble kopiert fra opprinnelig økonomidata-mappe, med `_test` i navnet fordi Synapse notebook-navn er workspace-unike:

- `dfo_budsjettdata_import_landing_test`
- `dfo_regnskapsdata_import_landing_test`
- `dfo_budsjettdata_to_conformance_delta_test`
- `dfo_regnskapsdata_to_conformance_delta_test`
- `dfo_budsjettdata_to_dataproducts_test`
- `dfo_regnskapsdata_to_dataproducts_test`

## Pipeline for budsjett

Pipeline:

- `dfo_get_budsjettdata_2026b_test_load`

Teststier:

- landing/conformance: `dfo/test/dfo_okonomidata_test/budsjettdata_2026b`
- dataproducts: `dfo_data/test/dfo_okonomidata_test/budsjettdata_2026b`

Viktig notebook-endring:

```python
params = {"period": period} if name in ["apltransactvalue"] else None
```

Dette gjør at:

- `apltransactvalue` hentes periodevis
- `apltransact` hentes bredere, slik at flere headerlinjer kommer med

Konsekvens i lokale data etter siste testuttrekk:

- `aplversion` inneholder `2026B`
- alle `apltransactvalue`-rader matcher nå `apltransact` på `trans_id`
- `2026B` kan brukes til dashboard-budsjettet

## Manuell endring som bør inn i ordinær budsjett-notebook

Dette gjelder notebooken som tilsvarer testnotebooken:

- test: `dfo_budsjettdata_import_landing_test`
- ordinær notebook som bør patches senere: `dfo_budsjettdata_import_landing`

Bakgrunn: Før endringen ble både `apltransact` og `apltransactvalue` hentet med periodeparameter. Det ga for få/feil headerlinjer i `apltransact`, mens `apltransactvalue` hadde verdilinjer som ikke kunne kobles til header på `trans_id`. Etter at `apltransact` ble hentet uten periodeparameter, matcher alle lokale `apltransactvalue`-rader mot `apltransact`.

Endringen er liten, men viktig.

Finn logikken som setter API-parametre omtrent slik:

```python
params = {"period": period} if name in ["apltransact", "apltransactvalue"] else None
```

Endre til:

```python
params = {"period": period} if name in ["apltransactvalue"] else None
```

Begrunnelse:

- `apltransactvalue` er periodisert og skal fortsatt hentes per periode.
- `apltransact` er header-/planlinjer og må hentes bredere for at verdiene i `apltransactvalue` skal få riktig `trans_id`-kobling.
- `aplversion` skal ikke periodefiltreres.

Kontroller etter kjøring:

```sql
WITH h AS (
  SELECT DISTINCT CAST(trans_id AS VARCHAR) AS trans_id
  FROM read_parquet('.../apltransact/*.parquet')
),
v AS (
  SELECT CAST(trans_id AS VARCHAR) AS trans_id
  FROM read_parquet('.../apltransactvalue/*.parquet')
)
SELECT
  count(*) AS value_rows,
  count(*) FILTER (WHERE h.trans_id IS NOT NULL) AS matched_value_rows,
  count(*) FILTER (WHERE h.trans_id IS NULL) AS unmatched_value_rows
FROM v
LEFT JOIN h USING (trans_id);
```

For siste testdata var resultatet:

- `value_rows`: 67 829
- `matched_value_rows`: 67 829
- `unmatched_value_rows`: 0

Kontroller også at `aplversion` inneholder `2026B`, og at `apltransact` har headerlinjer for `2026B`.

Viktig: Ikke kopier teststien `dfo_data/test/dfo_okonomidata_test/budsjettdata_2026b` inn i ordinær notebook. Det er bare testpipeline/testnotebook som skal skrive dit.

## Pipeline for regnskap

Pipeline:

- `dfo_get_regnskapsdata_2026_test_load`

Teststier:

- landing/conformance: `dfo/test/dfo_okonomidata_test/regnskapsdata_2026`
- dataproducts: `dfo_data/test/dfo_okonomidata_test/regnskapsdata_2026`

Notebook-endringer:

```python
mode = "range"
range_from = "202601"
range_to = "202606"
```

I `dfo_regnskapsdata_to_conformance_delta_test` ble CSV-lesingen endret til å liste CSV-filene eksplisitt og lese dem én og én før `unionByName`. Dette ble gjort fordi wildcard-lesingen ikke ga stabil periodedekning i testløpene.

Forventet regnskapsperiodedekning i lokale data:

- `202601`: 18 671 rader
- `202602`: 16 215 rader
- `202603`: 30 458 rader
- `202604`: 22 370 rader
- `202605`: 15 407 rader
- `202606`: 11 569 rader

## Manuelle endringer som bør vurderes i ordinære regnskaps-notebooks

Regnskapstestene hadde to typer endringer:

1. test-/periodeoppsett for å hente 2026-data
2. en faktisk robusthetsforbedring i CSV-lesing fra landing til conformance

Bare robusthetsforbedringen bør normalt flyttes direkte til ordinær notebook. Teststier og fast `202601-202606`-range må tilpasses ordinær produksjonslogikk.

### Import landing

Dette gjelder notebooken som tilsvarer testnotebooken:

- test: `dfo_regnskapsdata_import_landing_test`
- ordinær notebook: `dfo_regnskapsdata_import_landing`

I testen ble notebooken satt opp slik:

```python
mode = "range"
range_from = "202601"
range_to = "202606"
```

Dette ble gjort for å hente hele perioden januar-juni 2026 i én test. Det er ikke nødvendigvis riktig permanent prod-oppsett hvis ordinær pipeline normalt kjører inkrementelt eller får periode fra pipelineparametre.

Hvis prod-notebooken mangler fleksibel range-støtte, bør den få det, men uten å hardkode testperioden. Praktisk mål:

- støtte én periode som før
- støtte range når pipeline sender `range_from` og `range_to`
- skrive til ordinær landingsti, ikke teststi

Pseudomønster:

```python
if mode == "range":
    periods = make_period_range(range_from, range_to)
else:
    periods = [period]

for period in periods:
    params = {"period": period}
    # hent endpoint og skriv CSV for perioden
```

### Conformance delta

Dette gjelder notebooken som tilsvarer testnotebooken:

- test: `dfo_regnskapsdata_to_conformance_delta_test`
- ordinær notebook: `dfo_regnskapsdata_to_conformance_delta`

Dette er den viktigste regnskapsendringen å flytte over.

Problemet: Wildcard-lesing av CSV fra landing var ikke stabil nok i testløpene. Landing hadde CSV-filer for alle perioder, men conformance/dataproduct kunne ende opp med mangelfull periodedekning. Det ble derfor endret til eksplisitt listing av CSV-filer, lesing én og én og deretter `unionByName`.

Tidligere mønster var omtrent:

```python
df = spark.read.option("header", True).csv(f"{base_path}/{folder}/*.csv")
```

Bytt til dette mønsteret:

```python
from notebookutils import mssparkutils

csv_files = sorted([
    f.path
    for f in mssparkutils.fs.ls(f"{base_path}/{folder}")
    if f.path.endswith(".csv")
])

if not csv_files:
    raise ValueError(f"Ingen CSV-filer funnet for {folder} under {base_path}")

print(f"{folder}: Leser {len(csv_files)} CSV-filer")

dfs = [
    spark.read
        .option("header", True)
        .option("escape", "\\")
        .csv(path)
    for path in csv_files
]

df = dfs[0]
for next_df in dfs[1:]:
    df = df.unionByName(next_df, allowMissingColumns=True)
```

Hvis ordinær notebook allerede bruker en annen import for `mssparkutils`, behold eksisterende importstil. Poenget er eksplisitt fil-liste og `unionByName`, ikke akkurat importlinjen.

Kontroller etter kjøring:

```sql
SELECT period, count(*) AS row_count
FROM read_parquet('.../agltransact/*.parquet')
GROUP BY period
ORDER BY period;
```

For siste testdata var forventet periodedekning:

| Periode | Rader |
| --- | ---: |
| `202601` | 18 671 |
| `202602` | 16 215 |
| `202603` | 30 458 |
| `202604` | 22 370 |
| `202605` | 15 407 |
| `202606` | 11 569 |

Kontroller også at dataproduct har samme periodedekning som conformance, ikke bare at landing har alle CSV-filene.

### Dataproducts

Dette gjelder notebookene:

- test: `dfo_regnskapsdata_to_dataproducts_test`
- test: `dfo_budsjettdata_to_dataproducts_test`
- ordinære notebooks: tilsvarende uten `_test`

I testen ble dataproducts-notebookene primært endret for å skrive til teststi:

- regnskap: `dfo_data/test/dfo_okonomidata_test/regnskapsdata_2026`
- budsjett: `dfo_data/test/dfo_okonomidata_test/budsjettdata_2026b`

Dette er ikke en prod-fix i seg selv. Ikke flytt teststiene til ordinær notebook. Det som bør verifiseres i prod-notebookene er at de ikke filtrerer bort perioder eller budsjettversjoner etter at import/conformance er rettet.

Minimumskontroller etter dataproduct:

```sql
-- Regnskap
SELECT period, count(*) AS row_count
FROM read_parquet('.../regnskapsdata/agltransact/*.parquet')
GROUP BY period
ORDER BY period;

-- Budsjettversjoner
SELECT version, description
FROM read_parquet('.../budsjettdata/aplversion/*.parquet')
WHERE version LIKE '2026%' OR version LIKE '%2026%'
ORDER BY version;

-- Budsjettverdi-header join
WITH h AS (
  SELECT DISTINCT CAST(trans_id AS VARCHAR) AS trans_id
  FROM read_parquet('.../budsjettdata/apltransact/*.parquet')
),
v AS (
  SELECT CAST(trans_id AS VARCHAR) AS trans_id
  FROM read_parquet('.../budsjettdata/apltransactvalue/*.parquet')
)
SELECT
  count(*) AS value_rows,
  count(*) FILTER (WHERE h.trans_id IS NOT NULL) AS matched_value_rows,
  count(*) FILTER (WHERE h.trans_id IS NULL) AS unmatched_value_rows
FROM v
LEFT JOIN h USING (trans_id);
```

## Hva som var testtilpasning og ikke prod-fix

Følgende ble gjort for å isolere testen og skal ikke blindt inn i ordinære notebooks:

- mapper/stier med `dfo/test/dfo_okonomidata_test/...`
- mapper/stier med `dfo_data/test/dfo_okonomidata_test/...`
- notebook-navn med `_test`
- pipeline-navn med `_test`
- hardkodet `range_from = "202601"` og `range_to = "202606"` hvis prod skal styres av parametre
- fast `budsjettdata_2026b`-sti hvis prod skal være generell

Følgende er reelle kandidater for ordinær retting:

- ikke periodefiltrer `apltransact`; periodefiltrer bare `apltransactvalue`
- eksplisitt CSV-listing og `unionByName` i regnskap conformance
- eventuelt generell range-støtte i regnskap import, styrt av pipelineparametre

## Lokale refresh-stier

Denne mappen bruker testdataproducts, ikke ordinære prod-prefixer:

- `dfo_data/test/dfo_okonomidata_test/regnskapsdata_2026/agltransact`
- `dfo_data/test/dfo_okonomidata_test/regnskapsdata_2026/agldimvalue`
- `dfo_data/test/dfo_okonomidata_test/budsjettdata_2026b/apltransact`
- `dfo_data/test/dfo_okonomidata_test/budsjettdata_2026b/apltransactvalue`
- `dfo_data/test/dfo_okonomidata_test/budsjettdata_2026b/aplversion`

Synapse-uttrekk skal nå registreres som et nytt eksternt snapshot etter
prosedyren i rotens `DATA.md`. Det finnes ikke lenger et skript som skriver
rådata direkte inn i repositoryet.

## Kjente faglige funn

- Dashboardet bruker tall i tusen.
- Budsjettversjon er `2026B`.
- Hovedbok bruker `agltransact.dim_4` som finansiering.
- Budsjett har ikke `dim_4`; dashboard-finansiering må utledes fra `apltransact.dim_1`.
- Budsjettmapping for dashboard:
  - `154345` = `dim_1 = '212'`
  - `154322+045101` = `dim_1 = '761'`
  - `154301` = `2026B` ekskludert `dim_1 IN ('212', '761')`
- Prosjekt `7114` har hovedbok, men budsjett er 0 i dashboardgrunnlaget.
- Lønnsandel for `154322+045101` i Excel er reproduserbar som `lønn / andre driftskostnader`. Hvis teksten mener totale driftskostnader, bør formelen endres til `lønn / totale driftskostnader`.
