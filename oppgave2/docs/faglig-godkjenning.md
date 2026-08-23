# Faglig godkjenning før videre utvikling

Dette dokumentet brukes i et kort avklaringsmøte mellom økonomi og den som
forvalter rapporten. Målet er å beslutte hva KPI-ene og kontogrupperingen skal
bety før dataløpet ferdigstilles.

## Beslutninger som må tas

| Tema | Dagens løsning | Spørsmål til økonomi | Beslutning |
| --- | --- | --- | --- |
| Periode for `154345` | Følger valgt rapportperiode på samme måte som de andre kortene | Skal kortet fortsatt bruke januar–april, eller skal alle kort bruke samme periode? | **Godkjent 06.08.2026:** følger valgt rapportperiode |
| Lønnsandel for `154322+045101` | Lønn `5000–5999` delt på totale kostnader `5000–7834` | Er dette riktig nevner, eller skal lønn deles på totale kostnader? Hva skal KPI-en hete? | **Godkjent 06.08.2026:** totale kostnader som nevner |
| Budsjettmapping | `dim_1=212` går til `154345`, `dim_1=761` går til `154322+045101`, og resterende går til `154301` | Er denne fordelingen en godkjent og varig forretningsregel? | **Godkjent 06.08.2026:** dagens mapping beholdes |

## Kontogruppering som må kontrolleres

- Bekreft at kontoene ligger i riktig kontogruppe.
- Avklar duplisert konto `5405` og mulig forveksling mellom `5404` og `5405`.
- Bekreft at kontoer som mangler i tallrapporten faktisk kan behandles som
  nullkontoer.
- Godkjenn totalsummene for `154301` og alle finansieringer.
- Bekreft hvordan positive og negative avvik skal tolkes og presenteres.

## Forslag til møte på 30 minutter

1. Godkjenn periode og innhold for `154345` – 10 minutter.
2. Godkjenn lønnsandel og budsjettmapping – 10 minutter.
3. Kontroller `5404/5405` og manglende kontoer – 10 minutter.

## Ferdig når

- alle tre KPI-beslutninger er skrevet inn i tabellen;
- kontogrupperingen er godkjent eller konkrete rettinger er listet;
- økonomi har oppgitt navn og dato for godkjenningen.

**Godkjent av:** Prosjekteier, bekreftet i prosjektarbeidsøkten (navn må registreres for revisjonssporet)

**Dato:** 06.08.2026
