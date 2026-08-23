<script>
  import MetricCard from './MetricCard.svelte';

  export let fin154301Data = [];
  export let fin154301PeriodP13 = [];
  export let fin154301PeriodP14 = [];
  export let fin154301PeriodP16 = [];
  export let fin154322Data = [];
  export let fin154322PeriodP13 = [];
  export let fin154322PeriodP14 = [];
  export let fin154322PeriodP16 = [];
  export let fin154345Data = [];
  export let fin154345PeriodP13 = [];
  export let fin154345PeriodP14 = [];
  export let fin154345PeriodP16 = [];
  export let sourceMetadata = [];

  let dashboardData = {
    metadata: {
      periodetekst: 'Periode 1-3',
      budsjettversjon: '2026B',
      enhet: 'NOK 1000'
    }
  };
  let selectedPeriod = 'p1_3';
  let showVariantPicker = false;
  let visualVersion = 'v3';

  const visualVersions = [
    { id: 'v1', name: '1 · Tre kolonner', description: 'Én kolonne per finansiering.' },
    { id: 'v2', name: '2 · Finansieringsrader', description: 'Én vannrett rad per finansiering.' },
    { id: 'v3', name: '3 · Hovedfokus', description: '154301 stort, øvrige til høyre.' },
    { id: 'v4', name: '4 · Kontrollpanel', description: 'Valg og kildestatus i venstre sidefelt.' },
    { id: 'v5', name: '5 · Møtevisning', description: '154301 øverst, to finansieringer under.' }
  ];

  const asRows = (rows) => {
    if (!rows) return [];
    if (Array.isArray(rows)) return rows;
    return Array.from(rows);
  };

  const formatSourceDate = (value) => {
    if (!value) return 'Ikke dokumentert';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('nb-NO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Europe/Oslo'
    });
  };
  const selectPeriodRows = (periodKey, p13Rows, p14Rows, p16Rows, fallbackRows = []) => {
    const selectedRows =
      periodKey === 'p1_4'
        ? asRows(p14Rows)
        : periodKey === 'p1_6'
          ? asRows(p16Rows)
          : asRows(p13Rows);

    return selectedRows.length ? selectedRows : asRows(fallbackRows);
  };

  const setLivePeriod = (periodKey) => {
    selectedPeriod = periodKey;
  };

  const periodLabelFor = (periodKey) =>
    periodKey === 'p1_4' ? 'Jan-Apr' : periodKey === 'p1_6' ? 'Jan-Jun' : 'Jan-Mar';

  $: live154301Rows = selectPeriodRows(selectedPeriod, fin154301PeriodP13, fin154301PeriodP14, fin154301PeriodP16, fin154301Data);
  $: live154322Rows = selectPeriodRows(selectedPeriod, fin154322PeriodP13, fin154322PeriodP14, fin154322PeriodP16, fin154322Data);
  $: live154345Rows = selectPeriodRows(selectedPeriod, fin154345PeriodP13, fin154345PeriodP14, fin154345PeriodP16, fin154345Data);
  $: periodLabel = periodLabelFor(selectedPeriod);
  $: source = asRows(sourceMetadata)[0] ?? {};
  $: ruleVersion = live154301Rows[0]?.regelversjon ?? 'Ikke oppgitt';
  $: fin154301Rows = asRows(live154301Rows);
  $: fin154345Rows = asRows(live154345Rows);
  $: fin154322Rows = asRows(live154322Rows);
  $: metricView = visualVersion === 'v2'
    ? 'row'
    : visualVersion === 'v3'
      ? 'focus'
      : visualVersion === 'v4'
        ? 'table'
        : visualVersion === 'v5'
          ? 'stage'
          : 'card';
</script>

<div class="dashboard-shell variant-{visualVersion}">
  <section class="hero" aria-labelledby="dashboard-title">
    <div class="hero-copy">
      <div class="eyebrow">Oppgave 1 · KPI-dashboard</div>
      <h1 id="dashboard-title" class="title">Økonomisk status</h1>
    </div>
    <div class="hero-actions">
      <div class="period-badge">
        <span>Periode</span>
        <strong>{periodLabel}</strong>
        <small>2026</small>
      </div>
      <button
        class="variant-toggle"
        type="button"
        aria-expanded={showVariantPicker}
        on:click={() => (showVariantPicker = !showVariantPicker)}
      >
        {showVariantPicker ? 'Skjul versjoner' : 'Vis versjoner'}
      </button>
    </div>
  </section>

  {#if showVariantPicker}
    <section class="variant-picker" aria-label="Presentasjonsversjoner">
      <div class="variant-intro">
        <span>Designutforsking</span>
        <strong>Velg en presentasjonsversjon</strong>
        <small>Alle versjonene viser de samme operative tallene.</small>
      </div>
      <div class="variant-options">
        {#each visualVersions as version}
          <button
            type="button"
            class:active={visualVersion === version.id}
            aria-pressed={visualVersion === version.id}
            on:click={() => (visualVersion = version.id)}
          >
            <strong>{version.name}</strong>
            <span>{version.description}</span>
          </button>
        {/each}
      </div>
    </section>
  {/if}

  <section class="dashboard-controls" aria-label="Dashboardkontroller">
    <div class="control-group">
      <span class="control-label">Rapportperiode</span>
      <div class="period-switch">
        <button class:active={selectedPeriod === 'p1_3'} type="button" on:click={() => setLivePeriod('p1_3')}>Jan–mar</button>
        <button class:active={selectedPeriod === 'p1_4'} type="button" on:click={() => setLivePeriod('p1_4')}>Jan–apr</button>
        <button class:active={selectedPeriod === 'p1_6'} type="button" on:click={() => setLivePeriod('p1_6')}>Jan–jun</button>
      </div>
    </div>
    <div class="unit-note"><span>Enhet</span><strong>NOK 1 000</strong></div>
  </section>

  {#if source.datasett_id_kort}
    <section class="source-metadata" aria-label="Datastatus">
      <div class="source-freshness">
        <span>Datastatus</span>
        <strong>Regnskap oppdatert til {formatSourceDate(source.hovedbok_siste_transaksjonsdato)}</strong>
        <small>Basert på siste bokførte transaksjon</small>
      </div>
    </section>
  {/if}
  {#if visualVersion === 'v3'}
    <section class="focus-guide" aria-label="Slik leses hovedfokusvisningen">
      <strong>Slik leses visningen</strong>
      <span><i class="ring-example" aria-hidden="true"></i>Ringen viser brukt andel av budsjettet. For prosenttall viser den beregnet andel.</span>
      <span class="status-legend">
        <span class="legend-item"><i class="legend-dot ok" aria-hidden="true"></i>Innenfor</span>
        <span class="legend-item"><i class="legend-dot warning" aria-hidden="true"></i>Nær budsjett</span>
        <span class="legend-item"><i class="legend-dot danger" aria-hidden="true"></i>Over budsjett</span>
      </span>
    </section>
  {/if}
  <div class="finance-grid">
    <section class="finance-panel">
      <div class="panel-header">
        <div class="panel-kicker">Finansiering</div>
        <h2 class="panel-title">Driftsutgifter (154301)</h2>
      </div>
      <div class="metric-grid compact">
        {#each fin154301Rows as row}
          <MetricCard {row} view={metricView} />
        {/each}
      </div>
    </section>

    <section class="finance-panel">
      <div class="panel-header">
        <div class="panel-kicker">Finansiering</div>
        <h2 class="panel-title">Større utstyrsanskaffelser og vedlikehold (154345)</h2>
      </div>
      <div class="metric-grid single">
        {#each fin154345Rows as row}
          <MetricCard {row} view={metricView} hero />
        {/each}
      </div>
    </section>

    <section class="finance-panel">
      <div class="panel-header">
        <div class="panel-kicker">Finansiering</div>
        <h2 class="panel-title">Nytt nødnett inkl. innleide konsulenter (154322/045101)</h2>
      </div>
      <div class="metric-grid single">
        {#each fin154322Rows as row}
          <MetricCard {row} view={metricView} />
        {/each}
      </div>
    </section>
  </div>
</div>

<style>
  :global(header),
  :global(aside),
  :global(article > h1.title),
  :global(.markdown .over-container:has(button[aria-label="show-sql"])) {
    display: none !important;
  }

  :global(body) {
    overflow-x: hidden;
    overflow-y: auto;
    background: #f5f7fa;
  }

  :global(.max-w-7xl),
  :global(main),
  :global(article) {
    max-width: none !important;
    width: 100% !important;
  }

  :global(main) {
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
  }

  :global(.markdown) {
    color: #111827;
  }

  .dashboard-shell {
    box-sizing: border-box;
    position: relative;
    z-index: 100;
    min-height: 100vh;
    width: 100%;
    max-width: 1840px;
    margin: 0 auto;
    padding: 8px 32px 48px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0, rgba(245, 247, 250, 0) 210px),
      #f5f7fa;
  }

  .hero {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 24px;
    padding: 28px 30px;
    border-radius: 18px;
    color: #ffffff;
    background: linear-gradient(125deg, #13294b, #1d4f79 62%, #287c91);
    box-shadow: 0 12px 32px rgba(22, 48, 83, 0.18);
  }

  .hero-copy {
    min-width: 0;
  }

  .eyebrow {
    font-size: 11px;
    font-weight: 750;
    color: #8ed7df;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .title {
    margin: 4px 0 8px;
    color: #ffffff !important;
    font-size: 32px;
    line-height: 1.1;
    font-weight: 760;
  }

  .hero p {
    margin: 0;
    color: #d9e8f4;
    font-size: 14px;
  }

  .hero-copy > small {
    display: block;
    margin-top: 8px;
    color: #a9cadc;
    font-size: 10px;
  }

  .hero-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .variant-toggle {
    min-height: 42px;
    padding: 0 15px;
    border: 1px solid rgba(255, 255, 255, 0.35);
    border-radius: 999px;
    color: #ffffff;
    background: rgba(255, 255, 255, 0.1);
    font-size: 12px;
    font-weight: 750;
    cursor: pointer;
    white-space: nowrap;
  }

  .variant-toggle:hover {
    background: rgba(255, 255, 255, 0.18);
  }

  .variant-picker {
    display: grid;
    grid-template-columns: minmax(190px, 0.7fr) minmax(0, 3fr);
    gap: 18px;
    margin-top: 12px;
    padding: 16px;
    border: 1px solid #d9e2ec;
    border-radius: 14px;
    background: #ffffff;
    box-shadow: 0 8px 24px rgba(30, 50, 80, 0.08);
  }

  .variant-intro {
    display: grid;
    align-content: center;
    gap: 3px;
  }

  .variant-intro > span {
    color: #4976a3;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .variant-intro > strong {
    color: #172033;
    font-size: 15px;
  }

  .variant-intro > small {
    color: #68778a;
    font-size: 11px;
  }

  .variant-options {
    display: grid;
    grid-template-columns: repeat(5, minmax(120px, 1fr));
    gap: 8px;
  }

  .variant-options button {
    display: grid;
    align-content: start;
    gap: 4px;
    min-height: 72px;
    padding: 10px 11px;
    border: 1px solid #d9e2ec;
    border-radius: 10px;
    color: #42526b;
    text-align: left;
    background: #f8fafc;
    cursor: pointer;
  }

  .variant-options button:hover {
    border-color: #87a9c8;
    background: #f1f6fa;
  }

  .variant-options button.active {
    border-color: #2f6f9f;
    color: #153c5d;
    background: #eaf3f9;
    box-shadow: inset 0 0 0 1px #2f6f9f;
  }

  .variant-options strong {
    font-size: 12px;
  }

  .variant-options span {
    font-size: 10px;
    line-height: 1.25;
  }

  .task-nav {
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 6px;
  }

  .task-nav a {
    padding: 8px 10px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 7px;
    color: #ffffff;
    background: rgba(255, 255, 255, 0.06);
    font-size: 10px;
    font-weight: 700;
    text-decoration: none;
    white-space: nowrap;
  }

  .task-nav a:hover {
    background: rgba(255, 255, 255, 0.14);
  }

  .period-badge {
    flex: 0 0 auto;
    display: grid;
    min-width: 100px;
    padding: 12px 18px;
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 12px;
    text-align: center;
    background: rgba(255, 255, 255, 0.1);
  }

  .period-badge span,
  .period-badge small {
    color: #d7e7f2;
    font-size: 11px;
  }

  .period-badge strong {
    color: #ffffff;
    font-size: 20px;
    line-height: 1.25;
  }

  .dashboard-controls {
    display: flex;
    align-items: flex-end;
    flex-wrap: wrap;
    gap: 14px 18px;
    margin-top: 18px;
    padding: 14px 16px;
    border: 1px solid #dfe6ee;
    border-radius: 13px;
    background: #ffffff;
    box-shadow: 0 4px 14px rgba(30, 50, 80, 0.05);
  }

  .unit-note {
    display: grid;
    gap: 2px;
    margin-left: auto;
    padding-right: 4px;
    text-align: right;
  }

  .unit-note span {
    color: #68778a;
    font-size: 10px;
    font-weight: 750;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .unit-note strong {
    color: #243147;
    font-size: 13px;
  }

  .export-control {
    align-self: flex-end;
    margin-left: auto;
  }

  .export-button {
    min-height: 44px;
    padding: 0 18px;
    border: 1px solid #146534;
    border-radius: 999px;
    background: #146534;
    color: #ffffff;
    font-size: 13px;
    font-weight: 750;
    cursor: pointer;
    white-space: nowrap;
  }

  .export-button:hover {
    background: #0f542a;
  }

  .export-button:disabled {
    opacity: 0.5;
    cursor: wait;
  }

  .advanced-import {
    margin-top: 10px;
    border: 1px solid #dfe6ee;
    border-radius: 12px;
    background: #ffffff;
  }

  .advanced-import summary {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 15px;
    color: #42526b;
    font-size: 12px;
    font-weight: 750;
    cursor: pointer;
    list-style-position: inside;
  }

  .advanced-import summary small {
    color: #7a8798;
    font-size: 10px;
    font-weight: 500;
  }

  .advanced-import-content {
    display: flex;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 18px 28px;
    padding: 14px 16px 16px;
    border-top: 1px solid #e7ecf2;
    background: #f9fbfc;
  }

  .source-metadata {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 14px 20px;
    margin-top: 10px;
    padding: 13px 16px;
    border: 1px solid #dfe6ee;
    border-radius: 12px;
    background: #ffffff;
  }

  .source-freshness {
    display: grid;
    gap: 2px;
  }

  .source-metadata span {
    color: #68778a;
    font-size: 10px;
    font-weight: 750;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .source-freshness strong,
  .source-detail-grid strong {
    color: #243147;
    font-size: 12px;
  }

  .source-freshness small {
    color: #748295;
    font-size: 10px;
  }

  .source-details {
    position: relative;
    margin-left: auto;
  }

  .source-details[open] {
    margin-left: auto;
  }

  .source-details summary {
    width: max-content;
    margin-left: auto;
    padding: 8px 12px;
    border: 1px solid #cbd7e2;
    border-radius: 999px;
    color: #34536e;
    background: #f7fafc;
    font-size: 11px;
    font-weight: 750;
    cursor: pointer;
  }

  .source-details summary:hover {
    border-color: #8fa9bd;
    background: #eef4f7;
  }

  .source-detail-grid {
    position: absolute;
    z-index: 20;
    top: calc(100% + 10px);
    right: 0;
    display: grid;
    grid-template-columns: repeat(4, minmax(120px, 1fr));
    gap: 12px;
    width: min(920px, calc(100vw - 48px));
    padding: 16px;
    border: 1px solid #d7e1e9;
    border-radius: 12px;
    background: #ffffff;
    box-shadow: 0 16px 38px rgba(30, 50, 80, 0.18);
    box-sizing: border-box;
  }

  .source-detail-grid > div {
    display: grid;
    gap: 2px;
  }

  .source-detail-grid .source-warning strong {
    color: #9a6700;
  }

  .source-detail-grid p {
    grid-column: 1 / -1;
    margin: 0;
    color: #68778a;
    font-size: 11px;
  }

  .focus-guide {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 9px 18px;
    padding: 10px 14px;
    border: 1px solid #dce5ec;
    border-radius: 10px;
    color: #56667a;
    background: #f8fafc;
    font-size: 11px;
  }

  .focus-guide > strong {
    color: #243147;
    font-size: 11px;
  }

  .focus-guide > span,
  .status-legend,
  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .ring-example {
    width: 15px;
    height: 15px;
    flex: 0 0 auto;
    border: 4px solid #dfe8ed;
    border-top-color: #287c91;
    border-right-color: #287c91;
    border-radius: 50%;
    box-sizing: border-box;
  }

  .legend-dot {
    width: 8px;
    height: 8px;
    margin-left: 3px;
    border-radius: 50%;
    background: #94a3b8;
  }

  .legend-dot.ok { background: #16a34a; }
  .legend-dot.warning { background: #f59e0b; }
  .legend-dot.danger { background: #e54835; }

  .control-group {
    display: grid;
    gap: 6px;
  }

  .control-label {
    color: #68778a;
    font-size: 10px;
    font-weight: 750;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .mode-switch {
    display: inline-flex;
    padding: 4px;
    border-radius: 999px;
    background: rgba(23, 32, 51, 0.08);
    gap: 4px;
  }

  .mode-switch button {
    min-height: 36px;
    padding: 0 14px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: #42526b;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
  }

  .mode-switch button.active {
    background: #172033;
    color: #ffffff;
  }

  .mode-switch button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .upload-tools {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .upload-hint {
    max-width: 520px;
    color: #68778a;
    font-size: 10px;
    line-height: 1.35;
  }

  .period-switch {
    display: inline-flex;
    padding: 4px;
    border-radius: 999px;
    background: rgba(63, 111, 159, 0.09);
    gap: 4px;
  }

  .period-switch button {
    min-height: 36px;
    padding: 0 12px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: #42526b;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
  }

  .period-switch button.active {
    background: #3f6f9f;
    color: #ffffff;
  }

  .period-note {
    font-size: 12px;
    font-weight: 600;
    color: #667085;
    white-space: nowrap;
  }

  .file-input {
    display: none;
  }

  .upload-button,
  .template-button {
    min-height: 36px;
    padding: 0 12px;
    border: 1px solid #c8d3df;
    border-radius: 999px;
    background: #ffffff;
    color: #243147;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
  }

  .upload-button.primary {
    border-color: #1d5f8a;
    background: #1d5f8a;
    color: #ffffff;
  }

  .upload-button.primary:hover {
    background: #174e72;
  }

  .upload-status span {
    display: inline-block;
    margin-top: 3px;
    font-size: 11px;
    font-weight: 500;
  }

  .upload-status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 12px 0 0;
    padding: 10px 14px;
    border-radius: 12px;
    background: rgba(20, 101, 52, 0.08);
    color: #146534;
    font-size: 13px;
    font-weight: 600;
  }

  .upload-status.error {
    display: block;
    background: rgba(185, 28, 28, 0.08);
    color: #b91c1c;
  }

  .active-import-copy {
    min-width: 0;
  }

  .remove-saved-button {
    flex: 0 0 auto;
    min-height: 32px;
    padding: 0 11px;
    border: 1px solid #9fc8af;
    border-radius: 999px;
    background: #ffffff;
    color: #146534;
    font-size: 11px;
    font-weight: 750;
    cursor: pointer;
  }

  .import-preview {
    margin-top: 12px;
    padding: 16px;
    border: 1px solid #9fc8af;
    border-radius: 13px;
    background: #f7fcf8;
    box-shadow: 0 4px 14px rgba(20, 101, 52, 0.06);
  }

  .preview-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }

  .preview-kicker {
    color: #146534;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .preview-heading h2 {
    margin: 3px 0 0;
    color: #183528;
    font-size: 17px;
    line-height: 1.25;
  }

  .validation-badge {
    flex: 0 0 auto;
    padding: 6px 9px;
    border-radius: 999px;
    background: #dff3e5;
    color: #146534;
    font-size: 11px;
    font-weight: 750;
  }

  .preview-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(120px, 1fr));
    gap: 10px;
    margin-top: 14px;
  }

  .preview-grid div {
    display: grid;
    gap: 2px;
    padding: 9px 10px;
    border-radius: 8px;
    background: #ffffff;
  }

  .preview-grid span {
    color: #68778a;
    font-size: 9px;
    font-weight: 750;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .preview-grid strong {
    color: #243147;
    font-size: 12px;
  }

  .preview-files {
    margin: 10px 0 0;
    color: #526277;
    font-size: 11px;
    overflow-wrap: anywhere;
  }

  .preview-actions {
    display: flex;
    gap: 8px;
    margin-top: 14px;
  }

  .activate-button,
  .cancel-button {
    min-height: 36px;
    padding: 0 15px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 750;
    cursor: pointer;
  }

  .activate-button {
    border: 1px solid #146534;
    background: #146534;
    color: #ffffff;
  }

  .cancel-button {
    border: 1px solid #c8d3df;
    background: #ffffff;
    color: #42526b;
  }

  .finance-grid {
    position: relative;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(560px, 1.24fr) minmax(360px, 0.82fr) minmax(440px, 1fr);
    gap: 22px;
    align-items: start;
    margin-top: 22px;
  }

  .finance-grid::before,
  .finance-grid::after {
    content: "";
    position: absolute;
    top: 8px;
    bottom: -30px;
    width: 1px;
    background: linear-gradient(
      180deg,
      rgba(185, 197, 211, 0),
      rgba(185, 197, 211, 0.9) 58px,
      rgba(185, 197, 211, 0.72)
    );
  }

  .finance-grid::before {
    left: calc((100% - 44px) * 1.24 / 3.06 + 11px);
  }

  .finance-grid::after {
    left: calc((100% - 44px) * 2.06 / 3.06 + 33px);
  }

  .finance-panel {
    min-width: 0;
    min-height: 0;
    display: grid;
    gap: 12px;
  }

  .panel-header {
    min-height: 70px;
    padding: 0 2px 2px;
    display: flex;
    flex-direction: column;
    justify-content: end;
  }

  .panel-kicker {
    font-size: 11px;
    font-weight: 800;
    color: #7a8798;
    text-transform: uppercase;
    letter-spacing: 0;
  }

  .panel-title {
    margin: 4px 0 0;
    font-size: 19px;
    line-height: 1.16;
    font-weight: 760;
    color: #243147;
    letter-spacing: 0;
  }

  .metric-grid {
    min-height: 0;
    display: grid;
    gap: 12px;
  }

  .metric-grid.compact {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .metric-grid.single {
    align-content: start;
  }

  .variant-v2,
  .variant-v3,
  .variant-v4,
  .variant-v5 {
    display: grid;
    gap: 14px 18px;
    align-content: start;
  }

  .variant-v2 .hero,
  .variant-v3 .hero,
  .variant-v4 .hero,
  .variant-v5 .hero {
    grid-area: hero;
  }

  .variant-v2 .variant-picker,
  .variant-v3 .variant-picker,
  .variant-v4 .variant-picker,
  .variant-v5 .variant-picker {
    grid-area: picker;
    margin-top: 0;
  }

  .variant-v2 .dashboard-controls,
  .variant-v3 .dashboard-controls,
  .variant-v4 .dashboard-controls,
  .variant-v5 .dashboard-controls {
    grid-area: controls;
    margin-top: 0;
  }

  .variant-v2 .source-metadata,
  .variant-v3 .source-metadata,
  .variant-v4 .source-metadata,
  .variant-v5 .source-metadata {
    grid-area: source;
    margin-top: 0;
  }

  .variant-v3 .focus-guide {
    grid-area: guide;
  }

  .variant-v2 .finance-grid,
  .variant-v3 .finance-grid,
  .variant-v4 .finance-grid,
  .variant-v5 .finance-grid {
    grid-area: finance;
    margin-top: 0;
  }

  .variant-v2 .finance-grid::before,
  .variant-v2 .finance-grid::after,
  .variant-v3 .finance-grid::before,
  .variant-v3 .finance-grid::after,
  .variant-v4 .finance-grid::before,
  .variant-v4 .finance-grid::after,
  .variant-v5 .finance-grid::before,
  .variant-v5 .finance-grid::after {
    display: none;
  }

  /* Versjon 2: toppfunksjoner til høyre og én rad per finansiering. */
  .variant-v2 {
    grid-template-columns: minmax(0, 1.55fr) minmax(310px, 0.65fr);
    grid-template-areas:
      "hero controls"
      "picker picker"
      "source source"
      "finance finance";
  }

  .variant-v2 .dashboard-controls {
    align-content: center;
    align-items: stretch;
    flex-direction: column;
  }

  .variant-v2 .unit-note {
    margin-left: 0;
    text-align: left;
  }

  .variant-v2 .finance-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .variant-v2 .finance-panel {
    grid-template-columns: minmax(240px, 0.28fr) minmax(0, 1fr);
    align-items: stretch;
    padding: 12px;
    border: 1px solid #dfe6ee;
    border-radius: 12px;
    background: #ffffff;
  }

  .variant-v2 .finance-panel:first-child {
    grid-row: auto;
  }

  .variant-v2 .panel-header {
    min-height: 0;
    justify-content: center;
    padding: 12px;
    border-right: 1px solid #dfe6ee;
  }

  .variant-v2 .metric-grid,
  .variant-v2 .metric-grid.compact {
    grid-template-columns: 1fr;
  }

  .variant-v2 :global(.metric-card) {
    min-height: 76px;
    box-shadow: none;
  }

  /* Versjon 3: periodevalg og kildestatus side om side, med 154301 i hovedfokus. */
  .variant-v3 {
    grid-template-columns: minmax(300px, 0.7fr) minmax(0, 1.3fr);
    grid-template-areas:
      "hero hero"
      "picker picker"
      "controls source"
      "guide guide"
      "finance finance";
  }

  .variant-v3 .finance-grid {
    grid-template-columns: minmax(620px, 1.5fr) minmax(360px, 0.82fr);
    grid-template-rows: auto auto;
  }

  .variant-v3 .finance-panel:first-child {
    grid-row: 1 / span 2;
    padding-right: 20px;
    border-right: 1px solid #c9d4df;
  }

  .variant-v3 .finance-panel:not(:first-child) .panel-header {
    min-height: 52px;
  }

  .variant-v3 .metric-grid,
  .variant-v3 .metric-grid.compact {
    grid-template-columns: 1fr;
  }

  /* Versjon 4: kontrollene i en fast venstrekolonne og innholdet til høyre. */
  .variant-v4 {
    grid-template-columns: 280px minmax(0, 1fr);
    grid-template-areas:
      "hero hero"
      "picker picker"
      "controls finance"
      "source finance";
  }

  .variant-v4 .dashboard-controls {
    align-items: stretch;
    align-self: start;
    flex-direction: column;
  }

  .variant-v4 .period-switch {
    display: grid;
  }

  .variant-v4 .unit-note {
    margin-left: 0;
    text-align: left;
  }

  .variant-v4 .source-metadata {
    align-self: start;
  }

  .variant-v4 .source-details,
  .variant-v4 .source-details summary {
    width: 100%;
    margin-left: 0;
  }

  .variant-v4 .source-detail-grid {
    grid-template-columns: 1fr;
    right: auto;
    left: 0;
    width: min(520px, calc(100vw - 48px));
  }

  .variant-v4 .source-detail-grid p {
    grid-column: 1;
  }

  .variant-v4 .finance-grid {
    grid-template-columns: 1fr;
    grid-row: span 2;
  }

  .variant-v4 .finance-panel,
  .variant-v4 .finance-panel:first-child {
    grid-row: auto;
  }

  .variant-v4 .metric-grid,
  .variant-v4 .metric-grid.compact {
    grid-template-columns: 1fr;
  }

  /* Versjon 5: 154301 som full bredde, de to andre under. */
  .variant-v5 {
    grid-template-columns: minmax(0, 1.5fr) minmax(330px, 0.72fr);
    grid-template-areas:
      "hero source"
      "picker picker"
      "controls controls"
      "finance finance";
  }

  .variant-v5 .source-metadata {
    align-self: stretch;
  }

  .variant-v5 .finance-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .variant-v5 .finance-panel:first-child {
    grid-column: 1 / -1;
    grid-row: auto;
  }

  .variant-v5 .finance-panel:first-child .metric-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .variant-v5 .finance-panel:not(:first-child) .metric-grid {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  @media (max-width: 1400px) {
    .variant-options {
      grid-template-columns: repeat(3, minmax(140px, 1fr));
    }

    .finance-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .finance-grid::before,
    .finance-grid::after {
      display: none;
    }

    .finance-panel:first-child {
      grid-row: span 2;
    }
  }

  @media (max-width: 980px) {
    .dashboard-shell {
      padding-right: 18px;
      padding-left: 18px;
    }

    .hero {
      align-items: flex-start;
      flex-direction: column;
      padding: 22px;
    }

    .hero-actions {
      width: 100%;
      justify-content: space-between;
    }

    .variant-picker {
      grid-template-columns: 1fr;
    }

    .variant-options {
      grid-template-columns: repeat(2, minmax(140px, 1fr));
    }

    .variant-v2,
    .variant-v3,
    .variant-v4,
    .variant-v5 {
      grid-template-columns: 1fr;
      grid-template-areas:
        "hero"
        "picker"
        "controls"
        "source"
        "guide"
        "finance";
    }

    .variant-v2 .finance-panel {
      grid-template-columns: 1fr;
    }

    .variant-v2 .panel-header {
      border-right: 0;
      border-bottom: 1px solid #dfe6ee;
    }

    .variant-v3 .finance-grid,
    .variant-v5 .finance-grid {
      grid-template-columns: 1fr;
    }

    .variant-v3 .finance-panel:first-child {
      grid-row: auto;
      padding-right: 0;
      border-right: 0;
    }

    .variant-v4 .finance-grid {
      grid-row: auto;
    }

    .variant-v5 .finance-panel:first-child {
      grid-column: auto;
    }

    .variant-v5 .finance-panel:first-child .metric-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .task-nav {
      justify-content: flex-start;
    }

    .period-badge {
      display: none;
    }

    .source-detail-grid {
      grid-template-columns: repeat(2, minmax(150px, 1fr));
    }

    .preview-grid {
      grid-template-columns: repeat(2, minmax(120px, 1fr));
    }
  }

  @media (max-width: 720px) {
    .finance-grid,
    .metric-grid.compact {
      grid-template-columns: 1fr;
    }

    .finance-panel:first-child {
      grid-row: auto;
    }

    .dashboard-controls,
    .control-group,
    .mode-switch,
    .period-switch,
    .upload-tools {
      width: 100%;
    }

    .export-control {
      margin-left: 0;
      width: 100%;
    }

    .export-button {
      width: 100%;
    }

    .advanced-import summary {
      align-items: flex-start;
      flex-direction: column;
    }

    .advanced-import-content {
      display: grid;
    }

    .mode-switch button,
    .period-switch button,
    .upload-tools button {
      flex: 1;
    }

    .title {
      font-size: 27px;
    }

    .variant-v5 {
      padding-right: 18px;
      padding-left: 18px;
    }

    .variant-options {
      grid-template-columns: 1fr;
    }

    .variant-v5 .finance-panel:first-child .metric-grid {
      grid-template-columns: 1fr;
    }

    .source-detail-grid {
      position: static;
      grid-template-columns: 1fr;
      width: 100%;
      margin-top: 12px;
      padding: 12px 0 0;
      border: 0;
      border-top: 1px solid #e5ebf0;
      border-radius: 0;
      box-shadow: none;
    }

    .source-details,
    .source-details[open],
    .source-details summary {
      width: 100%;
      margin-left: 0;
    }

    .source-detail-grid p {
      grid-column: 1;
    }

    .focus-guide,
    .focus-guide > span,
    .status-legend {
      align-items: flex-start;
    }

    .focus-guide {
      display: grid;
    }

    .status-legend {
      flex-wrap: wrap;
    }

    .preview-heading {
      flex-direction: column;
    }

    .preview-grid {
      grid-template-columns: 1fr;
    }

    .preview-actions button {
      flex: 1;
    }

    .upload-status:not(.error) {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
