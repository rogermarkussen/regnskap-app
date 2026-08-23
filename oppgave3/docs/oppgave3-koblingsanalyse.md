# Oppgave 3 – analyse av koblingsavvik

**Analysert:** 29. juli 2026  
**Datagrunnlag:** Lokale snapshots av `awftaskfin.parquet` og
`agltransact.parquet`

## Resultat

Rapporten har 2 580 unike workflowfakturaer:

| Koblingskvalitet | Antall | Vurdering |
| --- | ---: | --- |
| Sikker | 1 940 | Ett workflowobjekt og samsvarende leverandør-id |
| Mulig | 3 | Entydig fakturanummer, men utilstrekkelig leverandørinformasjon |
| Tvetydig | 433 | Skal ikke brukes til automatiske beslutninger |
| Ikke matchet | 204 | Fakturanummeret finnes ikke i mottatt hovedbokssnapshot |

## Tvetydige koblinger

Alle de 433 tvetydige koblingene skyldes flere workflowflyter for samme
fakturanummer:

- 406 har flere workflowflyter, men bare én workflowleverandør;
- 27 har både flere workflowflyter og flere workflowleverandører.

Det finnes derfor ikke grunnlag for å slå sammen disse automatisk på
fakturanummer alene. Workflow-`oid` og leverandør-id må beholdes, og
workfloweier må avgjøre om flytene er parallelle oppgaver, historiske
duplikater eller reelt forskjellige fakturaobjekter.

## Ikke matchede koblinger

De 204 umatchede fakturaene:

- har alle minst én rad med status `ACT`;
- har siste registrerte workflowhendelse fra 25. september 2025 til
  8. januar 2026;
- får ingen treff selv når skilletegn og bokstavstørrelse normaliseres i
  fakturanummeret.

Dette peker mot at radene enten er eldre åpne workflowoppgaver, mangler i det
mottatte hovedboksuttrekket eller bruker en annen regnskapsreferanse. Det er
ikke dokumentert at `ACT`-rader ryddes bort når en senere prosess er fullført.
Radene må derfor kontrolleres mot DFØ før de behandles som reelt åpne
fakturaer.

## Kontrollfil

`outputs/oppgave3-koblingsavvik.csv` inneholder de 637 tvetydige og umatchede
fakturaene med koblingsårsak, antall flyter, leverandørinformasjon og siste
hendelse. Filen er et kontrollgrunnlag og skal ikke brukes til automatisk
bokføring.

## Anbefalt behandling

1. Kontroller et representativt utvalg mot DFØ.
2. Få workfloweier til å definere forholdet mellom fakturanummer og `oid`.
3. Avklar om historiske `ACT`-rader kan bli stående etter fullføring.
4. Skaff et hovedboksuttrekk med dokumentert uttrekkstidspunkt og komplett
   referansehistorikk.
5. Endre koblingsregelen først etter at resultatet er manuelt godkjent.
