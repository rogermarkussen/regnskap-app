# Oppgave 3 – beslutningsgrunnlag for regnskapsregler

**Utarbeidet:** 22. juli 2026  
**Formål:** Samle reglene som brukes i månedsavslutningen, vise hvor de kommer
fra, og angi hva økonomi må godkjenne før rapporten kan regnes som et produkt.

## Kort konklusjon

Hovedbok og budsjett kan beregnes teknisk, men flere sentrale regler er
utledet eller hentet fra Excel-malen uten dokumentert faglig godkjenning.
Rapporten skal derfor fortsatt merkes «Kontrollert utkast».

De viktigste avklaringene er:

1. velg én fortegnsregel for avvik i hele løsningen;
2. godkjenn budsjettfordelingen fra seksjon til finansiering;
3. bekreft kontantgrunnlaget for seksjon `712`;
4. erstatt eller merk faste kontrolltall fra Excel-malen;
5. definer prosjektmapping for tilleggsforslag, overligger og nye
   ansvarsområder;
6. godkjenn fakturautvalget før beløp brukes som avsetning;
7. godkjenn bilagsart, motkonto, fortegn og kontrollflyt før bilagsfil lages.

## Dagens beregningsregler

| Tema | Dagens regel | Kilde | Status |
| --- | --- | --- | --- |
| Regnskapskilde | `data-ny/2026/agltransact.parquet` | Operativt snapshot | Teknisk etablert |
| Budsjettkilde | `data/apltransact.parquet` koblet med `data/apltransactvalue.parquet` | Lokalt snapshot | Teknisk etablert |
| Budsjettversjon | Bare `2026B` | Prosjektets tidligere reproduksjon mot Excel | Må godkjennes for månedsavslutning |
| Seksjoner i web | Alle reelle seksjoner med hovedbok- eller budsjettdata; `999` utelates | Operative kilder | Teknisk etablert |
| Seksjoner i Excel-mal | `711`, `712`, `721`, `731`, `741` | Mottatt Excel-mal | Må bekreftes som komplett Excel-omfang |
| Avsluttet periode | Siste periode med lønnsposteringer og transaksjonsdato til månedsslutt | Teknisk regel i `monthly_close_data.py` | Må godkjennes som periodelås |
| Lønn | Konto `5000–5999` | Prosjektets eksisterende kontoregel | Må godkjennes |
| Avskrivninger | Konto `6000–6109` | Avstemt mot Excel-fasit | Teknisk avstemt |
| ADK | Konto `6110–7834` | Prosjektets eksisterende kontoregel | Må godkjennes |
| Driftskostnader | Lønn + avskrivninger + ADK | Avstemt mot Excel-fasit | Teknisk avstemt |
| Måned | Bare valgt avsluttet periode | Teknisk beregning | Etablert, avhengig av perioderegel |
| Forrige måned | Perioden umiddelbart før valgt periode | Teknisk beregning | Etablert |
| Hittil i år | Januar til og med valgt periode | Teknisk beregning | Etablert |
| Faktisk finansiering | `154322` og `045101` slås sammen; tom `dim_4` vises som `Uten finansiering`; øvrige beholder `dim_4` | Utledet rapportregel og Excel-fasit | Teknisk avstemt |
| Budsjettfinansiering | `dim_1=212` → `154345`; `dim_1=761` → `154322+045101`; resten → `154301` | Utledet regel fra tidligere Excel-reproduksjon | Ikke faglig godkjent |
| Avvik i oppgave 3 | Budsjett minus hovedbok | Samme regel som oppgave 2 og Excel-fasit | Teknisk avstemt |
| Manglende postering | `0` når kilden finnes, men kombinasjonen ikke har postering | Teknisk presentasjonsregel | Fornuftig, bør godkjennes |
| Manglende kilde/regel | `–` med forklaring | Teknisk presentasjonsregel | Fornuftig, bør godkjennes |
| Nkom-total | Summerer alle seksjoner per finansiering | Teknisk beregning | Må avstemmes mot økonomis total |

## Faktiske kildefunn

### Periode

Hovedboken har komplette månedssluttdatoer og flere tusen lønnsrader fra januar
til juni. Juli har bare 496 hovedboksrader, to lønnsrader og siste dato 3. juli.
Den tekniske regelen velger derfor juni (`202606`).

Dette er en rimelig datakvalitetsregel, men den er ikke det samme som en formell
periodelås i økonomisystemet. Økonomi må avgjøre om rapporten skal bruke en
eksplisitt lukket-periode-markør når den blir tilgjengelig.

### Budsjett og finansiering

Budsjetthodet har feltene `dim_1`, `dim_2`, konto og versjon, men ikke `dim_4`.
Finansiering finnes derfor ikke direkte i mottatt budsjettkilde. Dagens mapping
er utledet fra tidligere Excel-tall:

| Utledet finansiering | Budsjettseksjon | Årsbudsjett 2026B |
| --- | --- | ---: |
| `154301` | Alle `dim_1` unntatt `212` og `761` | 325 087 211,07 |
| `154322+045101` | `dim_1=761` | 115 046 999,98 |
| `154345` | `dim_1=212` | 27 699 999,96 |

Beløpene dokumenterer hva regelen produserer; de beviser ikke at mappingen er
en varig forretningsregel.

### Fortegn og avvik

Oppgave 3 bruker:

```text
avvik = budsjett - hovedbok
```

Dette er nå samme definisjon som i oppgave 2 og Excel-fasiten. Nettsiden,
Excel-eksporten og de automatiske fasittestene bruker samme fortegn.

## Seksjon 712 – kontantgrunnlag

Dagens løsning bruker:

- seksjon `712`;
- konto `8720`;
- finansiering `154370`;
- hovedbok januar–juni som kontant hittil i år;
- budsjett `0` fordi ingen godkjent kontantbudsjettregel er etablert.

Kilden inneholder seks relevante rader og totalt `20 840 977,50` hittil i år,
men ingen postering i juni. Juni vises derfor som `0`, ikke som manglende data.

Økonomi må bekrefte at konto, finansiering og fortegn er riktig, og oppgi hvor
kontantbudsjettet skal hentes fra.

## Faste tall fra Excel-malen

I fanen `741 - SC` ligger kontrolltallene `733 000` og `37 000` i den mottatte
malen. Generatoren erstatter dem ikke. De kan derfor se ut som beregnede tall,
selv om de er statiske verdier fra malen.

Før produksjon må økonomi velge ett av følgende:

- oppgi en datakilde og regel slik at kontrolltallene beregnes;
- bekrefte at de er faste styringstall og angi gyldighetsperiode;
- fjerne dem fra den automatiske rapporten.

## Tilleggsforslag, overligger og nye ansvarsområder

Excel-malen har egne områder for disse tre kategoriene. Hovedboken har prosjekt,
finansiering og konto, men ingen godkjent mapping fra prosjektnummer til
kategori. For relevante kostnadsposter i seksjon `741` er prosjekt ofte `9999`,
som ikke gir grunnlag for å klassifisere beløpet.

Områdene skal ikke fylles automatisk før økonomi leverer minst:

| Felt | Eksempel på nødvendig verdi |
| --- | --- |
| Prosjekt eller annen nøkkel | Prosjektnummer, tiltak eller avtale-id |
| Kategori | Tilleggsforslag, overligger eller nytt ansvarsområde |
| Gyldig fra/til | Periode regelen gjelder |
| Finansiering | Forventet finansieringskode |
| Konto/avgrensning | Konto eller kontointervall som skal tas med |
| Godkjent av | Navn og dato |

## Fakturaer og avsetning

Dagens utvalg tar med workflowflyter som ikke finnes som `ext_inv_ref` i
hovedboken, har minst én `ACT`-oppgave og siste handling `ATTEST` eller
`BDMGOD`. Bare poster med en registrert handling de siste 31 dagene vises i
arbeidslisten. Eldre poster beholdes som historisk kontrollgrunnlag.
Statuskartleggingen viser at de to handlingene ligger på fullførte
`FIN`-oppgaver. Utvalget er derfor bare en kontrolliste, ikke et godkjent
avsetningsgrunnlag. Workflowbeløp legges ikke til ADK eller andre
regnskapstall.

Før fakturabeløp legges til ADK må økonomi og workfloweier godkjenne:

- hvilken aktiv node som betyr at kostnaden skal avsettes;
- hvilken dato som bestemmer riktig periode;
- om beløpet inkluderer eller ekskluderer merverdiavgift;
- riktig konto, seksjon, prosjekt og finansiering;
- fortegn og eventuell motkonto;
- hvordan kreditnota, avvisning og flere workflowflyter håndteres.

## Bilagsutkast

`Bilagsutkast kontroll` er med vilje ikke bokføringsklart. Følgende mangler:

- godkjent bilagsart;
- debet-/kreditregel og fortegn;
- motkonto;
- dokumentasjonstekst og referansekrav;
- regel for reversering i neste periode;
- kontrollør, godkjenner og sporbar godkjenningslogg;
- håndtering av duplikater og allerede bokførte bilag.

Automatisk import eller bokføring skal være sperret til alle punktene er
besluttet og testet med representative bilag.

## Beslutningstabell for økonomi

| Nr. | Beslutning | Anbefalt produktregel | Status | Eier/dato |
| ---: | --- | --- | --- | --- |
| 1 | Hvordan bestemmes avsluttet periode? | Bruk formell periodelås når tilgjengelig; behold dagens datakontroll som sikkerhetsnett | Ikke avklart |  |
| 2 | Er konto `5000–5999` riktig lønnsavgrensning? | Bekreft eller lever kontoliste | Ikke avklart |  |
| 3 | Er konto `6110–7834` riktig ADK-avgrensning? | Bekreft eller lever kontoliste | Ikke avklart |  |
| 4 | Skal `154322` og `045101` alltid slås sammen? | Dokumenter gyldighetsperiode | Ikke avklart |  |
| 5 | Er budsjettmappingen `212`/`761`/resten riktig? | Flytt godkjent mapping til konfigurasjon med dato | Ikke avklart |  |
| 6 | Skal avvik være budsjett minus hovedbok? | Bruk samme definisjon i oppgave 2 og 3 | Implementert og avstemt mot fasit | 23.07.2026 |
| 7 | Er `8720`/`154370` riktig for seksjon 712? | Behold som advarsel til bekreftet | Ikke avklart |  |
| 8 | Hvor kommer kontantbudsjett for 712 fra? | Ikke vis et faglig nullbudsjett uten bekreftelse | Ikke avklart |  |
| 9 | Hva skal skje med `733 000` og `37 000`? | Beregn, tidsavgrens eller fjern | Ikke avklart |  |
| 10 | Hvordan klassifiseres de tre prosjektområdene? | Godkjent mappingtabell | Ikke avklart |  |
| 11 | Hvilke workflowfakturaer skal avsettes? | Godkjent regel per aktiv node/status | Ikke avklart |  |
| 12 | Hvilke bilagsregler gjelder? | Ingen bokføringsfil før full godkjenning | Ikke avklart |  |

## Ferdig når

- alle beslutningene over har eier og dato;
- reglene er flyttet fra hardkodet logikk til dokumentert konfigurasjon der det
  er hensiktsmessig;
- juni 2026 er avstemt mot økonomis manuelt godkjente månedsavslutning;
- nettside, Excel og validering bruker samme regler og fortegn;
- avvik har forklaring og drilldown til underliggende transaksjoner;
- bilagsutkastet er testet, men fortsatt sperret til særskilt produksjonsvedtak.

**Godkjent av:** ____________________  
**Dato:** ____________________
