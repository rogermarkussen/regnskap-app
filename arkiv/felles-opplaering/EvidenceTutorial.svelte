<script>
  import { onMount } from 'svelte';
  import { showQueries } from '@evidence-dev/component-utilities/stores';

  onMount(() => showQueries.set(false));

  const projectTree = `regnskap3/
├── Fasit/                  Excel-filer for kontroll og sammenligning
├── data-fra-økonomi/       Operative Excel-uttrekk
├── scripts/                Python og shell for dataklargjøring
├── data/evidence/          Genererte Parquet-tabeller
├── sources/regnskap/       DuckDB-tilkobling og kilde-SQL
├── pages/                  Evidence-sider og side-SQL
├── components/             Svelte-komponenter
├── static/                 Filer nettleseren kan hente direkte
├── outputs/                Separat HTML-kontrollrapport
├── evidence.config.yaml    Evidence-oppsett og tema
├── package.json            Kommandoer og Node-avhengigheter
└── pyproject.toml          Python-avhengigheter`;

  const connectionYaml = `name: regnskap
type: duckdb
options:
  filename: regnskap.duckdb`;

  const sourceSql = `-- sources/regnskap/grouped_finance_rows.sql
select *
from grouped_finance_rows`;

  const sourceActualSql = `-- sources/regnskap/actual_154301_adk.sql
with adk_accounts as (
  select konto
  from finance_rows
  where finansiering = '154301'
    and row_type = 'account'
    and excel_row between 70 and 133
),
actuals as (
  select account, sum(amount) / 1000.0 as hovedbok_tusen
  from read_parquet('data-ny/2026/agltransact.parquet')
  where dim_4 = '154301'
    and period between '202601' and '202603'
    and account in (select konto from adk_accounts)
  group by account
)
select * from actuals;`;

  const pageQuery = `\`\`\`sql kontogruppering_data
select *
from grouped_finance_rows
order by finansiering, excel_row
\`\`\`

<KontogrupperingReport
  rows={kontogruppering_data}
  validations={kontogruppering_kontroller}
/>`;

  const componentProps = `<script>
  export let rows = [];
  export let validations = [];

  let financing = '154301';

  $: financingRows = rows.filter(
    (row) => row.finansiering === financing
  );
<\/script>

{#each financingRows as row}
  <div>{row.radtekst}: {row.hovedbok_tusen}</div>
{/each}`;

  const prepareData = `# Hele kjeden for Excel-baserte data
npm run prepare:data

# Tilsvarer:
uv run python scripts/prepare_evidence_data.py

# Skriptet lager blant annet:
# data/evidence/grouped_finance_rows.parquet
# sources/regnskap/regnskap.duckdb
# static/dashboard_cards.json`;

  const commands = `npm install              # Installer Node-avhengigheter
npm run prepare:data     # Excel -> Parquet + DuckDB + JSON
npm run validate:task2   # Valider kontogrupperingen
npm run sources          # Kjør sources/regnskap/*.sql
npm run dev:fast         # Start lokal utviklingsserver
npm run build            # Bygg statisk produksjonsversjon
npm test                 # Samme byggtest som npm run build
npm run refresh:task2    # Prepare + valider + sources + build`;

  const addPage = `---
title: Min nye rapport
full_width: true
---

\`\`\`sql rapport_data
select finansiering, sum(hovedbok_tusen) as hovedbok
from finance_rows
group by finansiering
\`\`\`

<DataTable data={rapport_data} />`;

  const safeJoin = `with budget as (
  select period_key, konto, sum(budget_value) as budget_value
  from budget_rows
  group by period_key, konto
),
actual as (
  select period_key, konto, sum(actual_value) as actual_value
  from actual_rows
  group by period_key, konto
)
select
  coalesce(b.period_key, a.period_key) as period_key,
  coalesce(b.konto, a.konto) as konto,
  b.budget_value,
  a.actual_value
from budget b
full join actual a
  on b.period_key = a.period_key
 and b.konto = a.konto;`;

  const validationSql = `-- Kontroller alltid kornet før og etter en join
select
  count(*) as rader,
  count(distinct period_key || ':' || konto) as unike_nokler,
  sum(budget_value) as budsjett
from resultat;

-- Totalen før og etter join skal være identisk
select
  (select sum(budget_value) from budget) as foer_join,
  (select sum(budget_value) from resultat) as etter_join;`;

  const debugOrder = `1. npm run prepare:data
2. npm run validate:task2
3. npm run sources:strict
4. npm run build:strict
5. Kontroller nettleserkonsollen
6. Kontroller radtall og summer i DuckDB
7. Sammenlign KPI-total med drilldown-total`;
</script>

<svelte:head>
  <title>Lær Evidence | Regnskapsrapportering</title>
</svelte:head>

<div class="tutorial-shell">
  <header class="tutorial-header">
    <div class="header-copy">
      <span class="eyebrow">Praktisk prosjektkurs</span>
      <h1>Evidence fra null til dette dashboardet</h1>
      <p>En prosjektspesifikk innføring for deg som aldri har sett Evidence, DuckDB eller denne mappen før.</p>
      <div class="header-meta"><span>Evidence 40.1.8</span><span>DuckDB</span><span>Svelte</span><span>Excel + Parquet</span></div>
    </div>
    <nav aria-label="Tilbake til prosjektet">
      <a href="/">KPI-dashboard</a>
    </nav>
  </header>

  <div class="tutorial-layout">
    <aside class="chapter-nav">
      <span>Innhold</span>
      <a href="#mentalmodell"><b>01</b> Mentalmodellen</a>
      <a href="#mappene"><b>02</b> Mappene</a>
      <a href="#byggeflyt"><b>03</b> Byggeflyten</a>
      <a href="#datakilder"><b>04</b> Datakilder</a>
      <a href="#sql"><b>05</b> SQL-lagene</a>
      <a href="#sider"><b>06</b> Sider og queries</a>
      <a href="#svelte"><b>07</b> Svelte-komponenter</a>
      <a href="#spor"><b>08</b> Følg ett tall</a>
      <a href="#oppskrifter"><b>09</b> Praktiske oppskrifter</a>
      <a href="#testing"><b>10</b> Testing</a>
      <a href="#fallgruver"><b>11</b> Fallgruver</a>
      <a href="#ordliste"><b>12</b> Ordliste og øvelser</a>
    </aside>

    <main class="tutorial-content">
      <section class="lesson intro" id="mentalmodell">
        <div class="lesson-title"><span>01</span><div><p>Start her</p><h2>Mentalmodellen for Evidence</h2></div></div>
        <p class="lead">Evidence er et rammeverk der rapporten ligger i kode. Data hentes med SQL, sidene skrives i Markdown, og interaktive deler bygges med Svelte.</p>

        <div class="concept-flow" role="img" aria-label="Evidence fra datakilde til ferdig side">
          <div><span>1</span><strong>Datakilde</strong><small>DuckDB, Parquet, database</small></div><i>→</i>
          <div><span>2</span><strong>Source SQL</strong><small>Gjenbrukbare tabeller</small></div><i>→</i>
          <div><span>3</span><strong>Page SQL</strong><small>Rapportens datasett</small></div><i>→</i>
          <div><span>4</span><strong>Komponent</strong><small>Tabell, kort eller figur</small></div><i>→</i>
          <div><span>5</span><strong>Statisk app</strong><small>Bygges og publiseres</small></div>
        </div>

        <div class="callout principle"><strong>Den viktigste regelen</strong><p>SQL bestemmer hva et tall betyr. Svelte bestemmer hvordan tallet ser ut og hvordan brukeren kan arbeide med det.</p></div>

        <h3>Hva Evidence gjør, og hva det ikke gjør</h3>
        <div class="two-column">
          <div><h4>Evidence gjør</h4><ul><li>Kjører kilde-SQL og side-SQL.</li><li>Gjør query-resultater tilgjengelige i sider.</li><li>Bygger en statisk nettapplikasjon.</li><li>Leverer ferdige tabell- og diagramkomponenter.</li><li>Lar oss bruke egne Svelte-komponenter.</li></ul></div>
          <div><h4>Prosjektets egen kode gjør</h4><ul><li>Leser og normaliserer Excel.</li><li>Oppretter Parquet- og DuckDB-tabeller.</li><li>Definerer finansierings- og kontoregler.</li><li>Kontrollerer summer og avvik.</li><li>Bestemmer hvilke KPI-er som vises.</li></ul></div>
        </div>
      </section>

      <section class="lesson" id="mappene">
        <div class="lesson-title"><span>02</span><div><p>Anatomi</p><h2>Slik er prosjektet organisert</h2></div></div>
        <p>Evidence bryr seg spesielt om <code>sources/</code>, <code>pages/</code>, <code>components/</code>, <code>static/</code> og konfigurasjonsfilen. Resten er prosjektets egen dataplattform.</p>
        <pre><code>{projectTree}</code></pre>

        <div class="folder-table">
          <div class="table-head"><span>Område</span><span>Leses av</span><span>Endres når</span></div>
          <div><code>Fasit/</code><span>Python-skript</span><span>Nye fasitfiler mottas</span></div>
          <div><code>data/evidence/</code><span>DuckDB-bygging</span><span><code>prepare:data</code> kjøres</span></div>
          <div><code>sources/regnskap/</code><span>Evidence sources</span><span>Kilde-SQL eller database endres</span></div>
          <div><code>pages/</code><span>Evidence build</span><span>En rapport eller side-query endres</span></div>
          <div><code>components/</code><span>Svelte/Vite</span><span>Utseende eller interaksjon endres</span></div>
          <div><code>static/</code><span>Nettleseren direkte</span><span>Statiske filer eller JSON endres</span></div>
        </div>
      </section>

      <section class="lesson" id="byggeflyt">
        <div class="lesson-title"><span>03</span><div><p>Livssyklus</p><h2>Hva som skjer når prosjektet bygges</h2></div></div>
        <div class="timeline">
          <article><b>A</b><div><strong>Python klargjør data</strong><p>Excel leses med OpenPyXL, normaliseres med Pandas og lagres som Parquet og DuckDB.</p></div></article>
          <article><b>B</b><div><strong>Valideringen stopper strukturelle feil</strong><p>Forventede filer, finansieringer, totalrader og regnskapsidentiteter kontrolleres.</p></div></article>
          <article><b>C</b><div><strong>Evidence bygger kilder</strong><p>Alle SQL-filene under <code>sources/regnskap/</code> kjøres og lagres i Evidence-manifestet.</p></div></article>
          <article><b>D</b><div><strong>Evidence bygger sider</strong><p>SQL-blokker i <code>pages/</code> evalueres og resultatene sendes til komponentene.</p></div></article>
          <article><b>E</b><div><strong>SvelteKit lager statiske filer</strong><p>Den ferdige applikasjonen skrives til <code>build/</code>.</p></div></article>
        </div>
        <h3>Kommandoene du faktisk trenger</h3>
        <pre><code>{commands}</code></pre>
        <div class="callout warning"><strong>To forskjellige refresh-løp</strong><p><code>refresh:task2</code> bygger Excel/Evidence-løpet. <code>refresh_synapse_testdata.sh</code> oppdaterer testdata i <code>data/</code>. Ingen av dem oppdaterer automatisk <code>data-ny/2026</code>.</p></div>
      </section>

      <section class="lesson" id="datakilder">
        <div class="lesson-title"><span>04</span><div><p>Data</p><h2>Fra Excel til en Evidence-kilde</h2></div></div>
        <p>Evidence leser ikke Excel-filene direkte i dette prosjektet. Et Python-skript gjør dem først om til tabeller med stabile kolonnenavn og datatyper.</p>
        <pre><code>{prepareData}</code></pre>

        <h3>DuckDB-tilkoblingen</h3>
        <p><code>sources/regnskap/connection.yaml</code> forteller Evidence at mappen er en DuckDB-kilde. Filnavnet tolkes relativt til kildemappen.</p>
        <pre><code>{connectionYaml}</code></pre>

        <div class="data-contract">
          <div><span>Excel</span><strong>Menneskevennlig rapport</strong><small>Formatering, sammenslåtte celler og faste radposisjoner</small></div>
          <i>→</i><div><span>DataFrame</span><strong>Normalisert tabell</strong><small>Én rad per konto eller rapportlinje</small></div>
          <i>→</i><div><span>Parquet</span><strong>Portabel mellomlagring</strong><small>Kolonnar, komprimert og rask å lese</small></div>
          <i>→</i><div><span>DuckDB</span><strong>SQL-grensesnitt</strong><small>Tabeller Evidence kan spørre mot</small></div>
        </div>

        <h3>Datakontrakter i dette prosjektet</h3>
        <ul>
          <li><code>dashboard_kpi_calculated</code>: 27 KPI-rader beregnet fra hovedbok og budsjett-Parquet for tre perioder.</li>
          <li><code>dashboard_kpi_source_metadata</code>: datasett-ID, kildedekning og eksplisitt status for manglende metadata.</li>
          <li><code>finance_rows</code>: konto-, subtotal- og seksjonsrader fra finansieringsarkene.</li>
          <li><code>account_groups</code>: kontoenes hovedgruppe og undergruppe.</li>
          <li><code>grouped_finance_rows</code>: ferdig grupperte rapportlinjer for 154301 og alle finansieringer.</li>
          <li><code>grouped_finance_validation</code>: åtte automatiske kontrollresultater.</li>
          <li><code>raw_*</code>: nesten urørte Excel-ark for sporbarhet.</li>
        </ul>
      </section>

      <section class="lesson" id="sql">
        <div class="lesson-title"><span>05</span><div><p>Beregning</p><h2>De to SQL-lagene</h2></div></div>
        <p>Prosjektet har SQL både i <code>sources/regnskap/</code> og i <code>pages/</code>. De har forskjellige roller.</p>

        <div class="layer-compare">
          <article><span>Kildelag</span><h3><code>sources/regnskap/*.sql</code></h3><p>Kjøres av <code>evidence sources</code>. Resultatet blir et navngitt datasett som alle sider kan bruke.</p><ul><li>Passer for gjenbrukbare tabeller.</li><li>Passer for faste KPI-uttrekk.</li><li>Bør ha tydelig korn og stabile kolonner.</li></ul></article>
          <article><span>Sidelag</span><h3><code>pages/*.md</code></h3><p>Kjøres som del av siden. Kan referere til kilder og andre navngitte queries på samme side.</p><ul><li>Passer for rapportspesifikke beregninger.</li><li>Passer for filtrering og presentasjonsfelter.</li><li>Resultatet sendes direkte til komponenter.</li></ul></article>
        </div>

        <h3>En enkel kilde</h3>
        <pre><code>{sourceSql}</code></pre>
        <h3>En beregnet kilde</h3>
        <pre><code>{sourceActualSql}</code></pre>

        <div class="callout danger"><strong>Kontroller alltid kornet</strong><p>«Korn» betyr hva én rad representerer. En tabell med én rad per konto kan ikke uten videre kobles mot en tabell med én rad per konto og prosjekt. Da kan tall bli duplisert.</p></div>
        <pre><code>{safeJoin}</code></pre>
      </section>

      <section class="lesson" id="sider">
        <div class="lesson-title"><span>06</span><div><p>Rapporter</p><h2>Markdown-sider og navngitte queries</h2></div></div>
        <p>En fil i <code>pages/</code> blir en rute. <code>pages/kontogruppering.md</code> blir for eksempel <code>/kontogruppering</code>.</p>

        <h3>Frontmatter styrer siden</h3>
        <div class="property-grid">
          <div><code>title</code><span>Navn og sidetittel</span></div><div><code>full_width</code><span>Lar rapporten bruke hele bredden</span></div>
          <div><code>sidebar</code><span>Viser eller skjuler sidepanelet</span></div><div><code>hide_toc</code><span>Skjuler automatisk innholdsfortegnelse</span></div>
        </div>

        <h3>Query-resultatet blir en variabel</h3>
        <pre><code>{pageQuery}</code></pre>
        <p>Navnet etter <code>sql</code>, her <code>kontogruppering_data</code>, blir en variabel på siden. Den sendes inn i Svelte-komponenten med <code>rows={'{kontogruppering_data}'}</code>.</p>

        <h3>Evidence sine standardkomponenter</h3>
        <p>Prosjektet har tilgang til komponentene fra <code>@evidence-dev/core-components</code>. En enkel side kan bruke blant annet <code>DataTable</code>, verdikort, diagrammer og input-komponenter uten å lage egen Svelte-kode. De egenutviklede komponentene brukes når layout eller interaksjon er mer spesialisert.</p>
      </section>

      <section class="lesson" id="svelte">
        <div class="lesson-title"><span>07</span><div><p>Brukerflate</p><h2>Hvordan Svelte-komponentene arbeider</h2></div></div>
        <p>Svelte-komponentene ligger i <code>components/</code>. Evidence gjør dem automatisk tilgjengelige i sidene med filnavnet som komponentnavn.</p>
        <pre><code>{componentProps}</code></pre>

        <div class="concept-grid">
          <article><code>export let</code><strong>Input til komponenten</strong><p>Data eller innstillinger som sendes fra Evidence-siden.</p></article>
          <article><code>$:</code><strong>Reaktiv beregning</strong><p>Kjøres på nytt når en av verdiene den bruker endres.</p></article>
          <article><code>{'{#each}'}</code><strong>Gjenta elementer</strong><p>Brukes til kort, tabellrader og kontrollresultater.</p></article>
          <article><code>on:click</code><strong>Brukerhandling</strong><p>Endrer periode, finansiering, filtrering eller ekspanderte rader.</p></article>
        </div>

        <h3>Komponentansvar i prosjektet</h3>
        <div class="responsibility-list">
          <div><strong>ExecutiveDashboard.svelte</strong><span>Datamodus, periodevalg, finansieringspaneler, opplasting og sammenslåing av fasit og live-data.</span></div>
          <div><strong>MetricCard.svelte</strong><span>Formatering av ett KPI-kort, status, fremdrift og «Vis grunnlag».</span></div>
          <div><strong>KontogrupperingReport.svelte</strong><span>Filtre, hierarki, rapporttabell, valideringsstatus og Excel-eksport.</span></div>
        </div>
      </section>

      <section class="lesson" id="spor">
        <div class="lesson-title"><span>08</span><div><p>Data lineage</p><h2>Følg ett tall gjennom systemet</h2></div></div>
        <h3>Eksempel A: kontogrupperingens hovedbok</h3>
        <ol class="trace">
          <li><b>1</b><div><strong>Excel</strong><p>En rapportlinje leses fra «Kontogruppering med tall».</p></div></li>
          <li><b>2</b><div><strong>Python</strong><p><code>grouped_finance_rows()</code> normaliserer radtype, kontogruppe og tallkolonner.</p></div></li>
          <li><b>3</b><div><strong>Parquet og DuckDB</strong><p>Raden lagres i <code>grouped_finance_rows</code>.</p></div></li>
          <li><b>4</b><div><strong>Source SQL</strong><p><code>grouped_finance_rows.sql</code> eksponerer tabellen.</p></div></li>
          <li><b>5</b><div><strong>Page SQL</strong><p>Siden sorterer radene etter finansiering og Excel-rad.</p></div></li>
          <li><b>6</b><div><strong>Svelte</strong><p>Komponenten filtrerer, formaterer og viser raden.</p></div></li>
        </ol>

        <h3>Eksempel B: KPI-en 154301 ADK</h3>
        <ol class="trace accent-trace">
          <li><b>1</b><div><strong>Kontoutvalg fra Excel</strong><p><code>finance_rows</code> angir hvilke kontoer som inngår i ADK.</p></div></li>
          <li><b>2</b><div><strong>Hovedbok fra Parquet</strong><p>SQL filtrerer <code>dim_4 = 154301</code>, periode og konto.</p></div></li>
          <li><b>3</b><div><strong>Beløp normaliseres</strong><p>Råbeløp summeres og deles på 1 000.</p></div></li>
          <li><b>4</b><div><strong>Periodebudsjett fra Excel</strong><p>Månedskolonnene i <code>finance_rows</code> summeres for valgt periode.</p></div></li>
          <li><b>5</b><div><strong>Status beregnes</strong><p>Hovedbok divideres på periodebudsjett og klassifiseres grønn, gul eller rød.</p></div></li>
          <li><b>6</b><div><strong>MetricCard</strong><p>Viser total, budsjett, gjenstående og drilldown.</p></div></li>
        </ol>
      </section>

      <section class="lesson" id="oppskrifter">
        <div class="lesson-title"><span>09</span><div><p>Gjør det selv</p><h2>Praktiske oppskrifter</h2></div></div>

        <details open><summary>Oppdater rapporten med nye Excel-filer</summary><div class="details-body"><ol><li>Legg fasitfilene i <code>Fasit/</code> og operative uttrekk i <code>data-fra-økonomi/</code>.</li><li>Kontroller at navn og ark samsvarer med konstantene i <code>prepare_evidence_data.py</code>.</li><li>Kjør <code>npm run refresh:task2</code>.</li><li>Les alle merknader fra valideringen.</li><li>Åpne rapportene og kontroller totaler og metadata.</li></ol><p>Hvis Excel-strukturen er endret, må parseren oppdateres før dataene kan stoles på.</p></div></details>

        <details><summary>Lag en ny Evidence-side</summary><div class="details-body"><p>Opprett en Markdown-fil under <code>pages/</code>. Filnavnet bestemmer URL-en.</p><pre><code>{addPage}</code></pre><p>Start utviklingsserveren. Evidence oppdager siden automatisk.</p></div></details>

        <details><summary>Legg til en ny gjenbrukbar datakilde</summary><div class="details-body"><ol><li>Lag <code>sources/regnskap/min_kilde.sql</code>.</li><li>Sørg for at spørringen returnerer unike og forståelige kolonnenavn.</li><li>Kjør <code>npm run sources:strict</code>.</li><li>Bruk <code>from min_kilde</code> i en side-query.</li></ol><p>Filnavnet blir navnet på Evidence-kilden.</p></div></details>

        <details><summary>Legg til en ny KPI på en trygg måte</summary><div class="details-body"><ol><li>Skriv KPI-definisjonen i vanlig språk: finansiering, periode, kontoer, nevner og enhet.</li><li>Lag en SQL-kilde som returnerer både total og kontodetaljer.</li><li>Avstem resultatet mot Excel konto for konto.</li><li>Lag en side-query som beregner status og gjenstående budsjett.</li><li>Send raden til <code>ExecutiveDashboard</code> og <code>MetricCard</code>.</li><li>Test at kortets total er lik summen i «Vis grunnlag».</li></ol></div></details>

        <details><summary>Lag en egen Svelte-komponent</summary><div class="details-body"><ol><li>Lag <code>components/MinRapport.svelte</code>.</li><li>Definer inputs med <code>export let</code>.</li><li>Hold økonomiberegninger i SQL; bruk komponenten til filtrering, formatering og interaksjon.</li><li>Bruk komponenten som <code>&lt;MinRapport rows={'{query_name}'} /&gt;</code> i en side.</li><li>Kontroller tomme data, nullverdier, lange tekster og mobilbredde.</li></ol></div></details>
      </section>

      <section class="lesson" id="testing">
        <div class="lesson-title"><span>10</span><div><p>Kvalitet</p><h2>Testing og feilsøking</h2></div></div>
        <p>Et vellykket bygg betyr at syntaksen fungerer. Det betyr ikke automatisk at økonomitallene er riktige.</p>
        <div class="test-pyramid">
          <div><span>Faglig kontroll</span><strong>Betyr KPI-en det vi sier?</strong><small>Periode, kontoer, finansiering og nevner</small></div>
          <div><span>Dataavstemming</span><strong>Matcher totaler og detaljer?</strong><small>Excel mot Parquet, før og etter joins</small></div>
          <div><span>Strukturtest</span><strong>Finnes alle tabeller og kolonner?</strong><small>Filer, skjema, datatyper og radtall</small></div>
          <div><span>Byggtest</span><strong>Kan appen genereres?</strong><small>Sources, queries, Svelte og statisk bygg</small></div>
        </div>

        <h3>Kontroller en SQL-join</h3>
        <pre><code>{validationSql}</code></pre>
        <h3>Anbefalt feilsøkingsrekkefølge</h3>
        <pre><code>{debugOrder}</code></pre>

        <div class="check-grid">
          <article><strong>Null eller mangler?</strong><p>Et manglende budsjett må ikke automatisk bli et godkjent nullbudsjett.</p></article>
          <article><strong>Samme periode?</strong><p>Hovedbok og budsjett må ha samme cutoff, eller avviket må vises tydelig.</p></article>
          <article><strong>Samme korn?</strong><p>Tell unike nøkler før en join. Flere rader per nøkkel kan duplisere beløp.</p></article>
          <article><strong>Samme enhet?</strong><p>Kontroller når råbeløp deles på 1 000, og hold prosentfelt adskilt.</p></article>
        </div>
      </section>

      <section class="lesson" id="fallgruver">
        <div class="lesson-title"><span>11</span><div><p>Prosjektets lærdommer</p><h2>Fallgruver du bør kjenne</h2></div></div>
        <div class="risk-table">
          <div class="risk-head"><span>Fallgruve</span><span>Hvorfor den oppstår</span><span>Hvordan den forebygges</span></div>
          <div><strong>Duplisert budsjett</strong><span>Join mellom konto og konto + prosjekt</span><span>Aggreger begge sider til samme korn</span></div>
          <div><strong>«Live» snapshot</strong><span>Lokal Parquet-fil uten datodokumentasjon</span><span>Vis snapshot-ID og uttrekkstidspunkt</span></div>
          <div><strong>Blandede perioder</strong><span>Historisk brukte 154345 april mens andre brukte mars</span><span>Alle kort følger nå eksplisitt valgt rapportperiode</span></div>
          <div><strong>Hardkodede Excel-rader</strong><span>Kontoer velges med radintervaller</span><span>Bruk stabile nøkler og kontroller kontolister</span></div>
          <div><strong>Null skjuler datamangel</strong><span><code>coalesce</code> brukes for tidlig</span><span>Behold null til datastatus er avgjort</span></div>
          <div><strong>Feil drilldown</strong><span>Total og detalj bruker ulike filtre</span><span>Bygg begge fra samme filtrerte datasett</span></div>
          <div><strong>Absolutte filstier</strong><span>SQL peker på én brukers hjemmemappe</span><span>Bruk prosjekt-relative eller konfigurerte stier</span></div>
        </div>
      </section>

      <section class="lesson final-lesson" id="ordliste">
        <div class="lesson-title"><span>12</span><div><p>Oppsummering</p><h2>Ordliste og øvelser</h2></div></div>
        <div class="glossary">
          <div><strong>Evidence source</strong><p>Et navngitt resultat fra en SQL-fil under <code>sources/</code>.</p></div>
          <div><strong>Page query</strong><p>En navngitt SQL-blokk i en Markdown-side.</p></div>
          <div><strong>DuckDB</strong><p>En lokal analytisk database som kan lese Parquet direkte.</p></div>
          <div><strong>Parquet</strong><p>Et komprimert, kolonneorientert filformat for tabulære data.</p></div>
          <div><strong>Korn</strong><p>Hva én rad i et datasett representerer.</p></div>
          <div><strong>Prop</strong><p>En verdi som sendes inn i en Svelte-komponent.</p></div>
          <div><strong>Reaktiv verdi</strong><p>En Svelte-beregning som oppdateres når avhengighetene endres.</p></div>
          <div><strong>Statisk bygg</strong><p>HTML, CSS og JavaScript som kan publiseres uten en kjørende analyseserver.</p></div>
        </div>

        <h3>Øvelser for en ny utvikler</h3>
        <ol class="exercises">
          <li><span>15 min</span><div><strong>Finn data lineage</strong><p>Følg kolonnen <code>hovedbok_tusen</code> fra Excel til kontogrupperingstabellen.</p></div></li>
          <li><span>20 min</span><div><strong>Lag en enkel side</strong><p>Vis antall rapportlinjer per finansiering med en navngitt page query og <code>DataTable</code>.</p></div></li>
          <li><span>30 min</span><div><strong>Kontroller én KPI</strong><p>Beregn 154301 reisekostnader og sammenlign totalen med Excel-fasiten.</p></div></li>
          <li><span>45 min</span><div><strong>Reproduser join-feilen</strong><p>Vis budsjett før og etter kobling mot prosjektfordelt hovedbok, og forklar hvorfor summen endres.</p></div></li>
          <li><span>60 min</span><div><strong>Lag en regresjonstest</strong><p>Skriv en kontroll som feiler dersom budsjett endres gjennom en join.</p></div></li>
        </ol>

        <div class="completion"><strong>Når du forstår denne siden</strong><p>skal du kunne finne en datakilde, følge ett tall til brukerflaten, endre en rapport, bygge prosjektet og kontrollere at økonomilogikken fortsatt stemmer.</p></div>
      </section>
    </main>
  </div>
</div>

<style>
  :global(html) { scroll-behavior: smooth; }
  :global(html), :global(body) { overflow-y: auto !important; }
  :global(body) { background: #eef2f4 !important; }
  :global(#evidence-main-article > h1.title) { display: none !important; }
  :global(#evidence-main-article) { width: 100%; max-width: none; }
  .tutorial-shell { width: 100%; max-width: 1540px; margin: 0 auto; padding: 8px 4px 64px; color: #1c2d39; box-sizing: border-box; }
  .tutorial-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 32px; min-height: 250px; padding: 42px 46px; color: white; background: #14344a; border-bottom: 5px solid #df6b4f; }
  .header-copy { max-width: 860px; }
  .eyebrow { color: #72d2c4; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
  .tutorial-header h1 { margin: 9px 0 12px; color: white !important; font-size: 43px; line-height: 1.05; letter-spacing: 0; }
  .tutorial-header p { max-width: 740px; margin: 0; color: #c8d8e2; font-size: 16px; line-height: 1.5; }
  .header-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 22px; }
  .header-meta span { padding: 6px 9px; border: 1px solid #557186; border-radius: 4px; color: #d7e4eb; font-size: 10px; font-weight: 700; }
  .tutorial-header nav { display: flex; flex-wrap: wrap; gap: 8px; }
  .tutorial-header a { padding: 9px 12px; border: 1px solid #607c8f; border-radius: 5px; color: white; font-size: 11px; font-weight: 750; text-decoration: none; }
  .tutorial-header a:hover { background: #214a63; }
  .tutorial-layout { display: grid; grid-template-columns: 230px minmax(0, 1fr); align-items: start; }
  .chapter-nav { position: sticky; top: 16px; display: grid; gap: 2px; padding: 24px 16px; background: #183b50; }
  .chapter-nav > span { margin: 0 8px 10px; color: #8facbd; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; }
  .chapter-nav a { display: flex; gap: 9px; align-items: center; padding: 8px; border-radius: 4px; color: #d2dfe6; font-size: 10px; text-decoration: none; }
  .chapter-nav a:hover { color: white; background: #254d64; }
  .chapter-nav b { color: #72d2c4; font-size: 9px; }
  .tutorial-content { min-width: 0; }
  .lesson { padding: 46px 54px; background: white; border-right: 1px solid #d9e1e5; border-bottom: 1px solid #d9e1e5; }
  .lesson.intro { border-top: 1px solid #d9e1e5; }
  .lesson-title { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
  .lesson-title > span { display: grid; place-items: center; flex: 0 0 34px; width: 34px; height: 34px; border-radius: 4px; color: #176e64; background: #e1f1ee; font-size: 10px; font-weight: 850; }
  .lesson-title p { margin: 0 0 2px; color: #71818d; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
  .lesson h2 { margin: 0; color: #193449 !important; font-size: 27px; letter-spacing: 0; }
  .lesson h3 { margin: 31px 0 12px; color: #234258 !important; font-size: 17px; letter-spacing: 0; }
  .lesson h4 { margin: 0 0 8px; color: #29475a; font-size: 13px; }
  .lesson > p, .details-body > p { color: #526673; font-size: 13px; line-height: 1.7; }
  .lesson .lead { max-width: 900px; color: #344e5e; font-size: 16px; line-height: 1.65; }
  .lesson ul, .lesson ol { color: #526673; font-size: 12px; line-height: 1.65; }
  .lesson li + li { margin-top: 4px; }
  code { padding: 1px 4px; border-radius: 3px; background: #edf1f3; color: #274b5e; font-size: .9em; }
  pre { overflow-x: auto; margin: 15px 0 22px; padding: 18px 20px; border-left: 4px solid #359585; background: #182a35; color: #e2ebef; font-size: 11px; line-height: 1.6; tab-size: 2; }
  pre code { padding: 0; background: transparent; color: inherit; font: inherit; }
  .concept-flow, .data-contract { display: grid; grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr auto 1fr; align-items: stretch; gap: 9px; margin: 24px 0; }
  .concept-flow div, .data-contract div { position: relative; display: grid; align-content: center; gap: 5px; min-width: 0; min-height: 96px; padding: 15px; border: 1px solid #d6e0e4; border-top: 4px solid #318d80; background: #f8fafb; }
  .concept-flow div > span { position: absolute; top: 8px; right: 9px; color: #4b9b90; font-size: 9px; font-weight: 850; }
  .concept-flow strong, .data-contract strong { overflow-wrap: anywhere; color: #284658; font-size: 11px; }
  .concept-flow small, .data-contract small { color: #73828d; font-size: 9px; line-height: 1.4; }
  .concept-flow i, .data-contract i { align-self: center; color: #77909e; font-style: normal; }
  .callout { display: grid; gap: 4px; margin: 22px 0; padding: 15px 17px; border-left: 4px solid #2e8b7f; background: #eef7f5; }
  .callout strong { color: #28675f; font-size: 12px; }
  .callout p { margin: 0; color: #526f6a; font-size: 11px; line-height: 1.5; }
  .callout.warning { border-left-color: #b8792d; background: #fff7e9; }.callout.warning strong { color: #80541f; }.callout.warning p { color: #745e40; }
  .callout.danger { border-left-color: #bd503a; background: #fceeea; }.callout.danger strong { color: #8e3c2c; }.callout.danger p { color: #765248; }
  .two-column, .layer-compare { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .two-column > div, .layer-compare article { padding: 18px 20px; border-top: 3px solid #318d80; background: #f6f9fa; }
  .two-column > div:last-child, .layer-compare article:last-child { border-top-color: #557fa4; }
  .folder-table, .risk-table { display: grid; margin-top: 18px; border-top: 1px solid #d9e2e6; border-left: 1px solid #d9e2e6; }
  .folder-table > div { display: grid; grid-template-columns: 1.2fr 1fr 1.5fr; }
  .folder-table span, .folder-table code, .risk-table span, .risk-table strong { padding: 10px 12px; border-right: 1px solid #d9e2e6; border-bottom: 1px solid #d9e2e6; font-size: 10px; }
  .folder-table .table-head, .risk-table .risk-head { color: #e7eff3; background: #23475d; font-weight: 800; }
  .folder-table .table-head span, .risk-table .risk-head span { border-color: #3c5e72; }
  .folder-table code { border-radius: 0; background: #f2f6f7; }
  .timeline { display: grid; }
  .timeline article { position: relative; display: flex; gap: 16px; padding: 0 0 24px; }
  .timeline article:not(:last-child)::before { content: ''; position: absolute; left: 14px; top: 29px; bottom: 0; border-left: 2px solid #cbd9de; }
  .timeline b { z-index: 1; display: grid; place-items: center; flex: 0 0 30px; height: 30px; border-radius: 50%; color: white; background: #357e76; font-size: 10px; }
  .timeline strong { color: #2a4759; font-size: 12px; }.timeline p { margin: 3px 0 0; color: #687b87; font-size: 11px; line-height: 1.5; }
  .data-contract { grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr; }
  .data-contract div:nth-of-type(2) { border-top-color: #4e7da4; }.data-contract div:nth-of-type(3) { border-top-color: #7b659b; }.data-contract div:nth-of-type(4) { border-top-color: #aa6c2b; }
  .data-contract div > span, .layer-compare article > span { color: #72838e; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }
  .layer-compare article h3 { margin: 6px 0 9px; font-size: 14px; }
  .property-grid, .concept-grid, .check-grid, .glossary { display: grid; grid-template-columns: repeat(2, 1fr); border-top: 1px solid #dbe3e7; border-left: 1px solid #dbe3e7; }
  .property-grid > div { display: grid; grid-template-columns: 130px 1fr; border-right: 1px solid #dbe3e7; border-bottom: 1px solid #dbe3e7; }
  .property-grid code, .property-grid span { padding: 11px; }.property-grid code { border-radius: 0; }
  .property-grid span { color: #667984; font-size: 10px; }
  .concept-grid article, .check-grid article { padding: 17px; border-right: 1px solid #dbe3e7; border-bottom: 1px solid #dbe3e7; }
  .concept-grid strong, .check-grid strong { display: block; margin-top: 7px; color: #29485a; font-size: 12px; }
  .concept-grid p, .check-grid p { margin: 4px 0 0; color: #6e7f89; font-size: 10px; line-height: 1.5; }
  .responsibility-list { display: grid; border-top: 1px solid #dbe3e7; }
  .responsibility-list div { display: grid; grid-template-columns: minmax(210px, .8fr) 2fr; gap: 20px; padding: 12px 0; border-bottom: 1px solid #dbe3e7; }
  .responsibility-list strong { color: #2c4b5e; font-size: 11px; }.responsibility-list span { color: #697c87; font-size: 11px; }
  .trace { display: grid; grid-template-columns: repeat(6, 1fr); gap: 0; padding: 0 !important; list-style: none; }
  .trace li { position: relative; display: grid; grid-template-rows: auto 1fr; gap: 10px; margin: 0 !important; padding: 0 14px 16px 0; }
  .trace li:not(:last-child)::after { content: ''; position: absolute; top: 13px; left: 27px; right: 0; border-top: 2px solid #bfd5d0; }
  .trace b { z-index: 1; display: grid; place-items: center; width: 27px; height: 27px; border-radius: 50%; color: white; background: #318d80; font-size: 9px; }
  .trace strong { color: #29485a; font-size: 10px; }.trace p { margin: 4px 0 0; color: #70808a; font-size: 9px; line-height: 1.45; }
  .accent-trace b { background: #4f789d; }.accent-trace li:not(:last-child)::after { border-color: #c6d4e0; }
  details { margin-bottom: 9px; border: 1px solid #d8e1e5; background: #f9fbfb; }
  summary { padding: 13px 16px; color: #29495b; font-size: 12px; font-weight: 750; cursor: pointer; }
  .details-body { padding: 2px 18px 17px; border-top: 1px solid #e0e7ea; }
  .test-pyramid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; align-items: end; margin: 20px 0 28px; }
  .test-pyramid div { display: grid; align-content: center; gap: 5px; padding: 16px; color: white; background: #2b756d; }
  .test-pyramid div:nth-child(2) { min-height: 100px; background: #356c84; }.test-pyramid div:nth-child(3) { min-height: 120px; background: #526a8d; }.test-pyramid div:nth-child(4) { min-height: 140px; background: #735f82; }
  .test-pyramid span { font-size: 9px; text-transform: uppercase; }.test-pyramid strong { font-size: 11px; }.test-pyramid small { color: #d8e4e8; font-size: 9px; line-height: 1.4; }
  .risk-table > div { display: grid; grid-template-columns: 1fr 1.4fr 1.4fr; }
  .risk-table strong { color: #a34532; background: #fcf1ee; }.risk-table span { color: #617580; }
  .glossary > div { padding: 15px 17px; border-right: 1px solid #dbe3e7; border-bottom: 1px solid #dbe3e7; }
  .glossary strong { color: #2b4b5e; font-size: 11px; }.glossary p { margin: 4px 0 0; color: #6d7e88; font-size: 10px; line-height: 1.45; }
  .exercises { display: grid; padding: 0 !important; list-style: none; border-top: 1px solid #dbe3e7; }
  .exercises li { display: grid; grid-template-columns: 70px 1fr; gap: 16px; margin: 0 !important; padding: 13px 0; border-bottom: 1px solid #dbe3e7; }
  .exercises li > span { color: #318478; font-size: 10px; font-weight: 800; }.exercises strong { color: #29495b; font-size: 11px; }.exercises p { margin: 3px 0 0; color: #6d7f89; font-size: 10px; }
  .completion { display: grid; gap: 6px; margin-top: 28px; padding: 23px; border-left: 5px solid #df6b4f; background: #16394e; }
  .completion strong { color: white; font-size: 15px; }.completion p { max-width: 760px; margin: 0; color: #c6d7df; font-size: 11px; line-height: 1.5; }.completion a { width: max-content; margin-top: 5px; color: #7dd5c8; font-size: 11px; font-weight: 750; }
  @media (max-width: 1100px) {
    .tutorial-layout { grid-template-columns: 1fr; }.chapter-nav { position: static; grid-template-columns: repeat(4, 1fr); }.chapter-nav > span { grid-column: 1 / -1; }
    .concept-flow { grid-template-columns: repeat(3, 1fr); }.concept-flow i { display: none; }
    .trace { grid-template-columns: repeat(3, 1fr); gap: 16px; }.trace li::after { display: none; }
    .test-pyramid { grid-template-columns: 1fr 1fr; }.test-pyramid div { min-height: 100px !important; }
  }
  @media (max-width: 720px) {
    .tutorial-shell { padding-left: 0; padding-right: 0; }.tutorial-header { align-items: flex-start; flex-direction: column; min-height: 0; padding: 30px 20px; }.tutorial-header h1 { font-size: 32px; }
    .chapter-nav { grid-template-columns: 1fr 1fr; }.lesson { padding: 34px 20px; }
    .concept-flow, .data-contract, .two-column, .layer-compare, .concept-grid, .check-grid, .glossary, .test-pyramid, .trace { grid-template-columns: 1fr; }
    .concept-flow i, .data-contract i { display: none; }.folder-table { overflow-x: auto; }.folder-table > div { min-width: 650px; }
    .responsibility-list div { grid-template-columns: 1fr; gap: 4px; }.property-grid { grid-template-columns: 1fr; }
    .risk-table { overflow-x: auto; }.risk-table > div { min-width: 720px; }
  }
</style>
