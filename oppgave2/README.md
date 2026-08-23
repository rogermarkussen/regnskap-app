# Oppgave 2: kontogruppering

Evidence-app for kontogrupperte hovedbok-, budsjett- og kontanttall med fire
finansieringsvalg og flere rapportperioder.

Koden ligger i `oppgave2/kode`. Felles Parquet-kilder og tre midlertidige
operative Excel-kilder hentes gjennom rotens datamanifest. De operative
Excel-filene skal fases ut når tilsvarende autoritative Parquet-kilder finnes.
Fasit brukes bare i tester og inngår ikke i produksjonstabellene.

Viktige filer:

- `kode/scripts/prepare_data.py`: kildebehandling og gruppering
- `kode/scripts/project_data.py`: appens adapter mot datakontrakten
- `kode/scripts/validate_task2.py`: tekniske produksjonskontroller
- `kode/tests/fasit_support.py`: test-only lesing av Excel-fasit
- `kode/components/KontogrupperingReport.svelte`: rapportvisning

Kjør fra repositoryroten:

```bash
npm run dev:task2
npm run refresh:task2
npm run build:task2
```

Data skal ikke kopieres inn i denne mappen. Se [`../DATA.md`](../DATA.md).
