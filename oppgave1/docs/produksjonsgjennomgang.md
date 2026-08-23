# Produksjonsgjennomgang for oppgave 1

Status per 7. august 2026: Funksjonelt verifisert. Avhengighetsrisikoen under
«Utestående produksjonskrav» må behandles før produksjonsgodkjenning.

## Datagrense og tilgang

Oppgave 1 bygges som en statisk nettside. De beregnede standard-KPI-ene og
kildemetadata ligger derfor i den publiserte pakken og kan leses av alle som
har tilgang til adressen. De to genererte KPI-tabellene publiseres av Evidence,
men operative Parquet-filer, Excel-fasit, testdata og DuckDB-databasen skal ikke
publiseres. `npm run build` kjører automatisk
`kode/scripts/verify_production_build.py` og avviser bygget dersom slike filer eller
kildekart finnes i `build/`.

Applikasjonen har ingen innebygd innlogging, og prosjektets vedtatte modell
krever ikke innlogging. Alle med lenken kan se standard-KPI-ene som følger med
det statiske bygget. Sluttbrukeren kan ikke laste opp eller laste ned Excel- og
Parquet-filer fra dashboardet.

## Feilhåndtering

- Produksjonsdriften bør registrere HTTP-feil, utilgjengelig side og mislykket
  utrulling.
- Feil i kilder eller KPI-beregning skal stanse kontrollert refresh og bygging.

## Utrulling

Krav til byggemaskinen er Node 22 og `uv`. Lag en ren, uforanderlig pakke:

```bash
cd oppgave1/kode
npm ci
uv sync --frozen
npm test
```

Publiser bare innholdet i `oppgave1/kode/build/`, aldri hele repositoryet. Serveren
skal bruke HTTPS. HTML og `/api/prerendered_queries/` bør få
kort eller ingen mellomlagring, mens innholdshash-baserte JS- og CSS-filer kan
langtidslagres. Sett vanlige sikkerhetshoder i publiseringslaget og test dem mot
Evidence-bygget før aktivering.

Etter publisering kjøres nettlesertestene mot den faktiske adressen:

```bash
PLAYWRIGHT_BASE_URL=https://eksempel.intern npm run test:e2e
```

Tilbakerulling gjøres ved å beholde forrige godkjente `build/`-artefakt og bytte
tilbake til den som én enhet.

## Utestående produksjonskrav

1. Kjør og behandle `npm run audit:production`. Funn i Evidence-avhengighetene
   må risikovurderes og følges opp når Evidence publiserer nye versjoner.
2. Bestem eier av driftsvarsling og periodisk avhengighetsrevisjon.
3. Dokumenter mål-URL, utrullingskommando, rollback og godkjent bygg-ID i
   virksomhetens driftsmiljø.

## Godkjenningskriterium

Produksjonsgodkjenning kan gis når full testpakke er grønn, byggkontrollen
består og avhengighetsrisikoen er behandlet.
