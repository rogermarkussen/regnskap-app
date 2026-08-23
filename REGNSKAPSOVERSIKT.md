# Regnskapsløsningen

Løsningen består av tre statiske apper som bygges fra eksterne, versjonerte
datasnapshots. Repositoryet inneholder ikke operative data. Oppgave 2 og 3
bruker Vite/Svelte uten Evidence. Oppgave 1 bruker fortsatt Evidence.

| Oppgave | Formål | Resultat |
| --- | --- | --- |
| 1 | KPI-er for utvalgte finansieringer | Regnskap mot budsjett i NOK 1 000 |
| 2 | Kontogruppering | Hovedbok, budsjett, kontant og avvik per gruppe |
| 3 | Fakturaworkflow og månedsavslutning | Status, kontroller og Excel-leveranse |

## Dataflyt og ansvar

```text
Eksternt, uforanderlig datasnapshot
  -> manifest, klassifisering og SHA-256
  -> appspesifikk dataadapter
  -> beregninger fra operative kilder
  -> avledede Parquet-tabeller utenfor repoet
  -> appspesifikk statisk bygging
  -> publiseringskontroll

Ekstern fasit
  -> test-only adapter
  -> avviksrapport
  -> aldri produksjonsberegning
```

Operative data produserer tallene. Fasit er et uavhengig testorakel. Manglende
samsvar skal vises og forklares, ikke løses ved å kopiere fasitverdien.

## Oppgave 1

Oppgave 1 beregner KPI-er for `154301`, `154345` og `154322 + 045101` fra
hovedbok og budsjett. Forretningsreglene ligger i
`oppgave1/kode/scripts/dashboard_kpi_data.py`. Tester dekker perioder,
datagrunnlag, Excel-fasit, komponenter og nettleserflyt.

## Oppgave 2

Oppgave 2 grupperer kontoer og viser hovedbok, budsjett, kontant og avvik. Den
statiske appen kan filtrere på finansiering, periode og seksjon/kostnadssted.
Den leser én ZSTD-komprimert, avledet Parquet-fil i nettleseren. Excel-fasit er
skilt ut i `oppgave2/kode/tests/fasit_support.py`. Tre operative Excel-kilder er
fortsatt midlertidige og må erstattes av Parquet når økonomisystemet tilbyr dem.

## Oppgave 3

Oppgave 3 kobler workflowhendelser til hovedbok og lager månedsavslutning.
Forretningsregler som rapportår, budsjettversjon, kontointervaller,
finansieringsmapping og workflowhandlinger ligger samlet i
`oppgave3/config/task3_rules.json`. Konfigurasjonen er foreløpig ikke faglig
godkjent og må behandles som en eksplisitt beslutningsliste, ikke skjult kode.

## Publisering

Dagens data er klassifisert for intern bruk. Oppgave 3 krever autentisert
hosting. `scripts/verify_static_build.py` blokkerer rådata og uventede
filformater, mens `deployment-policy.json` blokkerer offentlig profil.

Se [`DATA.md`](DATA.md) for datarot, manifest, snapshotoppdatering og sikker
publisering.

## Kommandoer

```bash
npm run check:data
npm test
npm run build:internal

npm run dev:task1
npm run dev:task2
npm run dev:task3
```
