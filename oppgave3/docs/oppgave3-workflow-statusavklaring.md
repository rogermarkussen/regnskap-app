# Oppgave 3 – beslutningsgrunnlag for workflowstatus

**Utarbeidet:** 22. juli 2026  
**Formål:** Underlag for statusmøte med workfloweier. Dokumentet beskriver hva
snapshotet faktisk viser, hvilke tolkninger løsningen gjør i dag, og hvilke
beslutninger workfloweier må ta før rapporten kan brukes operativt.

## Kort konklusjon

Den lokale dataproduct-dokumentasjonen avklarer at `wf_status` er status på en
enkelt oppgave, ikke en samlet status for fakturaen. Den beskriver `ACT` som en
aktiv oppgave som ligger hos `wf_user_id`, og `FIN` som et behandlet eller
fullført steg der `real_user` viser hvem som utførte handlingen.

Det er derfor ikke en motsetning at samme workflowflyt har både `ACT`-rader og
`FIN`-rader: fullførte steg kan ligge sammen med andre steg som fortsatt er
aktive. En samlet fakturastatus må utledes fra alle oppgavene i samme `oid`, og
eventuelt fra flere `oid` når fakturanummeret ikke er entydig.

Det viktigste uløste punktet er betydningen av `action_code`. Ingen fullstendig
kodebok finnes i prosjektmappen. Dagens oversettelse av siste handling
`ATTEST` til «Til godkjenning» og `BDMGOD` til «I etterkontroll» er ikke støttet
av den lokale dokumentasjonen. Begge kodene forekommer på `FIN`-rader og ser
derfor ut til å beskrive handlinger som er utført, ikke nødvendigvis neste steg.

## Kilder i prosjektmappen

- `data-ny/dataproducts-dokumentasjon.html` beskriver datamodellen og feltene.
- `data-ny/2026/awftaskfin.parquet` viser hvilke status- og handlingskoder som
  faktisk forekommer, og hvordan de kombineres.
- `scripts/workflow_data.py` og `scripts/monthly_close_data.py` inneholder
  løsningens nåværende tekniske oversettelser. Disse er implementasjon, ikke en
  ekstern faglig kodebok.

## Observasjoner i mottatt snapshot

Tallene under gjelder rader med standard fakturanøkkel
`col2_descr = 'Fakturanr'`.

### Oppgavestatus

| `wf_status` | Rader | Flyter | Fakturanumre | Forklaring og sikkerhet |
| --- | ---: | ---: | ---: | --- |
| `ACT` | 19 590 | 3 300 | 2 579 | **Dokumentert:** aktiv oppgave; `wf_user_id` angir hvem oppgaven ligger hos |
| `FIN` | 12 348 | 3 300 | 2 579 | **Dokumentert:** behandlet/fullført oppgavesteg; handling og utførende finnes på raden |
| `FWD` | 1 016 | 920 | 778 | **Sterkt støttet:** videresendt oppgave; alle radene har handling `FW` |
| `TMD` | 198 | 197 | 168 | **Delvis støttet:** tids-/ventestyrt oppgave; alle radene har handling `ES`, men eksakt kodebetydning mangler |
| `REJ` | 132 | 107 | 68 | **Sterkt støttet:** avvist oppgave; radene har `AVVATT`, `AVVREG` eller `RJ` |

`WTN` finnes på ni rader i hele workflowfilen, men ikke på rader som har
standard fakturanøkkel. Dataproduct-dokumentasjonen nevner at workflow kan ha
ventestatus, så `WTN` er sannsynligvis «venter», men koblingen er ikke
eksplisitt dokumentert. Workfloweier må avklare om radene tilhører en annen
prosess, eller om de også skal omfattes av fakturarapporten.

### Handlingskoder i fakturautvalget

| `action_code` | Tilhørende status | Rader | Fakturanumre | Det prosjektmappen støtter |
| --- | --- | ---: | ---: | --- |
| tom | `ACT` | 19 590 | 2 579 | Aktiv oppgave uten utført handling |
| `AP` | `FIN` | 5 455 | 2 579 | Fullført handling; ekspansjonen av `AP` finnes ikke lokalt |
| `ATTEST` | `FIN` | 3 451 | 2 579 | Fullført attestrelatert handling; «Til godkjenning» er ikke dokumentert |
| `BDMGOD` | `FIN` | 3 436 | 2 579 | Fullført BDM-godkjenningsrelatert handling; «I etterkontroll» er ikke dokumentert |
| `FW` | `FWD` | 1 016 | 778 | Videresendingshandling |
| `ES` | `TMD` | 198 | 168 | Tids-/ventestyrt handling; eksakt ekspansjon mangler |
| `AVVATT` | `REJ` | 69 | 39 | Avvisning knyttet til atteststeg; eksakt tekst må bekreftes |
| `AVVREG` | `REJ` | 43 | 25 | Avvisning knyttet til registreringssteg; eksakt tekst må bekreftes |
| `RJ` | `REJ` | 20 | 9 | Avvisningshandling; eksakt ekspansjon mangler |
| `UI` | `FIN` | 6 | 5 | Fullført handling; ekspansjonen av `UI` finnes ikke lokalt |

Antall for enkelte koder er høyere i hele filen enn i fakturautvalget. Møtet
må avklare om oppgave 3 bare skal dekke standard fakturaflyt, eller også andre
workflowtyper.

## Beslutninger workfloweier må ta

| Nr. | Spørsmål | Beslutning | Eier | Dato |
| ---: | --- | --- | --- | --- |
| 1 | Er `wf_status` status for oppgaven, noden eller hele workflowflyten? | **Avklart lokalt:** status for oppgaven | Prosjektdokumentasjon | 22.07.2026 |
| 2 | Når er en faktura reelt «til behandling», og hvilke rader skal telle som åpne? | **Delvis avklart:** `ACT` er åpen oppgave; samlet regel per faktura må godkjennes |  |  |
| 3 | Kan historiske `ACT`-rader bli stående etter at en senere handling er fullført? | Ikke avklart |  |  |
| 4 | Hvilket tidsfelt avgjør siste hendelse: `action_date`, `ready_date`, `distr_date` eller en kombinasjon? | Feltene er dokumentert, men prioriteringsregelen er ikke avklart |  |  |
| 5 | Hva betyr `FIN`, `FWD`, `REJ`, `TMD` og `WTN` faglig? | `FIN`, `FWD` og `REJ` er avklart på hovednivå; `TMD` og `WTN` må bekreftes |  |  |
| 6 | Hva betyr `AP`, `ATTEST`, `BDMGOD`, `FW`, `ES`, `AVVATT`, `AVVREG`, `RJ` og `UI`? | Statussammenheng er kartlagt; full kodebok mangler |  |  |
| 7 | Er «Til godkjenning» for `ATTEST` og «I etterkontroll» for `BDMGOD` riktig, eller beskriver kodene en handling som allerede er utført? | **Ikke støttet lokalt:** begge er fullførte `FIN`-handlinger; etikettene må endres eller bekreftes |  |  |
| 8 | Hvordan skal parallelle oppgaver, flere brukere og flere workflow-`oid` for samme fakturanummer presenteres? | Ikke avklart |  |  |
| 9 | Hvilke sluttilstander gjør at en faktura skal fjernes fra arbeidslisten? | Ikke avklart |  |  |
| 10 | Skal `WTN` og workflowrader uten standard fakturanøkkel inngå i rapporten? | Ikke avklart |  |  |

## Forslag til 30-minutters møte

1. Workfloweier forklarer datamodellen for oppgave, node og flyt – 5 minutter.
2. Gå gjennom status- og handlingskodene – 10 minutter.
3. Beslutt regel for samlet fakturastatus og parallelle oppgaver – 10 minutter.
4. Avtal hvem som tester et utvalg fakturaer og godkjenner regelen – 5 minutter.

Ta med minst ett eksempel fra hver av disse gruppene:

- en flyt med `ACT`, `ATTEST`, `BDMGOD` og `AP`;
- en flyt med `REJ`;
- en flyt med `FWD`;
- en flyt med `TMD`;
- en rad med `WTN` uten standard fakturanøkkel;
- en faktura med flere workflow-`oid`.

## Akseptansekriterier etter møtet

- Alle status- og handlingskoder har en godkjent norsk tekst og forklaring.
- Det finnes en deterministisk regel for samlet fakturastatus.
- Regelen håndterer parallelle oppgaver og flere workflowflyter eksplisitt.
- Minst ti representative fakturaer er manuelt kontrollert mot DFØ-visningen.
- Workfloweier, navn og godkjenningsdato er dokumentert.
- Først etter godkjenning endres produksjonsregelen og valideringstestene.

**Godkjent av:** ____________________  
**Dato:** ____________________
