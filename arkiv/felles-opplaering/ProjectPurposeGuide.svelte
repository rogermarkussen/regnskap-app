<script>
  import { onMount } from 'svelte';
  import { showQueries } from '@evidence-dev/component-utilities/stores';

  onMount(() => showQueries.set(false));
</script>

<svelte:head>
  <title>Forstå prosjektet | Regnskapsrapportering</title>
</svelte:head>

<div class="purpose-shell">
  <header class="purpose-header">
    <div>
      <span class="eyebrow">Prosjektintroduksjon uten tekniske forkunnskaper</span>
      <h1>Hva er dette prosjektet, og hvorfor finnes det?</h1>
      <p>En veiledning til oppgaven, leveransene, kontrollene, problemene og veien videre.</p>
    </div>
    <nav aria-label="Prosjektsider">
      <a href="/">Åpne KPI-dashboard</a>
    </nav>
  </header>

  <section class="answer-first">
    <div class="answer-copy">
      <span>Svaret på to minutter</span>
      <h2>Prosjektet skal gjøre manuell økonomirapportering etterprøvbar</h2>
      <p>Økonomi leverer Excel-rapporter med hovedbok, budsjett og kontogrupper. Prosjektet forsøker å hente de samme tallene fra datakildene, kontrollere at de stemmer, og vise dem i et dashboard som er enklere å oppdatere og forstå.</p>
    </div>
    <div class="plain-flow" role="img" aria-label="Fra manuell Excel-rapport til kontrollert dashboard">
      <div><span>Utgangspunkt</span><strong>Manuelle Excel-rapporter</strong><small>Mye arbeid og risiko for småfeil</small></div>
      <i>→</i>
      <div><span>Prosjektets jobb</span><strong>Hente, beregne og kontrollere</strong><small>Samme regler skal gi samme tall</small></div>
      <i>→</i>
      <div><span>Målet</span><strong>Pålitelig økonomioversikt</strong><small>Forklarbare tall med kjent datadato</small></div>
    </div>
  </section>

  <section class="guide-section" id="oppgaven">
    <div class="section-title"><span>01</span><div><p>Bakgrunn</p><h2>Hvilket problem prøver vi å løse?</h2></div></div>
    <div class="problem-grid">
      <article><span class="problem-icon">1</span><div><strong>Rapporteringen er manuell</strong><p>Økonomi må sette sammen mange tall og kontrollere dem før Excel-filene kan sendes videre.</p></div></article>
      <article><span class="problem-icon">2</span><div><strong>Dataene kommer på ulike tidspunkt</strong><p>Noen perioder er ferdige, andre mangler eller kan fortsatt bli endret av DFØ.</p></div></article>
      <article><span class="problem-icon">3</span><div><strong>Forretningsreglene er ikke åpenbare</strong><p>Finansiering, konto, prosjekt og budsjett må kobles etter regler som i dag ligger spredt i Excel og kode.</p></div></article>
      <article><span class="problem-icon">4</span><div><strong>Tall må kunne forklares</strong><p>Et dashboard er ikke nyttig hvis ingen kan vise hvilke kontoer, perioder og bilag som ligger bak tallet.</p></div></article>
    </div>
    <div class="purpose-statement"><strong>Prosjektets egentlige leveranse</strong><p>Ikke bare et pent dashboard, men en sporbar kjede fra økonomikilden til hvert synlige tall.</p></div>
  </section>

  <section class="guide-section soft" id="grunnlaget">
    <div class="section-title"><span>02</span><div><p>Det vi mottok</p><h2>Hva betyr Excel-materialet fra Økonomi?</h2></div></div>
    <p class="section-intro">Filene beskriver tre finansieringsområder og én kontogrupperingsoppgave. De bruker budsjettversjon 2026B, og beløpene vises i tusen kroner.</p>

    <div class="finance-map">
      <article>
        <div class="finance-code">154301</div>
        <div><strong>Driftsutgifter</strong><p>Det største og mest komplette området. Rapporteres hovedsakelig for januar–mars.</p></div>
        <span class="state stable">Best datagrunnlag</span>
      </article>
      <article>
        <div class="finance-code">154345</div>
        <div><strong>Større utstyrsanskaffelser og vedlikehold</strong><p>Mangler hovedbok i januar–mars. April ble derfor tatt med i Excel.</p></div>
        <span class="state exception">Periodeunntak</span>
      </article>
      <article>
        <div class="finance-code">154322<br>045101</div>
        <div><strong>Nytt nødnett og innleide konsulenter</strong><p>045101 manglet tall i de første periodene. Mai var foreløpig da filene ble laget.</p></div>
        <span class="state provisional">Delvis foreløpig</span>
      </article>
      <article>
        <div class="finance-code">7114</div>
        <div><strong>Testlab-prosjekt</strong><p>Har hovedbok, men mangler budsjett. Kortet viser bare utvalgte driftskostnader.</p></div>
        <span class="state missing">Budsjett mangler</span>
      </article>
    </div>

    <div class="language-box">
      <h3>Fire begreper du må kjenne</h3>
      <div><strong>Hovedbok</strong><span>Det som faktisk er bokført.</span></div>
      <div><strong>Budsjett</strong><span>Planlagt beløp for perioden eller året.</span></div>
      <div><strong>Avvik</strong><span>Budsjett minus hovedbok. Viser hvor mye som gjenstår eller er overskredet.</span></div>
      <div><strong>Finansiering</strong><span>Koden som forteller hvilket finansieringsområde kostnaden tilhører.</span></div>
    </div>
  </section>

  <section class="guide-section" id="leveransene">
    <div class="section-title"><span>03</span><div><p>Resultater</p><h2>Hva er faktisk bygget?</h2></div></div>
    <div class="deliverable-flow" role="img" aria-label="Prosjektets tre leveranser">
      <article>
        <span class="deliverable-number">A</span>
        <div><strong>KPI-dashboard</strong><p>Ni nøkkeltall fordelt på tre finansieringspaneler, med periodevalg og kontodetaljer.</p><a href="/">Åpne dashboard</a></div>
      </article>
      <article>
        <span class="deliverable-number">B</span>
        <div><strong>Kontogrupperingsrapport</strong><p>Viser lønn, avskrivninger og andre driftskostnader for 154301 og alle finansieringer.</p><a href="/kontogruppering">Åpne kontogruppering</a></div>
      </article>
      <article>
        <span class="deliverable-number">C</span>
        <div><strong>Avstemmingsrapport</strong><p>Sammenligner Excel og lokale regnskapsdata konto for konto for å finne avvik.</p><span class="file-label">outputs/dashboard_kpi_reproduksjon_2026b.html</span></div>
      </article>
    </div>

    <h3>Støttearbeid som allerede er gjort</h3>
    <div class="work-done">
      <div><span>Ferdig</span><strong>Excel-filene er kartlagt</strong><p>Ark, perioder, kolonner, kontoer og kommentarer er identifisert.</p></div>
      <div><span>Ferdig</span><strong>Uttrekkslogikk er forbedret</strong><p>Flere småfeil i API-/datalogikken er funnet og rettet sammenlignet med utgangspunktet.</p></div>
      <div><span>Ferdig</span><strong>Dataene kan bygges lokalt</strong><p>Excel blir gjort om til tabeller som rapportene kan bruke.</p></div>
      <div><span>Ferdig</span><strong>Automatiske kontroller finnes</strong><p>Kontogrupperingen kontrolleres for struktur, totalsummer og regnskapsidentiteter.</p></div>
      <div><span>Ferdig</span><strong>Prosjektarkitektur er dokumentert</strong><p>Datakilder, mapper og avhengigheter er bevart i den interne dokumentasjonen.</p></div>
      <div><span>Delvis</span><strong>Workflow-/fakturastatus</strong><p>Mulige veier er identifisert, men datatilgangen og koblingen er ikke løst.</p></div>
    </div>
  </section>

  <section class="guide-section result-band" id="kontrollene">
    <div class="section-title light"><span>04</span><div><p>Hva vet vi?</p><h2>Kontrollresultatet er svært godt</h2></div></div>
    <div class="score-row">
      <div><strong>172 / 172</strong><span>budsjettkontorader matcher</span></div>
      <div><strong>171 / 172</strong><span>hovedbokskontorader matcher</span></div>
      <div><strong>518 / 518</strong><span>månedlige budsjettceller matcher</span></div>
      <div><strong>4 500 kr</strong><span>eneste kjente hovedbokavvik</span></div>
    </div>
    <div class="interpretation">
      <strong>Hva betyr dette?</strong>
      <p>Vi klarer nesten fullstendig å gjenskape Excel-tallene fra regnskapsdataene. Det gir sterk støtte for at uttrekk, kontofilter og summering i kontrollrapporten i hovedsak er riktig.</p>
      <p>Det beviser likevel ikke at selve KPI-dashboardet er feilfritt. Dashboardet har et eget beregningsløp, og der er det funnet en konkret summeringsfeil.</p>
    </div>
  </section>

  <section class="guide-section" id="status">
    <div class="section-title"><span>05</span><div><p>Nå-situasjonen</p><h2>Hva kan vi stole på, og hva kan vi ikke stole på?</h2></div></div>
    <div class="traffic-table">
      <div class="traffic-head"><span>Status</span><span>Område</span><span>Forklaring</span></div>
      <div><i class="green"></i><strong>Excel mot kontrollrapport</strong><p>Nesten full match. Ett kjent avvik på konto 7400.</p></div>
      <div><i class="green"></i><strong>Kontogrupperingens beregning</strong><p>Hovedbok, budsjett og kontant beregnes fra operative uttrekk og avstemmes mot fasit.</p></div>
      <div><i class="green"></i><strong>KPI-definisjoner</strong><p>Lønnsandel, Testlab-avgrensning, perioden for 154345 og budsjettmappingen er godkjent og versjonert.</p></div>
      <div><i class="yellow"></i><strong>Datakildens ferskhet</strong><p>Dashboardet viser datasett-ID og dekning, men kilden mangler fortsatt faktisk uttrekkstidspunkt og periodestatus.</p></div>
      <div><i class="green"></i><strong>Budsjett for 154322 + 045101</strong><p>Den tidligere dupliseringen er rettet. Dashboardet viser 22 809,750 for januar–mars, kontrollert av en regresjonstest.</p></div>
      <div><i class="yellow"></i><strong>Én samlet refresh</strong><p>Beregning og kontroll bruker nå samme datamappe, men selve uttrekket fra kildesystemet må kobles til produksjonsjobben.</p></div>
      <div><i class="grey"></i><strong>Workflow-/fakturastatus</strong><p>Ikke ferdig. Vi har ennå ikke en stabil kilde til statusen på en faktura.</p></div>
    </div>

    <div class="most-important">
      <span>Viktigste konklusjon</span>
      <strong>Beregningene og KPI-reglene er kontrollert og versjonert.</strong>
      <p>Før produksjonssetting må dataleveransen fortsatt gi faktisk uttrekkstidspunkt og periodestatus, og godkjennerens navn må registreres.</p>
    </div>
  </section>

  <section class="guide-section soft" id="brukerreisen">
    <div class="section-title"><span>06</span><div><p>Hvordan bruke løsningen</p><h2>Hva er de ulike sidene til?</h2></div></div>
    <div class="page-tour">
      <article><span>1</span><div><strong>KPI-dashboardet svarer på «hvordan ligger vi an?»</strong><p>Brukes til en rask oversikt over hovedbok, periodebudsjett, gjenstående beløp og lønnsandel.</p><small>Budsjettet for 154322/045101 er kontrollert mot forventet periodesum.</small></div></article>
      <article><span>2</span><div><strong>Kontogrupperingen svarer på «hva består kostnadene av?»</strong><p>Brukes til å gå fra hovedgrupper til kontogrupper og kontoer, og sammenligne 154301 med alle finansieringer.</p></div></article>
      <article><span>3</span><div><strong>Valideringssiden svarer på «stemmer beregningen med fasiten?»</strong><p>Brukes av utviklere og økonomifaglige kontrollører for å sammenligne beregnede og mottatte tall.</p></div></article>
      <article><span>4</span><div><strong>Dokumentasjonen svarer på «hvor kommer dataene fra?»</strong><p>Den interne prosjektoversikten beskriver mapper, dataløp, avhengigheter og målbilde.</p></div></article>
    </div>
  </section>

  <section class="guide-section" id="veien-videre">
    <div class="section-title"><span>07</span><div><p>Handlingsplan</p><h2>Hva skal gjøres videre?</h2></div></div>
    <div class="roadmap">
      <article><span>Ferdig</span><div><strong>Stopp kjente feil</strong><ul><li>Budsjettdupliseringen for 154322/045101 er rettet.</li><li>KPI-totalen testes mot detaljsummen.</li><li>7114 vises med «Mangler budsjett».</li></ul></div></article>
      <article class="next"><span>Utført</span><div><strong>KPI-reglene er godkjent</strong><ul><li>154345 følger valgt periode.</li><li>Testlab viser alle kostnader.</li><li>Lønnsandel bruker totale kostnader som nevner.</li><li>Budsjettmappingen er versjonert.</li></ul></div></article>
      <article class="after"><span>Deretter</span><div><strong>Gjør dataløpet stabilt</strong><ul><li>Velg én datamappe som sannhetskilde.</li><li>La refresh oppdatere filene dashboardet faktisk leser.</li><li>Registrer uttrekkstidspunkt, snapshot-ID og periodestatus.</li><li>Fjern absolutte filstier.</li></ul></div></article>
      <article class="later"><span>Senere</span><div><strong>Utvid rapporteringen</strong><ul><li>Koble inn workflow-/fakturastatus når kilden er avklart.</li><li>Legg til bilagsdrilldown og bedre forklaringer.</li><li>Gjør publisering atomisk og produksjonssikker.</li></ul></div></article>
    </div>

    <h3>Konkrete arbeidspakker</h3>
    <div class="task-table">
      <div class="task-head"><span>Arbeidspakke</span><span>Resultat</span><span>Ferdig når</span></div>
      <div><strong>WP1: Korrekte KPI-er</strong><span>Riktige totaler, statuser og drilldowns</span><span>Alle KPI-er matcher godkjent fasit og detaljsum</span></div>
      <div><strong>WP2: Faglige regler</strong><span>Dokumentert periode, kontoer, nevner og finansiering</span><span>Økonomi har godkjent definisjonene</span></div>
      <div><strong>WP3: Ett dataløp</strong><span>Samme kilde for refresh, kontroll og dashboard</span><span>Én kommando bygger alt fra nytt uttrekk</span></div>
      <div><strong>WP4: Sporbarhet</strong><span>Kilde, tidspunkt og periodestatus på skjermen</span><span>Et tall kan spores tilbake til dataleveransen</span></div>
      <div><strong>WP5: Workflow-data</strong><span>Fakturastatus koblet til relevante transaksjoner</span><span>Kilde, nøkkel og oppdateringsfrekvens er stabile</span></div>
    </div>
  </section>

  <section class="guide-section definition-band" id="maalet">
    <div class="section-title light"><span>08</span><div><p>Ferdigdefinisjon</p><h2>Hvordan ser en ferdig løsning ut?</h2></div></div>
    <div class="success-grid">
      <div><span>✓</span><p>Én godkjent dataleveranse driver alle rapportene.</p></div>
      <div><span>✓</span><p>Dashboardet viser kilde, uttrekkstidspunkt og periodestatus.</p></div>
      <div><span>✓</span><p>Alle KPI-definisjoner er godkjent av Økonomi.</p></div>
      <div><span>✓</span><p>Totalsum og drilldown stemmer automatisk.</p></div>
      <div><span>✓</span><p>Manglende data skilles fra reelle nullverdier.</p></div>
      <div><span>✓</span><p>Publisering stopper dersom kontrollene feiler.</p></div>
      <div><span>✓</span><p>Et avvik kan spores til konto og helst bilag.</p></div>
      <div><span>✓</span><p>En ny person kan oppdatere løsningen etter en dokumentert oppskrift.</p></div>
    </div>
  </section>

  <section class="guide-section first-day" id="start">
    <div class="section-title"><span>09</span><div><p>Første arbeidsdag</p><h2>Anbefalt rekkefølge for en ny person</h2></div></div>
    <ol>
      <li><span>10 min</span><div><strong>Les denne prosjektintroduksjonen</strong><p>Forstå målet og hvilke deler som er ferdige eller usikre.</p></div></li>
      <li><span>15 min</span><div><strong>Åpne prosjektkartet</strong><p>Se hvilke datakilder og rapporter som faktisk er koblet sammen.</p></div></li>
      <li><span>20 min</span><div><strong>Se KPI-dashboard og kontogruppering</strong><p>Finn igjen 154301, 154345, 154322/045101 og prosjekt 7114.</p></div></li>
      <li><span>20 min</span><div><strong>Åpne HTML-avstemmingen</strong><p>Se hvorfor 171 av 172 hovedbokskontoer matcher, og finn konto 7400.</p></div></li>
      <li><span>30 min</span><div><strong>Gå til teknisk Evidence-guide</strong><p>Lær kode og database først etter at du forstår hva løsningen skal oppnå.</p></div></li>
    </ol>
    <div class="next-link"><strong>Klar for teknikken?</strong><p>Bruk valget «Teknisk Evidence-guide» øverst på siden når prosjektets hensikt og status er forstått.</p></div>
  </section>
</div>

<style>
  :global(html) { scroll-behavior: smooth; }
  .purpose-shell { width: calc(100% - 8px); max-width: 1532px; margin: 0 auto 64px; color: #1e3038; }
  .purpose-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 30px; padding: 40px 44px; color: white; background: #173c49; border-bottom: 5px solid #e06d4f; }
  .purpose-header > div { max-width: 900px; }
  .eyebrow { color: #78d5c7; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
  .purpose-header h1 { margin: 8px 0 10px; color: white !important; font-size: 39px; line-height: 1.08; letter-spacing: 0; }
  .purpose-header p { margin: 0; color: #c7d9df; font-size: 15px; }
  .purpose-header nav { display: flex; gap: 7px; flex-wrap: wrap; }
  .purpose-header a { padding: 9px 12px; border: 1px solid #66818c; border-radius: 5px; color: white; font-size: 10px; font-weight: 750; text-decoration: none; }
  .answer-first { display: grid; grid-template-columns: .9fr 1.5fr; gap: 36px; padding: 38px 44px; background: #fff; border: 1px solid #d5e0e2; border-top: 0; }
  .answer-copy > span { color: #d05c42; font-size: 9px; font-weight: 850; text-transform: uppercase; }
  .answer-copy h2 { margin: 7px 0 10px; color: #1c4350 !important; font-size: 24px; letter-spacing: 0; }
  .answer-copy p, .section-intro { margin: 0; color: #5a6e75; font-size: 12px; line-height: 1.65; }
  .plain-flow { display: grid; grid-template-columns: 1fr auto 1fr auto 1fr; align-items: stretch; gap: 9px; }
  .plain-flow div { display: grid; align-content: center; gap: 5px; padding: 15px; border: 1px solid #d6e1e3; border-top: 4px solid #2d8b7f; background: #f7faf9; }
  .plain-flow div:first-child { border-top-color: #d16a4e; }.plain-flow div:last-child { border-top-color: #497a9b; }
  .plain-flow span { color: #76868b; font-size: 8px; font-weight: 800; text-transform: uppercase; }.plain-flow strong { color: #294751; font-size: 11px; }.plain-flow small { color: #738287; font-size: 9px; line-height: 1.4; }.plain-flow i { align-self: center; color: #71858c; font-style: normal; }
  .guide-section { padding: 42px 44px; background: white; border: 1px solid #d5e0e2; border-top: 0; }
  .guide-section.soft { background: #f6f9f9; }
  .section-title { display: flex; align-items: center; gap: 13px; margin-bottom: 24px; }
  .section-title > span { display: grid; place-items: center; flex: 0 0 33px; height: 33px; border-radius: 4px; color: #176e64; background: #def0ed; font-size: 10px; font-weight: 850; }
  .section-title p { margin: 0 0 2px; color: #77878d; font-size: 8px; font-weight: 850; text-transform: uppercase; letter-spacing: .08em; }
  .section-title h2 { margin: 0; color: #1b3e4b !important; font-size: 25px; letter-spacing: 0; }
  .guide-section h3 { margin: 29px 0 13px; color: #244854 !important; font-size: 16px; letter-spacing: 0; }
  .problem-grid { display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid #d9e2e4; border-left: 1px solid #d9e2e4; }
  .problem-grid article { display: flex; gap: 13px; padding: 18px; border-right: 1px solid #d9e2e4; border-bottom: 1px solid #d9e2e4; }
  .problem-icon { display: grid; place-items: center; flex: 0 0 27px; height: 27px; border-radius: 50%; color: white; background: #4a7b91; font-size: 9px; font-weight: 850; }
  .problem-grid strong, .work-done strong { color: #294854; font-size: 12px; }.problem-grid p, .work-done p { margin: 4px 0 0; color: #6c7d82; font-size: 10px; line-height: 1.5; }
  .purpose-statement { display: grid; gap: 4px; margin-top: 16px; padding: 16px 18px; border-left: 4px solid #e06d4f; background: #173c49; }
  .purpose-statement strong { color: white; font-size: 12px; }.purpose-statement p { margin: 0; color: #c5d7dc; font-size: 11px; }
  .finance-map { display: grid; margin-top: 20px; border-top: 1px solid #d7e1e3; }
  .finance-map article { display: grid; grid-template-columns: 90px 1fr 130px; gap: 17px; align-items: center; padding: 15px 0; border-bottom: 1px solid #d7e1e3; }
  .finance-code { color: #1d6571; font-size: 14px; font-weight: 850; line-height: 1.3; }.finance-map strong { color: #2a4650; font-size: 12px; }.finance-map p { margin: 3px 0 0; color: #6b7d82; font-size: 10px; line-height: 1.45; }
  .state { justify-self: end; padding: 5px 7px; border-radius: 3px; font-size: 8px; font-weight: 800; text-transform: uppercase; }.stable { color: #24695d; background: #dff0eb; }.exception { color: #8c5d1e; background: #f8ead2; }.provisional { color: #8e533b; background: #f8e4dc; }.missing { color: #8d3e35; background: #f5dcda; }
  .language-box { display: grid; grid-template-columns: repeat(4, 1fr); margin-top: 22px; border: 1px solid #d6e0e2; background: white; }.language-box h3 { grid-column: 1 / -1; margin: 0 !important; padding: 14px 16px; border-bottom: 1px solid #d6e0e2; }.language-box > div { display: grid; gap: 4px; padding: 15px; border-right: 1px solid #d6e0e2; }.language-box > div:last-child { border-right: 0; }.language-box strong { color: #28505b; font-size: 10px; }.language-box span { color: #718186; font-size: 9px; line-height: 1.4; }
  .deliverable-flow { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid #d9e2e4; border-left: 1px solid #d9e2e4; }
  .deliverable-flow article { display: flex; gap: 13px; padding: 20px; border-right: 1px solid #d9e2e4; border-bottom: 1px solid #d9e2e4; }
  .deliverable-number { display: grid; place-items: center; flex: 0 0 29px; height: 29px; border-radius: 4px; color: white; background: #397e75; font-size: 10px; font-weight: 850; }.deliverable-flow strong { color: #284652; font-size: 12px; }.deliverable-flow p { min-height: 45px; margin: 4px 0 7px; color: #6b7c82; font-size: 10px; line-height: 1.45; }.deliverable-flow a { color: #197268; font-size: 9px; font-weight: 800; }.file-label { color: #6d7d82; font-family: monospace; font-size: 8px; overflow-wrap: anywhere; }
  .work-done { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid #d8e1e3; border-left: 1px solid #d8e1e3; }.work-done > div { padding: 16px; border-right: 1px solid #d8e1e3; border-bottom: 1px solid #d8e1e3; }.work-done > div > span { display: block; margin-bottom: 7px; color: #247265; font-size: 8px; font-weight: 850; text-transform: uppercase; }
  .result-band { color: white; background: #173d4c; border-color: #173d4c; }.section-title.light h2 { color: white !important; }.section-title.light p { color: #93b3bd; }.score-row { display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid #486a76; border-left: 1px solid #486a76; }.score-row div { display: grid; gap: 5px; padding: 19px; border-right: 1px solid #486a76; border-bottom: 1px solid #486a76; }.score-row strong { color: #84d7ca; font-size: 23px; }.score-row span { color: #c4d4d9; font-size: 9px; }.interpretation { display: grid; gap: 5px; margin-top: 18px; padding: 18px; border-left: 4px solid #e06d4f; background: #204b59; }.interpretation strong { font-size: 12px; }.interpretation p { margin: 0; color: #c5d6db; font-size: 10px; line-height: 1.55; }
  .traffic-table, .task-table { display: grid; border-top: 1px solid #d6e0e2; border-left: 1px solid #d6e0e2; }.traffic-table > div { display: grid; grid-template-columns: 60px 1fr 2fr; align-items: center; }.traffic-table span, .traffic-table strong, .traffic-table p, .task-table span, .task-table strong { margin: 0; padding: 11px 13px; border-right: 1px solid #d6e0e2; border-bottom: 1px solid #d6e0e2; font-size: 10px; }.traffic-head, .task-head { color: white; background: #264c59; font-weight: 800; }.traffic-table i { justify-self: center; width: 11px; height: 11px; border-radius: 50%; }.green { background: #309078; }.yellow { background: #d49a31; }.red { background: #c6503d; }.grey { background: #89989d; }.traffic-table strong { color: #2b4954; }.traffic-table p { color: #687b81; line-height: 1.45; }
  .most-important { display: grid; gap: 5px; margin-top: 18px; padding: 20px; border: 1px solid #e1b29f; background: #fff4ef; }.most-important span { color: #bd4f36; font-size: 8px; font-weight: 850; text-transform: uppercase; }.most-important strong { color: #7f3b2d; font-size: 14px; }.most-important p { margin: 0; color: #765d55; font-size: 10px; }
  .page-tour { display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid #d7e1e3; border-left: 1px solid #d7e1e3; }.page-tour article { display: flex; gap: 13px; padding: 18px; border-right: 1px solid #d7e1e3; border-bottom: 1px solid #d7e1e3; background: white; }.page-tour article > span { display: grid; place-items: center; flex: 0 0 27px; height: 27px; border-radius: 50%; color: white; background: #487c92; font-size: 9px; font-weight: 850; }.page-tour strong { color: #294954; font-size: 11px; }.page-tour p { margin: 4px 0; color: #6b7d82; font-size: 10px; line-height: 1.45; }.page-tour small { color: #b24f3a; font-size: 9px; }
  .roadmap { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }.roadmap article { border: 1px solid #d6e0e2; border-top: 4px solid #bd503a; }.roadmap article.next { border-top-color: #c8872d; }.roadmap article.after { border-top-color: #397b91; }.roadmap article.later { border-top-color: #348375; }.roadmap article > span { display: block; padding: 10px 13px; color: #75858a; background: #f1f5f5; font-size: 8px; font-weight: 850; text-transform: uppercase; }.roadmap article > div { padding: 14px; }.roadmap strong { color: #294954; font-size: 11px; }.roadmap ul { padding-left: 17px; color: #697b80; font-size: 9px; line-height: 1.5; }
  .task-table > div { display: grid; grid-template-columns: 1fr 1.4fr 1.5fr; }.task-table strong { color: #28505a; background: #f4f7f7; }.task-table span { color: #687b81; }.task-head span { color: white; border-color: #3e606a; }
  .definition-band { color: white; background: #1b4f4b; border-color: #1b4f4b; }.success-grid { display: grid; grid-template-columns: repeat(2, 1fr); border-top: 1px solid #4b7772; border-left: 1px solid #4b7772; }.success-grid div { display: flex; align-items: center; gap: 11px; padding: 14px; border-right: 1px solid #4b7772; border-bottom: 1px solid #4b7772; }.success-grid span { display: grid; place-items: center; flex: 0 0 22px; height: 22px; border-radius: 50%; color: #1b4f4b; background: #8bd8ca; font-size: 10px; font-weight: 900; }.success-grid p { margin: 0; color: #d3e4e1; font-size: 10px; }
  .first-day ol { padding: 0; list-style: none; border-top: 1px solid #d7e1e3; }.first-day li { display: grid; grid-template-columns: 75px 1fr; gap: 16px; padding: 13px 0; border-bottom: 1px solid #d7e1e3; }.first-day li > span { color: #27796d; font-size: 9px; font-weight: 850; }.first-day strong { color: #294954; font-size: 11px; }.first-day p { margin: 3px 0 0; color: #6a7c82; font-size: 10px; }.next-link { display: grid; gap: 4px; margin-top: 20px; padding: 18px; border-left: 4px solid #397e75; background: #edf6f4; }.next-link strong { color: #27695f; font-size: 12px; }.next-link p { margin: 0; color: #607872; font-size: 10px; }
  @media (max-width: 1050px) { .answer-first { grid-template-columns: 1fr; }.roadmap { grid-template-columns: 1fr 1fr; }.deliverable-flow, .work-done { grid-template-columns: 1fr 1fr; }.score-row { grid-template-columns: 1fr 1fr; } }
  @media (max-width: 720px) {
    .purpose-shell { width: 100%; }.purpose-header { align-items: flex-start; flex-direction: column; padding: 30px 20px; }.purpose-header h1 { font-size: 31px; }.answer-first, .guide-section { padding: 30px 20px; }
    .plain-flow, .language-box, .deliverable-flow, .work-done, .problem-grid, .page-tour, .roadmap, .success-grid, .score-row { grid-template-columns: 1fr; }.plain-flow i { display: none; }
    .finance-map article { grid-template-columns: 75px 1fr; }.finance-map .state { grid-column: 2; justify-self: start; }.language-box h3 { grid-column: 1; }.language-box > div { border-right: 0; border-bottom: 1px solid #d6e0e2; }
    .traffic-table, .task-table { overflow-x: auto; }.traffic-table > div { min-width: 700px; }.task-table > div { min-width: 720px; }
  }
</style>
