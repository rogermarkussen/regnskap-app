# Oppgave 1: KPI-dashboard

Evidence-app for KPI-er på finansieringene `154301`, `154345` og
`154322 + 045101`. Beløp vises i NOK 1 000 for januar–mars,
januar–april eller januar–juni. Dashboardet kan filtreres på organisatorisk
seksjon (`dim_1` i hovedbok og budsjett), med namn frå dimensjon `C1`.

Koden ligger i `oppgave1/kode`. Operativ hovedbok og budsjett hentes som
`common.ledger`, `common.budget_header`, `common.budget_values` og
`task1.dimension_values` frå rotens datamanifest. Avleidde tabellar blir skrivne
til den eksterne datarota. Excel-fasit blir berre lesen av testar.

Viktige filer:

- `kode/scripts/dashboard_kpi_data.py`: KPI-regler og beregninger
- `kode/scripts/project_data.py`: appens adapter mot datakontrakten
- `kode/scripts/prepare_data.py`: bygger publiserte tabeller
- `kode/components/ExecutiveDashboard.svelte`: hovedvisning
- `kode/tests/`: beregnings-, fasit-, komponent- og nettlesertester

Kjør fra repositoryroten:

```bash
npm run dev:task1
npm run refresh:task1
npm run build:task1
```

Data skal ikke kopieres inn i denne mappen. Se [`../DATA.md`](../DATA.md).
