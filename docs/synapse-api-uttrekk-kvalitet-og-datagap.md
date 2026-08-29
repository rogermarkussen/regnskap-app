# Oppdrag: sikre komplette API-uttrekk i Synapse

## Formål

Dette dokumentet er arbeidsgrunnlaget for agenten som skal undersøke og rette
Synapse-koden som henter økonomidata fra DFØ-API-et. Målet er at et uttrekk aldri
skal bli publisert som komplett når API-et, landingsteget, conformance-steget
eller dataproduct-steget bare har tatt med deler av datagrunnlaget.

Arbeidet har to hovedmål:

1. Hovedbokuttrekk må hente alle sider og alle rader for hver periode.
2. Kontantbudsjett må få en dokumentert operativ kilde og følge hele dataflyten.

En tredje, beslektet kontroll gjelder koblingen mellom budsjettverdier og
budsjett-headere. Den har tidligere feilet når begge tabellene ble
periodefiltrert på samme måte.

Fasitfiler kan brukes til uavhengig kontroll, men aldri som datakilde,
reserveverdi eller grunnlag for hardkodede produksjonstall. Les også
[`DATA.md`](../DATA.md) og
[`oppgave2/docs/synapse-testoppsett.md`](../oppgave2/docs/synapse-testoppsett.md)
før du endrer dataflyten.

## Dokumenterte funn

### Februar 2026 ble avkortet til 9 000 rader

Den nye lokale leveransen av `agltransact` har bare 9 000 rader for periode
`202602`. Et eldre, avstemt snapshot har 16 215 rader for samme periode. Det
mangler dermed 7 215 rader i den nye leveransen.

| Datasett | Periode | Rader | Sum `amount` |
| --- | --- | ---: | ---: |
| Nytt uttrekk, `data/agltransact.parquet` | `202602` | 9 000 | 949 329,19 |
| Eldre avstemt snapshot | `202602` | 16 215 | 0,00 |
| Reparert testsnapshot | `202602` | 16 215 | 0,00 |

Beløpssummene er beregnet etter konvertering av tekstfeltet `amount` til tall.
At det mangelfulle uttrekket har nøyaktig 9 000 rader, tyder på en grense i
API-et, klientkoden eller et mellomliggende steg. Dette er en hypotese som må
bekreftes i Synapse-koden og kjøreloggene. Tallet alene beviser ikke hvor
avkortingen skjer.

Sammenligningen viser også noe viktig. Periodene januar og mars til juni 2026
har samme radtall i det nye og det eldre snapshotet. Februar er det tydelige
avviket:

| Periode | Nytt uttrekk | Eldre snapshot | Differanse |
| --- | ---: | ---: | ---: |
| `202601` | 18 694 | 18 694 | 0 |
| `202602` | 9 000 | 16 215 | -7 215 |
| `202603` | 30 458 | 30 458 | 0 |
| `202604` | 22 372 | 22 372 | 0 |
| `202605` | 15 549 | 15 549 | 0 |
| `202606` | 12 986 | 12 986 | 0 |

Alle disse periodene balanserer til 0,00 i det nye uttrekket bortsett fra
februar. Februar summerer til 949 329,19. En kontroll som bare spør om perioden
finnes, ville derfor ha godkjent en klart ufullstendig periode.

### Kontantbudsjett mangler som operativ dataserie

De lokale Parquet-filene inneholder kontanttransaksjoner, men ingen identifisert
periodisert kontantbudsjettserie:

- `acatrans.parquet` har 332 194 rader fra `202401` til `202608` målt med
  `pay_period`.
- Alle radene har `cash_amount`. Dette er faktiske kontantbevegelser, ikke et
  kontantbudsjett.
- `apltransactvalue.parquet` har ordinære budsjettbeløp, men ingen felt som er
  identifisert som kontantbudsjett.
- `aplversion.parquet` har 21 budsjettversjoner. Ingen av navnene eller
  beskrivelsene angir kontantbudsjett.
- Ingen av de undersøkte Parquet-skjemaene har felt som heter
  `cash_budget`, `kontantbudsjett` eller tilsvarende.

Excel-fasiten har en kolonne for kontantbudsjett. På kontonivå er de 172
undersøkte cellene lagret som bokstavelige nullverdier. De er ikke formler eller
lenker til et uttrekk. Sumcellene summerer disse nullverdiene. Excel-filen viser
derfor hvordan rapporten presenterer kontantbudsjett lik null, men dokumenterer
ikke at API-et leverer en slik serie.

Det er to åpne muligheter:

1. Kontantbudsjettet finnes i et annet API-endepunkt eller dataproduct som
   dagens Synapse-kode ikke henter.
2. Kontantbudsjett lik null er en manuell forretningsregel i Excel.

Synapse-arbeidet skal først lete etter en operativ kilde. Hvis API-et ikke har
en slik kilde, skal resultatet dokumenteres som et datagap. Produksjonskoden
skal ikke bruke fasiten som kilde og skal ikke innføre nullbudsjett uten en
uttrykkelig godkjent forretningsregel.

### Budsjett-headere har tidligere blitt hentet for smalt

Et tidligere testløp sendte periodeparameter til både `apltransact` og
`apltransactvalue`. Det ga budsjettverdier uten matchende header på `trans_id`.
Testoppsettet ble rettet slik:

```python
params = {"period": period} if name in ["apltransactvalue"] else None
```

Det betyr at `apltransactvalue` hentes periodevis, mens `apltransact` hentes
bredt nok til å inneholde alle nødvendige headere. I de nåværende lokale
testdataene matcher alle 169 570 verdilinjer en header. Denne kontrollen må bli
stående etter andre endringer i API-klienten.

## Oppdrag til Synapse-agenten

Start undersøkelsen i disse ordinære notebookene og sammenlign med
testvariantene som har `_test` i navnet:

- `dfo_regnskapsdata_import_landing`;
- `dfo_regnskapsdata_to_conformance_delta`;
- `dfo_regnskapsdata_to_dataproducts`;
- `dfo_budsjettdata_import_landing`;
- `dfo_budsjettdata_to_conformance_delta`;
- `dfo_budsjettdata_to_dataproducts`.

Pipeline- og lagringsstier er dokumentert i
[`oppgave2/docs/synapse-testoppsett.md`](../oppgave2/docs/synapse-testoppsett.md).
Teststier og hardkodede testperioder skal ikke flyttes inn i ordinær kode.

### 1. Finn nøyaktig hvor februar ble avkortet

Følg `agltransact` for `202602` gjennom hvert ledd:

1. API-responsene i importnotebooken.
2. Filer skrevet til landing.
3. DataFrame eller Delta-tabell i conformance.
4. Parquet- eller Delta-utdata i dataproducts.
5. Eventuell nedlastings- eller sammenslåingskode etter dataproducts.

Registrer radtall for hvert ledd. Ikke konkluder med API-feil før du har funnet
det første leddet som går fra komplett til ufullstendig.

Undersøk spesielt:

- parametre som `limit`, `offset`, `page`, `page_size`, `top` og `skip`;
- continuation token, cursor, `next`, `nextLink` eller tilsvarende metadata;
- standardgrense i API-et når klienten ikke sender sidestørrelse;
- løkker som stopper etter første respons;
- stoppvilkår basert på at en side har færre rader enn ønsket sidestørrelse;
- maksimalt antall sider eller rader i hjelpefunksjoner;
- rate limiting, tidsavbrudd og delvise svar;
- retry-kode som overskriver tidligere sider;
- filnavn som gjør at flere sider eller perioder overskriver hverandre;
- wildcard-lesing som ikke tar med alle landingfiler;
- filtre, joins eller deduplisering i conformance og dataproducts;
- kode som publiserer selv om én forespørsel eller én fil feilet.

Steget er ferdig når kjøreloggen viser radtall per API-side og per dataledd, og
når det første tapsstedet er identifisert med en konkret kodegren eller
plattformbegrensning.

### 2. Gjør pagineringen eksplisitt og etterprøvbar

Bruk API-ets dokumenterte pagineringsmekanisme. Følg continuation token eller
`next`-lenke når API-et tilbyr det. Bruk `offset` og `limit` bare når endepunktet
dokumenterer denne modellen og en stabil sortering kan garanteres.

Klienten må minst registrere dette for hver kombinasjon av endepunkt og
periode:

- kjøre-ID;
- forespørselsparametre uten hemmeligheter;
- sidenummer eller continuation token i maskert form;
- HTTP-status;
- antall rader på siden;
- akkumulert antall rader;
- totalantall oppgitt av API-et, hvis det finnes;
- om API-et oppga en neste side;
- antall forsøk og eventuelle feil.

Et generelt mønster kan se slik ut. Tilpass det til den faktiske API-kontrakten:

```python
rows = []
next_request = first_request(endpoint, period)
page_number = 0

while next_request is not None:
    response = get_with_retry(next_request)
    response.raise_for_status()

    page_rows = parse_rows(response)
    page_number += 1
    rows.extend(page_rows)

    log_page(
        endpoint=endpoint,
        period=period,
        page_number=page_number,
        page_rows=len(page_rows),
        accumulated_rows=len(rows),
    )

    next_request = documented_next_request(response)

validate_api_total(response, len(rows))
```

Hvis API-et oppgir et totalantall, skal mottatt radtall være likt totalantallet.
Avvik skal stoppe kjøringen. Hvis API-et ikke oppgir totalantall, må agenten
dokumentere hvilke garantier pagineringsmekanismen gir og hvilke andre
kontrollsummer som kan hentes fra kilden.

Et svar med nøyaktig maksimal sidestørrelse er et faresignal. Klienten skal
fortsette når responsen eller API-kontrakten sier at flere sider finnes. Den
skal heller ikke anta at en kort side alltid er siste side hvis API-et bruker
continuation token.

### 3. Gjør kjøringen robust mot feil og gjentakelser

Håndter `429` og midlertidige `5xx`-feil med avgrenset retry og ventetid fra
`Retry-After` når den finnes. En side som fortsatt feiler etter siste forsøk,
skal gjøre hele perioden mislykket.

Skriv hver kjøring til en ny stagingsti med kjøre-ID. Publiser perioden først
når alle sider og kontroller har bestått. En mislykket kjøring skal beholde
forrige godkjente dataproduct uendret.

Sørg for at en omkjøring gir samme resultat uten duplikater. Definer en stabil
radnøkkel dersom kilden har en. Hvis ingen enkeltkolonne er unik, dokumenter den
minste sammensatte nøkkelen som identifiserer en hovedboksrad. Logg antall
duplikater før og etter eventuell deduplisering. Deduplisering skal ikke skjule
at samme API-side ble hentet flere ganger.

Steget er ferdig når en avbrutt side ikke kan gi et publisert delresultat, og
når omkjøring av samme periode gir samme radtall, nøkler og kontrollsummer.

### 4. Legg inn harde kontroller mellom alle dataledd

Opprett en kontrolltabell eller et kontrollartefakt per kjøring. Den bør minst
ha disse verdiene per endepunkt, periode og eventuelt klient:

| Kontroll | API | Landing | Conformance | Dataproduct |
| --- | ---: | ---: | ---: | ---: |
| Radtall | ja | ja | ja | ja |
| Distinkte radnøkler | ja | ja | ja | ja |
| Duplikater | ja | ja | ja | ja |
| Sum `amount` | når mulig | ja | ja | ja |
| Minste og største dato | når mulig | ja | ja | ja |
| Antall filer eller partisjoner | ikke relevant | ja | ja | ja |

Landing, conformance og dataproduct skal ha like radtall og kontrollsummer når
steget ikke har en dokumentert transformasjon som endrer kornet. Hvis et steg
skal aggregere, filtrere eller deduplisere, må kontrollen vise forventet
endring og årsaken til den.

For `agltransact` skal kontrollen i tillegg beregne sum `amount` per periode.
Historiske, avstemte perioder i dette datagrunnlaget balanserer til 0,00.
Ubalanse skal stoppe publisering eller kreve en eksplisitt, dokumentert
godkjenning. Februarfeilen ville blitt fanget fordi 9 000-radersuttrekket
summerer til 949 329,19.

Radtall mot forrige kjøring er en nyttig varselkontroll, men ikke et bevis på
kompletthet. Nye transaksjoner kan endre radtallet. Bruk derfor historisk avvik
som tillegg til API-total, paginering, balansekontroll og leddvis avstemming.

Kontrollen må stoppe ved disse forholdene:

- API-et oppgir flere rader enn klienten mottok;
- API-et oppgir neste side, men klienten avslutter;
- en side feiler etter siste retry;
- landing mangler en forventet side- eller periodefil;
- radtall eller kontrollsummer endres uventet mellom dataledd;
- perioden er ubalansert uten dokumentert unntak;
- en full kjøring produserer uventede duplikater;
- budsjettverdier mangler matchende budsjett-header.

### 5. Behold eksplisitt fillesing i conformance

Testnotebooken for regnskap ble tidligere endret fra wildcard-lesing til å
liste CSV-filer eksplisitt, lese hver fil og slå dem sammen med
`unionByName`. Kontroller om ordinær notebook har fått samme
robusthetsforbedring.

Loggen skal vise hvilke filer som ble lest. Sammenlign filsettet med filene
landingsteget faktisk skrev. Et radtall alene er ikke nok, fordi en hel side
eller periodefil kan mangle uten at Spark melder feil.

Steget er ferdig når ordinær conformance-kode kan bevise at den leste alle
forventede landingfiler for kjøringen.

### 6. Finn operativ kilde for kontantbudsjett

Undersøk API-dokumentasjon, metadata, endepunktsliste og eksisterende notebooks
for en egen tabell eller visning for kontantbudsjett. Søk etter faglige navn
som faktisk brukes av DFØ-systemet. Ikke begrens søket til engelske feltnavn.

Avklar følgende før et nytt datasett bygges inn:

- endepunkt eller tabellnavn;
- faglig definisjon av beløpet;
- periodiseringsfelt;
- budsjettversjon eller scenario;
- fortegn;
- valuta og skala;
- korn, for eksempel konto, periode, finansiering og andre dimensjoner;
- stabil nøkkel;
- om null betyr nullbudsjett eller manglende verdi;
- hvem som eier og godkjenner kilden.

Hvis kilden finnes, før den gjennom landing, conformance og dataproducts som et
eget, navngitt datasett. Legg inn de samme paginerings- og
kompletthetskontrollene som for hovedboken. Kontroller også at hver rad kan
kobles entydig til rapportens konto, periode, finansiering og eventuelle andre
dimensjoner.

Hvis kilden ikke finnes, dokumenter søket og konklusjonen. Be om faglig
avklaring på om kontantbudsjett lik null er en autoritativ regel. Fram til en
kilde eller regel er godkjent, skal kontantbudsjett og kontantavvik være
manglende verdier i dataproductet. De skal ikke fylles fra Excel-fasiten.

Steget er ferdig når kontantbudsjettet enten har en sporbar operativ kilde med
eier og datakontrakt, eller er registrert som et eksplisitt blokkert datagap
med ansvarlig avklaringspunkt.

### 7. Bevar riktig uttrekk av ordinært budsjett

Etter endringene skal `apltransactvalue` fortsatt hentes med riktig
periodeparameter. `apltransact` skal hentes bredt nok til at alle verdilinjer
får matchende header på `trans_id`. `aplversion` skal inneholde relevante
versjoner uten utilsiktet periodefilter.

Kjør en join-kontroll etter dataproduct:

```sql
WITH headers AS (
  SELECT DISTINCT CAST(trans_id AS VARCHAR) AS trans_id
  FROM read_parquet('.../apltransact/*.parquet')
),
values AS (
  SELECT CAST(trans_id AS VARCHAR) AS trans_id
  FROM read_parquet('.../apltransactvalue/*.parquet')
)
SELECT
  count(*) AS value_rows,
  count(*) FILTER (WHERE headers.trans_id IS NOT NULL) AS matched_value_rows,
  count(*) FILTER (WHERE headers.trans_id IS NULL) AS unmatched_value_rows
FROM values
LEFT JOIN headers USING (trans_id);
```

`unmatched_value_rows` skal være 0. Kontroller også at relevante
budsjettversjoner og perioder finnes etter hele dataflyten.

## Testkrav

Lag tester som angriper feilmodusen, ikke tester som bare gjentar
implementasjonen.

### Pagineringsregresjon

Bruk en kontrollert API-respons eller mock med flere rader enn den observerte
grensen på 9 000. Fordel dataene over flere sider og krev at klienten:

- følger alle continuation tokens;
- returnerer alle rader én gang;
- stopper med feil hvis en mellomside feiler permanent;
- tåler en midlertidig `429` uten å miste eller duplisere sider;
- oppdager avvik mellom API-total og mottatt radtall;
- håndterer tom siste side etter API-kontrakten;
- ikke publiserer stagingdata når kjøringen feiler.

Test også en respons med nøyaktig 9 000 rader og en oppgitt neste side. Dette er
den direkte regresjonstesten for februarfeilen.

### Leddvis avstemming

Kjør et lite, kjent datasett gjennom landing, conformance og dataproducts.
Fjern med vilje én landingfil eller én side og krev at kontrollen stanser
kjøringen. En grønn test skal vise like radtall, nøkler og summer gjennom alle
ledd.

### Regnskapsbalanse

Bruk et balansert hovedboksutvalg og fjern én eller flere linjer fra den ene
siden av en postering. Kontrollen skal godkjenne originalen og avvise det
avkortede utvalget.

### Kontantbudsjett

Når en operativ kilde er identifisert, test minst:

- periodedekning;
- unikhet på avtalt korn;
- fortegn og skala;
- kobling mot konto og øvrige rapportdimensjoner;
- forskjellen mellom null og manglende verdi;
- leddvis radtall og kontrollsummer;
- at fasitfilen ikke inngår i produksjonsberegningen.

### Budsjettkobling

Test et tilfelle der periodefiltrering av `apltransact` ville ha fjernet en
nødvendig header. Verdilinjen skal fortsatt få match etter korrekt uttrekk.

## Akseptansekriterier

Arbeidet er ikke ferdig før alle punktene under kan dokumenteres fra en ny
Synapse-kjøring:

- `agltransact` for `202602` inneholder minst de dokumenterte 16 215 radene fra
  det komplette referanseuttrekket, eller et høyere radtall som kan forklares
  med senere kildeendringer.
- API-klienten har hentet alle sider etter API-ets dokumenterte mekanisme.
- API-total og mottatt radtall er like når endepunktet oppgir totalen.
- Landing, conformance og dataproduct er avstemt per periode.
- Sum `amount` per avstemt hovedboksperiode er 0,00, med mindre et godkjent
  unntak forklarer noe annet.
- Et delvis eller feilet uttrekk kan ikke erstatte siste godkjente dataproduct.
- Kjøringen lagrer nok kontrollinformasjon til at manglende sider og rader kan
  spores til riktig ledd.
- Alle `apltransactvalue`-rader har matchende `apltransact`-header.
- Kontantbudsjett har en operativ, dokumentert kilde og komplett dataflyt, eller
  et uttrykkelig dokumentert datagap som blokkerer publisering av feltet.
- Excel-fasiten brukes bare i uavhengige sammenligningstester.
- Nye datasnapshots får nye stier og kontrollsummer. Eksisterende snapshots
  overskrives ikke.

## Leveranse fra Synapse-agenten

Agenten skal levere:

1. Rotårsaksanalyse som peker på første ledd der februar mistet rader.
2. Kodeendring for komplett paginering eller for det faktiske tapsstedet.
3. Kontrollmekanisme med kjørelogg og harde publiseringsporter.
4. Regresjonstester for grensen på 9 000 rader og delvis sidefeil.
5. Resultater fra ny ende-til-ende-kjøring, med radtall og kontrollsummer per
   periode og dataledd.
6. Konklusjon om kontantbudsjettets operative kilde, inkludert datakontrakt hvis
   kilden finnes.
7. Bekreftelse på at ordinær budsjettkobling fortsatt har null manglende
   headere.

Rapporter usikkerhet som usikkerhet. Dersom API-et ikke tilbyr totalantall eller
annen kildekontroll, skal leveransen si hva systemet faktisk kan garantere og
hvilken ekstern kontroll som fortsatt mangler.
