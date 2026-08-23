<script>
  import MetricCard from './MetricCard.svelte';

  export let fin154301Data = [];
  export let fin154345Data = [];
  export let fin154322Data = [];
  export let sourceMetadata = [];

  const asRows = (rows) => {
    if (!rows) return [];
    if (Array.isArray(rows)) return rows;
    return Array.from(rows);
  };

  const formatSourceDate = (value) => {
    if (!value) return 'Dato mangler';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('nb-NO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Europe/Oslo'
    });
  };

  $: fin154301Rows = asRows(fin154301Data);
  $: fin154345Rows = asRows(fin154345Data);
  $: fin154322Rows = asRows(fin154322Data);
  $: contextRow = fin154301Rows[0] ?? fin154345Rows[0] ?? fin154322Rows[0] ?? {};
  $: selectedSection = contextRow.section_label ?? 'Alle kostnadssteder';
  $: selectedPeriod = contextRow.period_label ?? 'Siste tilgjengelige periode';
  $: selectedYear = contextRow.period_year ?? '';
  $: source = asRows(sourceMetadata)[0] ?? {};
</script>

<div class="dashboard-shell">
  <header class="hero" aria-labelledby="dashboard-title">
    <div class="hero-mark" aria-hidden="true">
      <span></span><span></span><span></span>
    </div>
    <div class="hero-copy">
      <p class="eyebrow">Finansiell styring{selectedYear ? ` · ${selectedYear}` : ''}</p>
      <h1 id="dashboard-title">Økonomisk status</h1>
      <p class="hero-context">{selectedSection} · {selectedPeriod}</p>
    </div>
    <div class="freshness">
      <span>Oppdatert</span>
      <strong>{formatSourceDate(source.hovedbok_siste_transaksjonsdato)}</strong>
      <small>Siste bokførte transaksjon</small>
    </div>
  </header>

  <section class="filter-band" aria-label="Filter for dashbordet">
    <div class="filter-slot"><slot name="filters" /></div>
    <div class="unit-block">
      <span>Alle beløp</span>
      <strong>NOK 1 000</strong>
    </div>
  </section>

  <main class="dashboard-content">
    <section class="finance-panel primary-panel" aria-labelledby="fin-154301">
      <div class="panel-heading">
        <div>
          <span class="panel-code">154301</span>
          <div>
            <p>Finansiering</p>
            <h2 id="fin-154301">Driftsutgifter</h2>
          </div>
        </div>
        <span class="panel-count">5 KPI-er</span>
      </div>
      <div class="metric-grid metric-grid-five">
        {#each fin154301Rows as row}
          <MetricCard {row} />
        {/each}
      </div>
    </section>

    <div class="secondary-grid">
      <section class="finance-panel investment-panel" aria-labelledby="fin-154345">
        <div class="panel-heading compact">
          <div>
            <span class="panel-code">154345</span>
            <div>
              <p>Finansiering</p>
              <h2 id="fin-154345">Utstyr og vedlikehold</h2>
            </div>
          </div>
        </div>
        <div class="metric-grid">
          {#each fin154345Rows as row}
            <MetricCard {row} featured />
          {/each}
        </div>
      </section>

      <section class="finance-panel emergency-panel" aria-labelledby="fin-154322">
        <div class="panel-heading compact">
          <div>
            <span class="panel-code">154322 / 045101</span>
            <div>
              <p>Finansiering</p>
              <h2 id="fin-154322">Nytt nødnett</h2>
            </div>
          </div>
        </div>
        <div class="metric-grid metric-grid-three">
          {#each fin154322Rows as row}
            <MetricCard {row} />
          {/each}
        </div>
      </section>
    </div>
  </main>

  <footer class="dashboard-footer">
    <span>Hovedbok og budsjett {contextRow.budsjettversjon ?? 'ikke oppgitt'}</span>
    <span>Regelversjon {contextRow.regelversjon ?? 'ikke oppgitt'}</span>
    <span>Datasett {source.datasett_id_kort ?? 'ikke oppgitt'}</span>
  </footer>
</div>

<style>
  :global(header.fixed),
  :global(aside),
  :global(article > h1.title),
  :global(.markdown .over-container:has(button[aria-label="show-sql"])) {
    display: none !important;
  }

  :global(html) {
    background: #eaf1f6;
  }

  :global(body) {
    margin: 0;
    overflow-x: hidden;
    background: #eaf1f6 !important;
    color: #14263a;
    font-family: Inter, Aptos, "Segoe UI", system-ui, sans-serif;
  }

  :global(.max-w-7xl),
  :global(main),
  :global(article) {
    width: 100% !important;
    max-width: none !important;
  }

  :global(main) {
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
  }

  .dashboard-shell {
    box-sizing: border-box;
    width: min(100%, 1760px);
    min-height: 100vh;
    margin: 0 auto;
    padding: 20px 24px 28px;
  }

  .hero {
    position: relative;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 20px;
    min-height: 116px;
    padding: 20px 24px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 16px 16px 0 0;
    background:
      linear-gradient(112deg, rgba(47, 128, 194, 0.18), transparent 46%),
      #0b1f36;
    color: #ffffff;
  }

  .hero::after {
    content: "";
    position: absolute;
    right: -80px;
    bottom: -120px;
    width: 360px;
    height: 240px;
    border: 46px solid rgba(112, 190, 235, 0.08);
    border-radius: 50%;
    pointer-events: none;
  }

  .hero-mark {
    display: flex;
    align-items: end;
    gap: 4px;
    width: 46px;
    height: 46px;
    padding: 10px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.06);
  }

  .hero-mark span {
    width: 8px;
    border-radius: 2px 2px 0 0;
    background: #70beeb;
  }

  .hero-mark span:nth-child(1) { height: 40%; opacity: 0.62; }
  .hero-mark span:nth-child(2) { height: 70%; opacity: 0.82; }
  .hero-mark span:nth-child(3) { height: 100%; }

  .hero-copy {
    min-width: 0;
  }

  .eyebrow,
  .panel-heading p,
  .freshness span,
  .unit-block span {
    margin: 0;
    font-size: 10px;
    font-weight: 750;
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }

  .eyebrow {
    color: #70beeb;
  }

  .hero h1 {
    margin: 3px 0 4px;
    color: #ffffff;
    font-size: clamp(28px, 3vw, 42px);
    font-weight: 710;
    letter-spacing: -0.035em;
    line-height: 1;
  }

  .hero-context {
    margin: 0;
    overflow: hidden;
    color: #c9dbea;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .freshness {
    position: relative;
    z-index: 1;
    display: grid;
    gap: 2px;
    min-width: 188px;
    padding: 12px 15px;
    border-left: 2px solid #2f80c2;
    background: rgba(255, 255, 255, 0.05);
  }

  .freshness span { color: #70beeb; }
  .freshness strong { font-size: 16px; font-variant-numeric: tabular-nums; }
  .freshness small { color: #9fb8ca; font-size: 10px; }

  .filter-band {
    display: flex;
    align-items: center;
    gap: 20px;
    min-height: 86px;
    padding: 10px 20px;
    border: 1px solid #d5e0e9;
    border-top: 0;
    border-radius: 0 0 16px 16px;
    background: #ffffff;
    box-shadow: 0 8px 24px rgba(11, 31, 54, 0.08);
  }

  .filter-slot {
    min-width: 0;
    flex: 1 1 auto;
  }

  :global(.evidence-filter-grid) {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px 24px;
  }

  :global(.cost-center-picker) {
    flex: 0 1 430px;
    min-width: min(390px, 100%);
  }

  :global(.period-picker) {
    flex: 0 1 360px;
    min-width: min(340px, 100%);
  }

  :global(.cost-center-picker > .contents > div),
  :global(.period-picker > .contents > div) {
    display: block;
    width: 100%;
    margin: 0;
  }

  :global(.cost-center-picker [role="combobox"]),
  :global(.period-picker [role="combobox"]) {
    justify-content: flex-start;
    width: 100%;
    min-width: 0;
    height: 48px;
    padding: 0 14px 0 15px;
    border: 1px solid #c7d8e4 !important;
    border-left: 4px solid #2f80c2 !important;
    border-radius: 10px;
    color: #17324b !important;
    background: #f3f8fb !important;
    box-shadow: 0 2px 8px rgba(11, 31, 54, 0.06) !important;
    font-size: 12px;
    overflow: hidden;
    white-space: nowrap;
    transition: border-color 150ms ease, background 150ms ease, box-shadow 150ms ease;
  }

  :global(.cost-center-picker [role="combobox"]:hover),
  :global(.period-picker [role="combobox"]:hover) {
    border-color: #9fbdcf !important;
    background: #edf6fa !important;
  }

  :global(.cost-center-picker [role="combobox"]:focus-visible),
  :global(.period-picker [role="combobox"]:focus-visible) {
    border-color: #2f80c2 !important;
    outline: 3px solid rgba(47, 128, 194, 0.18) !important;
    outline-offset: 2px;
    box-shadow: none !important;
  }

  :global(.cost-center-picker [role="combobox"] > a[role="button"]),
  :global(.period-picker [role="combobox"] > a[role="button"]) {
    color: #6d879a;
  }

  :global(.cost-center-picker [role="separator"]),
  :global(.period-picker [role="separator"]) {
    background: #c7d8e4;
  }

  :global(.cost-center-picker [role="combobox"] > svg:last-child),
  :global(.period-picker [role="combobox"] > svg:last-child) {
    flex: 0 0 auto;
    margin-left: auto;
    color: #2f6f9f;
  }

  :global([data-melt-popover-content]:has([data-cmdk-input][placeholder="Kostnadssted"])) {
    width: min(430px, calc(100vw - 32px)) !important;
    padding: 0 !important;
    overflow: hidden;
    border: 1px solid #bdd0dc !important;
    border-radius: 11px !important;
    color: #17324b !important;
    background: #ffffff !important;
    box-shadow: 0 18px 42px rgba(11, 31, 54, 0.18) !important;
  }

  :global([data-melt-popover-content]:has([data-cmdk-input][placeholder="Kostnadssted"]) [data-cmdk-root]) {
    color: #17324b;
    background: #ffffff;
  }

  :global([data-melt-popover-content]:has([data-cmdk-input][placeholder="Kostnadssted"]) [data-cmdk-list]) {
    max-height: none !important;
  }

  :global([data-melt-popover-content]:has([data-cmdk-input][placeholder="Kostnadssted"]) [data-cmdk-group-items] > .viewport) {
    height: clamp(300px, 58vh, 520px) !important;
  }

  :global([data-melt-popover-content]:has([data-cmdk-input][placeholder="Kostnadssted"]) [data-cmdk-input-wrapper]) {
    min-height: 46px;
    border-color: #d7e3eb;
    background: #f3f8fb;
  }

  :global([data-melt-popover-content]:has([data-cmdk-input][placeholder="Kostnadssted"]) [data-cmdk-input]) {
    color: #17324b;
    font-size: 13px;
  }

  :global([data-melt-popover-content]:has([data-cmdk-input][placeholder="Kostnadssted"]) [data-cmdk-item]) {
    min-height: 38px;
    padding: 8px 10px;
    border-radius: 6px;
    color: #294860;
    line-height: 1.25;
    white-space: normal;
  }

  :global([data-melt-popover-content]:has([data-cmdk-input][placeholder="Kostnadssted"]) [data-cmdk-item][aria-selected="true"]) {
    color: #123e63;
    background: #e5f1f7;
  }

  :global([data-melt-popover-content]:has([data-cmdk-input][placeholder="Kostnadssted"]) [data-cmdk-empty]) {
    font-size: 0;
  }

  :global([data-melt-popover-content]:has([data-cmdk-input][placeholder="Kostnadssted"]) [data-cmdk-empty]::after) {
    content: "Ingen kostnadssteder funnet";
    font-size: 12px;
  }

  :global([data-melt-popover-content]:has([data-cmdk-input][placeholder="Rapportperiode"])) {
    width: min(330px, calc(100vw - 32px)) !important;
    padding: 0 !important;
    overflow: hidden;
    border: 1px solid #bdd0dc !important;
    border-radius: 11px !important;
    color: #17324b !important;
    background: #ffffff !important;
    box-shadow: 0 18px 42px rgba(11, 31, 54, 0.18) !important;
  }

  :global([data-melt-popover-content]:has([data-cmdk-input][placeholder="Rapportperiode"]) [data-cmdk-root]) {
    color: #17324b;
    background: #ffffff;
  }

  :global([data-melt-popover-content]:has([data-cmdk-input][placeholder="Rapportperiode"]) [data-cmdk-list]) {
    max-height: none !important;
  }

  :global([data-melt-popover-content]:has([data-cmdk-input][placeholder="Rapportperiode"]) [data-cmdk-group-items] > .viewport) {
    height: min(360px, 52vh) !important;
  }

  :global([data-melt-popover-content]:has([data-cmdk-input][placeholder="Rapportperiode"]) [data-cmdk-input-wrapper]) {
    min-height: 46px;
    border-color: #d7e3eb;
    background: #f3f8fb;
  }

  :global([data-melt-popover-content]:has([data-cmdk-input][placeholder="Rapportperiode"]) [data-cmdk-input]) {
    color: #17324b;
    font-size: 13px;
  }

  :global([data-melt-popover-content]:has([data-cmdk-input][placeholder="Rapportperiode"]) [data-cmdk-item]) {
    min-height: 38px;
    padding: 8px 10px;
    border-radius: 6px;
    color: #294860;
  }

  :global([data-melt-popover-content]:has([data-cmdk-input][placeholder="Rapportperiode"]) [data-cmdk-item][aria-selected="true"]) {
    color: #123e63;
    background: #e5f1f7;
  }

  :global([data-melt-popover-content]:has([data-cmdk-input][placeholder="Rapportperiode"]) [data-cmdk-empty]) {
    font-size: 0;
  }

  :global([data-melt-popover-content]:has([data-cmdk-input][placeholder="Rapportperiode"]) [data-cmdk-empty]::after) {
    content: "Ingen rapportperioder funnet";
    font-size: 12px;
  }

  .unit-block {
    display: grid;
    flex: 0 0 auto;
    gap: 2px;
    padding: 9px 0 9px 20px;
    border-left: 1px solid #dce5ec;
    text-align: right;
  }

  .unit-block span { color: #668097; }
  .unit-block strong { color: #123e63; font-size: 14px; }

  .dashboard-content {
    display: grid;
    gap: 16px;
    margin-top: 18px;
  }

  .finance-panel {
    overflow: hidden;
    border: 1px solid #d5e0e9;
    border-radius: 14px;
    background: #f7fafc;
    box-shadow: 0 5px 18px rgba(11, 31, 54, 0.06);
  }

  .panel-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-height: 64px;
    padding: 11px 16px;
    border-bottom: 1px solid #dbe5ed;
    background: #ffffff;
  }

  .panel-heading > div {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .panel-code {
    flex: 0 0 auto;
    padding: 5px 8px;
    border-radius: 6px;
    color: #ffffff;
    background: #123e63;
    font-family: "SFMono-Regular", Consolas, monospace;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .panel-heading p {
    color: #6e8497;
  }

  .panel-heading h2 {
    margin: 1px 0 0;
    color: #10263b;
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -0.015em;
  }

  .panel-count {
    color: #668097;
    font-size: 11px;
    white-space: nowrap;
  }

  .metric-grid {
    display: grid;
    gap: 1px;
    background: #dbe5ed;
  }

  .metric-grid-five { grid-template-columns: repeat(5, minmax(0, 1fr)); }
  .metric-grid-three { grid-template-columns: repeat(3, minmax(0, 1fr)); }

  .secondary-grid {
    display: grid;
    grid-template-columns: minmax(300px, 0.72fr) minmax(620px, 1.6fr);
    gap: 16px;
  }

  .dashboard-footer {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 20px;
    margin-top: 14px;
    padding: 0 3px;
    color: #6d8294;
    font-size: 10px;
  }

  .dashboard-footer span + span::before {
    content: "·";
    margin-right: 20px;
    color: #9aabba;
  }

  @media (max-width: 1180px) {
    .metric-grid-five { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .secondary-grid { grid-template-columns: 1fr; }
  }

  @media (max-width: 780px) {
    .dashboard-shell { padding: 0 0 24px; }
    .hero { grid-template-columns: auto 1fr; border-radius: 0; }
    .freshness { grid-column: 1 / -1; width: auto; }
    .filter-band { align-items: stretch; flex-direction: column; border-radius: 0; }
    :global(.evidence-filter-grid) { align-items: stretch; flex-direction: column; }
    :global(.cost-center-picker),
    :global(.period-picker) { flex-basis: auto; min-width: 0; width: 100%; }
    :global(.period-picker [role="combobox"]) {
      padding-right: 10px;
      padding-left: 10px;
      font-size: 11px;
    }
    :global(.period-picker [role="separator"]) {
      margin-right: 6px;
      margin-left: 6px;
    }
    :global(.period-picker [role="combobox"] > svg:last-child) { margin-left: 4px; }
    .unit-block { padding: 10px 0 0; border-top: 1px solid #dce5ec; border-left: 0; text-align: left; }
    .dashboard-content { padding: 0 12px; }
    .metric-grid-five,
    .metric-grid-three { grid-template-columns: 1fr; }
    .dashboard-footer { padding: 0 15px; }
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { scroll-behavior: auto !important; }
  }
</style>
