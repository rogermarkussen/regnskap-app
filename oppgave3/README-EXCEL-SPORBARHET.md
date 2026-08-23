# Excel-sporbarhet for oppgave 3

Dette dokumentet forklarer hvor hvert utfylt element i den genererte
månedsavslutningsfilen kommer fra. Det er skrevet for situasjonen der noen
peker på et tall i Excel og spør: «Hvor fikk du akkurat dette tallet fra?»

Dokumentasjonen gjelder arbeidsboken under den eksterne genererte dataroten:

```text
$REGNSKAP_DATA_ROOT/generated/2026-08-23/oppgave3/reports/manedsavslutning_2026-06.xlsx
```

Den samme, sist genererte filen publiseres som:

```text
static/manedsavslutning-siste.xlsx
```

Arbeidsboken inneholder også tre dokumentasjonsark som alltid skal brukes som
første oppslag:

1. `Cellekatalog` har én rad per ikke-tomme celle, med kilde, regel og status.
2. `Sporbarhet` forklarer sammenhengende celleområder og tabeller.
3. `Uavklarte malverdier` viser tall og formler som fremdeles stammer fra
   Excel-malen og ikke fra operative data.

I den nåværende filen er 2 414 ikke-tomme celler katalogført. Ingen av disse
mangler kildeklassifisering. Det er 77 uavklarte malceller: 10 i `741 - SC` og
67 i det skjulte, sperrede arket `Avsetningsbilag`.

## Slik svarer du på spørsmål om ett bestemt tall

Eksempel: noen spør hvor tallet i `711 - SID!C7` kommer fra.

1. Åpne `Cellekatalog`.
2. Filtrer `Ark` til `711 - SID` og `Celle` til `C7`.
3. Les `Opprinnelse`, `Kildefil og felt`, `Regel eller transformasjon` og
   `Faglig status`.
4. Slå opp celleområdet i denne README-en. For `C7` er forklaringen:
   hovedbok, seksjon `711`, finansiering `154301`, lønnskonto `5000–5999`,
   periode `202606`, summert fra feltet `amount`.
5. Hvis transaksjonslinjene må vises, bruk SQL-oppskriften under
   «Reprodusere et hovedbokstall».

Ikke bruk Excel-filer under `Fasit/` som forklaring på et publisert tall. De er
bare uavhengige testorakler. Publiserte tall skal kunne føres tilbake til
operative Parquet-kilder.

## Operative kilder

| Kilde | Bruk | Viktigste felt |
| --- | --- | --- |
| `common.ledger` | Hovedbok, periodevalg, bokføringskontroll og kontantdetaljer | `amount`, `account`, `period`, `trans_date`, `dim_1`, `dim_2`, `dim_4`, `description`, `ext_inv_ref`, `apar_id`, `voucher_no`, `voucher_date` |
| `common.budget_header` | Budsjetthode og dimensjoner | `trans_id`, `account`, `dim_1`, `version` |
| `common.budget_values` | Budsjettbeløp per periode | `trans_id`, `period`, `amount` |
| `task3.workflow` | Faktura, workflowstatus, handlinger, leverandør, beløp og konteringsdimensjoner | `col1_value`, `col2_value`, `col2_descr`, `col5_value`, `col6_value`, `logged_values`, `oid`, `wf_status`, `action_code`, `action_date`, `ready_date`, `distr_date` |
| `task3.monthly_close_template` | Layout, hjelpetekster og ikke-erstattede malceller | De opprinnelige arkene og celleverdiene |
| `config/task3_rules.json` | Versjonerte beregningsregler | periodeår, budsjettversjon, seksjoner, kontointervaller, finansieringsmapping og workflowutvalg |

Mellomresultatet `monthly_close_summary.parquet` under ekstern `generated/` inneholder
beregnede hovedbok-, budsjett- og avvikstall. Det gjør kontroll enklere, men er
ikke den opprinnelige kilden. Tallene der bygges på nytt fra Parquet-filene over.

## Felles beregningsregler

### Periode

Aktuell periode velges fra hovedboken. Regelen tar siste periode i 2026 som:

- inneholder minst én lønnspostering på konto `5000–5999`; og
- har en siste `trans_date` som når månedens siste kalenderdag.

I dagens uttrekk gir dette:

| Begrep | Periode |
| --- | --- |
| Aktuell måned | `202606` – juni 2026 |
| Forrige måned | `202605` – mai 2026 |
| Hittil i år | `202601` til og med `202606` |

Dette er en teknisk regel, ikke en formell periodelås fra økonomisystemet.

### Kontokategorier

| Excel-kategori | Kontointervall | Operativt felt |
| --- | ---: | --- |
| Lønnskostnader | `5000–5999` | `account` |
| Avskrivninger | `6000–6109` | `account` |
| ADK | `6110–7834` | `account` |
| Driftskostnader | Lønn + avskrivninger + ADK | Beregnet sum |

Avskrivninger har ikke en egen synlig rad i hovedarkenes første tabell, men de
inngår i raden `Driftskostnader`.

### Finansiering

Hovedbok bruker `dim_4`:

- `154322` og `045101` vises samlet som `154322+045101`;
- tom `dim_4` vises som `Uten finansiering`;
- andre koder beholder sin opprinnelige verdi.

Budsjettkilden har ikke `dim_4`. Finansiering utledes derfor fra
`apltransact.dim_1`:

| `dim_1` | Utledet finansiering |
| --- | --- |
| `212` | `154345` |
| `761` | `154322+045101` |
| Alle andre verdier | `154301` |

Budsjettmappingen er teknisk implementert og avstemt, men ikke faglig godkjent.

### Hovedbok, budsjett og avvik

For valgt seksjon, finansiering, kategori og periode gjelder:

```text
hovedbok = SUM(agltransact.amount)
budsjett = SUM(apltransactvalue.amount), koblet til apltransact med trans_id
avvik = budsjett - hovedbok
```

Bare budsjettversjon `2026B` brukes. Når kilden finnes, men kombinasjonen ikke
har posteringer, vises `0`. Når en nødvendig kilde eller regel faktisk mangler,
vises `–` eller en forklaring.

## Originalarkene fra Excel-malen

### `711 - SID`

Alle hovedtall gjelder seksjon `711` og finansiering `154301`.

| Celler | Innhold | Kilde/beregning |
| --- | --- | --- |
| `C7`, `D7`, `E7` | Lønn aktuell måned | Hovedbok, budsjett og budsjett minus hovedbok |
| `C8`, `D8`, `E8` | ADK aktuell måned | Hovedbok, budsjett og budsjett minus hovedbok |
| `C9`, `D9`, `E9` | Driftskostnader aktuell måned | Lønn + avskrivninger + ADK |
| `J7:L9` | Samme kategorier hittil i år | Sum `202601–202606` |
| `N7:P9` | Samme kategorier forrige måned | Periode `202605` |
| `B14:F17` | Inntil fire fakturakandidater | Workflowutvalget forklart nedenfor |
| `E18` | Sum av de synlige kandidatene | Sum `belop_nok` for rad 14–17 |
| `C26` | Lønn etter mulige avsetninger | Hovedbok lønn; uendret av workflow |
| `C27` | ADK etter mulige avsetninger | Hovedbok ADK + alle kandidater for seksjon 711 |
| `C28` | Total etter mulige avsetninger | Lønn + avskrivninger + justert ADK |
| `C3`, `C5:D5`, `N5:O5`, `C23` | Månedsnavn | Utledet fra valgt hovedboksperiode |
| `B20` | Begrensning for tilleggsforslag | Generert tekst fordi godkjent prosjektmapping mangler |

I fakturatabellen betyr kolonnene:

| Kolonne | Verdi | Workflowfelt |
| --- | --- | --- |
| B | Konto | `A0` fra `logged_values`, eventuelt `col6_value` |
| C | Seksjon | `C1` fra `logged_values` |
| D | Finansiering | `R00` fra `logged_values` |
| E | Beløp | `col5_value` |
| F | Leverandør, fakturanummer og status | `col1_value`, `col2_value` og beregnet kandidatstatus |

### `721 - SA`

Alle hovedtall gjelder seksjon `721` og finansiering `154301`.

| Celler | Innhold | Kilde/beregning |
| --- | --- | --- |
| `C7:E9` | Lønn, ADK og driftskostnader aktuell måned | Samme regler som for 711, filtrert til seksjon 721 |
| `I7:K9` | Hittil i år | Sum `202601–202606` |
| `M7:O9` | Forrige måned | Periode `202605` |
| `B14:F17` | Inntil fire fakturakandidater | Samme kolonnemapping som 711 |
| `E18` | Sum av de synlige kandidatene | Sum rad 14–17 |
| `C26:C28` | Lønn, justert ADK og total etter mulige avsetninger | Hovedbok kombinert med alle kandidater for seksjon 721 |
| `C3`, `C5:D5`, `M5:N5`, `C23` | Månedsnavn | Valgt hovedboksperiode |
| `B19` | Kommentarstatus | Utdatert eksempelkommentar er erstattet med nøytral kildeforklaring |

### `731 - SB`

Alle hovedtall gjelder seksjon `731` og finansiering `154301`.

| Celler | Innhold | Kilde/beregning |
| --- | --- | --- |
| `C7:E9` | Lønn, ADK og driftskostnader aktuell måned | Samme regler som for 711, filtrert til seksjon 731 |
| `I7:K9` | Hittil i år | Sum `202601–202606` |
| `M7:O9` | Forrige måned | Periode `202605` |
| `B16:F19` | Inntil fire fakturakandidater | Samme kolonnemapping som 711 |
| `E20` | Sum av de synlige kandidatene | Sum rad 16–19 |
| `C29:C31` | Lønn, justert ADK og total etter mulige avsetninger | Hovedbok kombinert med alle kandidater for seksjon 731 |
| `C3`, `C5:D5`, `M5:N5`, `C26` | Månedsnavn | Valgt hovedboksperiode |
| `B22` | Begrensning for tilleggsforslag | Generert tekst fordi godkjent prosjektmapping mangler |

### `741 - SC`

Hovedblokken gjelder seksjon `741` og finansiering `154301`.

| Celler | Innhold | Kilde/beregning |
| --- | --- | --- |
| `C7:E9` | Lønn, ADK og driftskostnader aktuell måned | Hovedbok, budsjett og avvik for 741/154301 |
| `G7:I9` | Hittil i år | Sum `202601–202606` |
| `L7:N9` | Forrige måned | Periode `202605` |
| `C14:E15` | ADK og driftskostnader, øvrig finansiering, aktuell måned | Første øvrige finansiering med data i seksjon 741 |
| `G14:I15` | Samme øvrige finansiering hittil i år | Sum `202601–202606` |
| `C50`, `C51` | ADK og driftskostnader for øvrig finansiering | Hovedbok aktuell måned |
| `B19:H22` | Inntil fire fakturakandidater | Se egen kolonnemapping nedenfor |
| `G23` | Sum av de synlige kandidatene | Sum rad 19–22 |
| `C41` | Lønn etter mulige avsetninger | Hovedbok lønn |
| `C42` | ADK etter mulige avsetninger | Hovedbok ADK + alle kandidater for seksjon 741 |
| `C43` | Total etter mulige avsetninger | Lønn + avskrivninger + justert ADK |
| `B25:F35` | Tilleggsforslag, overligger og nye ansvarsområder | Vises som utilgjengelig fordi godkjent prosjektmapping mangler |
| `C3`, `C5:D5`, `L5:M5`, `C12:D12`, `C38`, `C47` | Månedsnavn | Valgt hovedboksperiode |
| `B11`, `B46` | Navn på øvrig finansiering | Første øvrige finansiering med data |

Fakturatabellen i 741 har flere dimensjoner enn de andre seksjonsarkene:

| Kolonne | Verdi | Workflowfelt |
| --- | --- | --- |
| B | Konto | `A0` fra `logged_values`, eventuelt `col6_value` |
| C | Seksjon | `C1` fra `logged_values` |
| D | Prosjekt | `B0` fra `logged_values` |
| E | Finansiering | `R00` fra `logged_values` |
| F | Leverandør | `col1_value` |
| G | Beløp | `col5_value` |
| H | Fakturanummer og status | `col2_value` og beregnet kandidatstatus |

Følgende celler er ikke hentet fra operative data:

| Celler | Status |
| --- | --- |
| `E41`, `E42` | Faste verdier `733 000` fra Excel-malen |
| `E50` | Fast verdi `37 000` fra Excel-malen |
| `F41:F43`, `E43`, `F50:F51`, `E51` | Malformler som er avhengige av de faste verdiene over |

Disse ti cellene står i `Uavklarte malverdier`. De må enten få en godkjent
operativ kilde, defineres som tidsavgrensede styringstall eller fjernes.

### `Totalt eks 712`

Arket summerer bare seksjonene `711`, `721`, `731` og `741` for finansiering
`154301`. Seksjon 712 er uttrykkelig utelatt.

| Celler | Innhold | Beregning |
| --- | --- | --- |
| `C7:E9` | Lønn, ADK og driftskostnader aktuell måned | Sum av de fire seksjonene |
| `G7:I9` | De samme kategoriene hittil i år | Sum av de fire seksjonene |
| `C17` | Lønn etter mulige avsetninger | Sum av seksjonsarkenes etter-tall |
| `C18` | Justert ADK | Sum av hovedbok ADK og alle kandidater i de fire seksjonene |
| `C19` | Total etter mulige avsetninger | Sum lønn + avskrivninger + justert ADK |
| `C3`, `C5:E5`, `C14` | Månedsnavn | Valgt hovedboksperiode |

### `712`

Seksjon 712 bruker en særskilt, foreløpig kontantregel:

```text
dim_1 = 712
account = 8720
dim_4 = 154370
```

| Celler | Innhold | Kilde/beregning |
| --- | --- | --- |
| `C6` | Hovedbok aktuell måned | Sum `agltransact.amount` for filtrene over og periode 202606 |
| `D6` | Budsjett aktuell måned | `0`, fordi godkjent kontantbudsjettregel mangler |
| `E6` | Avvik aktuell måned | Budsjett minus hovedbok |
| `F6` | Hovedbok hittil i år | Sum periode 202601–202606 |
| `G6` | Budsjett hittil i år | `0`, samme begrunnelse |
| `H6` | Avvik hittil i år | Budsjett minus hovedbok |
| `J6` | Hovedbok forrige måned | Sum periode 202605 |
| `K6` | Budsjett forrige måned | `0`, samme begrunnelse |
| `L6` | Avvik forrige måned | Budsjett minus hovedbok |
| `B3`, `B6`, `F5:H5`, `J5:L5` | Overskrifter | Periode og konfigurerte konto-/finansieringsregler |
| `B10` | Kildebegrensning | Markerer at kontantregelen må faglig bekreftes |
| `B15` | Avsetningsstatus | Ingen avsetningsbilag registreres automatisk |

Rad 7 og 8 skjules og tømmes. Gamle malformler i disse radene brukes ikke.

### `Avsetningsbilag`

Dette arket kommer fra Excel-malen og er skjult. Det er ikke bokføringsklart.
Generatoren setter `A74` til en tydelig sperretekst. De resterende 67 tallene
og formlene fra malen står i `Uavklarte malverdier`.

Ikke bruk verdier fra dette arket som dokumentasjon for et bilag. Bilagsart,
motkonto, fortegn, reversering og godkjenningsløp er ikke faglig definert.

## Genererte detalj- og kontrollark

### `Seksjon per finansiering`

Dette er den mest komplette tabellen for beregnede regnskaps- og budsjetttall.

| Kolonne | Betydning | Kilde/beregning |
| --- | --- | --- |
| A – Periode | Aktuell periode | Periodeberegningen fra hovedbok |
| B – Seksjon | Rapportseksjon | `dim_1`, begrenset til 711, 712, 721, 731 og 741 |
| C – Finansiering | Normalisert finansiering | Hovedbok `dim_4` eller budsjettmapping fra `dim_1` |
| D – Kategori | Lønn, avskrivninger, ADK, driftskostnader eller tilskudd | Kontointervall/regelkategori |
| E – Hovedbok måned | Faktisk beløp aktuell måned | `SUM(agltransact.amount)` |
| F – Budsjett måned | Budsjett aktuell måned | `SUM(apltransactvalue.amount)` for 2026B |
| G – Diff måned | Avvik aktuell måned | F minus E |
| H – Hovedbok forrige måned | Faktisk beløp 202605 | `SUM(agltransact.amount)` |
| I – Budsjett forrige måned | Budsjett 202605 | `SUM(apltransactvalue.amount)` |
| J – Diff forrige måned | Avvik 202605 | I minus H |
| K – Hovedbok hittil i år | Faktisk beløp 202601–202606 | Sum hovedbok |
| L – Budsjett hittil i år | Budsjett 202601–202606 | Sum budsjett 2026B |
| M – Diff hittil i år | Avvik hittil i år | L minus K |
| N – Budsjettversjon | Brukt budsjettversjon | `2026B` fra regelkonfigurasjonen |
| O – Kildestatus | Om tallet er beregnet, foreløpig eller mangler kilde | Generatorens statusfelt |

### `Nkom per finansiering`

Arket summerer alle seksjoner per finansiering og kategori.

| Kolonne | Betydning | Kilde/beregning |
| --- | --- | --- |
| A – Periode | Aktuell periode | Hovedbokbasert periodevalg |
| B – Finansiering | Normalisert finansiering | Samme regler som over |
| C – Kategori | Kostnadskategori | Kontointervall/regelkategori |
| D – Hovedbok måned | Nkom-total aktuell måned | Sum alle seksjoner |
| E – Budsjett måned | Nkom-budsjett aktuell måned | Sum alle seksjoner |
| F – Diff måned | Avvik aktuell måned | E minus D |
| G – Hovedbok hittil i år | Nkom-total 202601–202606 | Sum alle seksjoner |
| H – Budsjett hittil i år | Nkom-budsjett 202601–202606 | Sum alle seksjoner |
| I – Diff hittil i år | Avvik hittil i år | H minus G |
| J – Budsjettversjon | Brukt versjon | `2026B` |

### `712 kontantdetaljer`

Dette arket viser transaksjonene bak seksjon 712-tallet og er den direkte
drilldownen til hovedbok.

| Kolonne | Kilde |
| --- | --- |
| A – Periode | `agltransact.period` |
| B – Konto | `agltransact.account` |
| C – Seksjon | `agltransact.dim_1` |
| D – Prosjekt | `agltransact.dim_2` |
| E – Finansiering | `agltransact.dim_4` |
| F – Beskrivelse | `agltransact.description` |
| G – Beløp NOK | `agltransact.amount` |

Siste rad summerer kolonne G hittil i år. Alle detaljrader er filtrert til
seksjon `712`, konto `8720`, finansiering `154370` og periode 202601–202606.

### `Bilagsutkast kontroll`

Dette er en kontrolliste, ikke en bokføringsfil.

| Kolonne | Betydning | Kilde/beregning |
| --- | --- | --- |
| A – Fakturanummer | Fakturanummer | `awftaskfin.col2_value` når `col2_descr='Fakturanr'` |
| B – Leverandør | Leverandørnavn | Siste `col1_value` i workflowflyten |
| C – Status | Kandidatstatus | Fast merking `Kandidat til kontroll` |
| D – Statusgrunnlag | Hvorfor raden er valgt | Ikke bokført, har aktiv oppgave og godkjent siste handlingskode |
| E – Konto | Kontert konto | `A0` fra `logged_values`, ellers `col6_value` |
| F – Seksjon | Kontert seksjon | `C1` fra `logged_values` |
| G – Prosjekt | Kontert prosjekt | `B0` fra `logged_values` |
| H – Finansiering | Kontert finansiering | `R00` fra `logged_values` |
| I – Beløp | Workflowbeløp | `col5_value` fra raden med konteringsdimensjoner |
| J – Siste handling | Tidspunkt | Siste `action_date` i workflowflyten |
| K – Alder dager | Alder relativt til snapshot | Dager mellom siste handling og seneste workflowhendelse |
| L – Bokføringskontroll | Regnskapsstatus | Fakturanummeret finnes ikke som `agltransact.ext_inv_ref` |
| `N1` | Workflow-snapshot | Maks av `action_date`, `ready_date` og `distr_date` |

En faktura tas bare med når den:

- tilhører seksjon 711, 712, 721, 731 eller 741;
- ikke finnes som `ext_inv_ref` i mottatt hovedbok;
- har minst én oppgave med `wf_status='ACT'`; og
- har siste fullførte handling `ATTEST` eller `BDMGOD`.

Kandidatene er ikke godkjente avsetninger. Statuskodene og utvalgsregelen må
godkjennes av workfloweier og økonomi.

### `Sporbarhet`

| Kolonne | Innhold |
| --- | --- |
| A – Ark | Excel-arket området tilhører |
| B – Celle eller område | Adressen som dokumenteres |
| C – Element | Hva området viser |
| D – Opprinnelse | Hovedbok, budsjett, workflow, mal eller generator |
| E – Kildefil og felt | Konkret fil og relevante felt |
| F – Regel eller transformasjon | Filter, summering eller annen beregning |
| G – Faglig status | Godkjent, foreløpig, uavklart eller sperret |

### `Uavklarte malverdier`

| Kolonne | Innhold |
| --- | --- |
| A – Ark | Originalarket |
| B – Celle | Eksakt celleadresse |
| C – Verdi eller formel | Det som er beholdt fra malen |
| D – Type | Fast tall eller formel |
| E – Opprinnelse | Excel-malen |
| F – Hvorfor den står her | Hvorfor generatoren ikke har erstattet cellen |
| G – Status | Uavklart eller sperret |
| H – Neste tiltak | Hva som må avklares før bruk |

### `Cellekatalog`

| Kolonne | Innhold |
| --- | --- |
| A – Ark | Arknavn |
| B – Celle | Eksakt celleadresse |
| C – Verdi eller formel | Nåværende innhold |
| D – Datatype | Tall, tekst, dato eller formel |
| E – Opprinnelse | Kildeklasse |
| F – Kildefil og felt | Konkret kildehenvisning |
| G – Regel eller transformasjon | Hvordan cellen ble fylt |
| H – Faglig status | Status for bruk og godkjenning |

`Cellekatalog` er det autoritative oppslaget for en bestemt celle. Denne
README-en forklarer betydningen av tabellen og beregningen rundt cellen.

## Reprodusere et hovedbokstall

Eksempel for `711 - SID!C7`, lønn i juni 2026:

```sql
select sum(try_cast(amount as double)) as hovedbok_nok
from read_parquet('data-ny/2026/agltransact.parquet')
where trim(period) = '202606'
  and trim(dim_1) = '711'
  and trim(dim_4) = '154301'
  and try_cast(account as integer) between 5000 and 5999;
```

For å vise linjene bak summen, erstatt `sum(...)` med relevante felt:

```sql
select
  period,
  account,
  dim_1 as seksjon,
  dim_2 as prosjekt,
  dim_4 as finansiering,
  voucher_no,
  voucher_date,
  description,
  amount
from read_parquet('data-ny/2026/agltransact.parquet')
where trim(period) = '202606'
  and trim(dim_1) = '711'
  and trim(dim_4) = '154301'
  and try_cast(account as integer) between 5000 and 5999
order by voucher_date, voucher_no, account;
```

Bytt seksjon, finansiering, periode og kontointervall i tråd med cellemappingen
over.

## Reprodusere et budsjettall

Eksempel for `711 - SID!D7`, lønnsbudsjett i juni 2026:

```sql
select sum(try_cast(v.amount as double)) as budsjett_nok
from read_parquet('data/apltransact.parquet') h
join read_parquet('data/apltransactvalue.parquet') v using (trans_id)
where h.version = '2026B'
  and trim(h.dim_1) = '711'
  and trim(v.period) = '202606'
  and try_cast(h.account as integer) between 5000 and 5999;
```

For hittil-i-år-tallet brukes:

```sql
and trim(v.period) between '202601' and '202606'
```

Avvikscellen ved siden av kan alltid kontrolleres som:

```text
budsjettcellen - hovedbokcellen
```

## Kontroll mot beregnet mellomtabell

Hvis spørsmålet bare er hvilken beregnet rapportnøkkel en celle bruker, kan
den kontrolleres raskt i mellomtabellen. Eksempel for `711 - SID!C7`:

```sql
select hovedbok_maaned_nok
from read_parquet('data/web/monthly_close_summary.parquet')
where omfang = 'Seksjon'
  and omfang_id = '711'
  and finansiering = '154301'
  and kategori = 'Lønnskostnader';
```

Bruk disse målefeltene for andre Excel-kolonner:

| Excel-betydning | Felt i `monthly_close_summary.parquet` |
| --- | --- |
| Hovedbok måned | `hovedbok_maaned_nok` |
| Budsjett måned | `budsjett_maaned_nok` |
| Avvik måned | `avvik_maaned_nok` |
| Hovedbok forrige måned | `hovedbok_forrige_nok` |
| Budsjett forrige måned | `budsjett_forrige_nok` |
| Avvik forrige måned | `avvik_forrige_nok` |
| Hovedbok hittil i år | `hovedbok_hittil_nok` |
| Budsjett hittil i år | `budsjett_hittil_nok` |
| Avvik hittil i år | `avvik_hittil_nok` |

Mellomtabellen er et kontrollpunkt. Ved krav om full dokumentasjon skal man
fortsette til operative transaksjons- eller budsjettrader.

## Hva som fortsatt ikke kan forklares med en operativ kilde

Følgende krever beslutning fra økonomi eller workfloweier:

1. De faste malverdiene `741 - SC!E41`, `E42` og `E50`, samt formlene som
   avhenger av dem.
2. Verdiene og formlene i det skjulte `Avsetningsbilag`-arket.
3. Om konto `8720` og finansiering `154370` er riktig kontantgrunnlag for 712.
4. Hvor kontantbudsjettet for 712 skal hentes fra.
5. Om budsjettmappingen fra `dim_1` til finansiering er en godkjent varig regel.
6. Prosjektmapping for tilleggsforslag, overligger og nye ansvarsområder.
7. Hvilke workflowstatuser som faktisk skal utløse avsetning.
8. Bilagsart, motkonto, fortegn, reversering og godkjenningsløp.

Disse punktene skal ikke løses ved å kopiere et tall fra `Fasit/` eller ved å
hardkode en verdi. Inntil de er avklart, skal arbeidsboken vise dem som
uavklarte, foreløpige eller sperrede.

## Teknisk implementasjon og kontroll

| Fil | Rolle |
| --- | --- |
| `scripts/monthly_close_data.py` | Beregner tall, fyller arbeidsboken og lager sporbarhetsarkene |
| `scripts/workflow_data.py` | Lager komplett workflowrapport og kobler faktura mot hovedbok |
| `scripts/task3_rules.py` | Leser og validerer regelkonfigurasjonen |
| `config/task3_rules.json` | Inneholder de versjonerte reglene |
| `scripts/validate_task3.py` | Validerer genererte data og Excel-resultat |
| `tests/test_task3_fasit.py` | Kontrollerer fasit, reproduksjon og komplett cellekatalog |

Kjør hele kontrollen fra `oppgave3/`:

```bash
npm run refresh
```

Kontrollen krever blant annet at:

- alle ikke-tomme Excel-celler finnes i `Cellekatalog`;
- hver katalograd har opprinnelse, kilde, regel og status;
- de kjente faste verdiene i 741 finnes i `Uavklarte malverdier`;
- uavklarte aktive malverdier ikke dukker opp i andre rapportark;
- publiserte summer kan beregnes på nytt fra operative Parquet-kilder; og
- avvik alltid er budsjett minus hovedbok.
