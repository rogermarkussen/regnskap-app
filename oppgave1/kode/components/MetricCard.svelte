<script>
  export let row;
  export let hero = false;
  export let view = 'card';

  const nok1000 = (value) =>
    Number(value ?? 0).toLocaleString('nb-NO', { maximumFractionDigits: 0 });

  const pct = (value) =>
    Number((value ?? 0) * 100).toLocaleString('nb-NO', { maximumFractionDigits: 0 });

  const progress = (value) => `${Math.max(0, Math.min(100, Number(value ?? 0) * 100))}%`;

  const gaugeDegrees = (value) => {
    const ratio = value.prosentverdi !== null && value.prosentverdi !== undefined
      ? Number(value.prosentverdi)
      : Number(value.budsjettandel ?? 0);
    return `${Math.max(0, Math.min(1, ratio)) * 360}deg`;
  };

  const comparisonWidth = (value, field) => {
    if (value.prosentverdi !== null && value.prosentverdi !== undefined) {
      return field === 'actual' ? progress(value.prosentverdi) : '0%';
    }
    const actual = Math.abs(Number(value.hovedbok_nok1000 ?? 0));
    const budget = Math.abs(Number(value.budsjett_nok1000 ?? 0));
    const scale = Math.max(actual, budget, 1);
    return `${(field === 'actual' ? actual : budget) / scale * 100}%`;
  };

  const statusLabel = (status) => {
    if (status === 'danger') return 'Over budsjett';
    if (status === 'warning') return 'Nær budsjett';
    if (status === 'ok') return 'Innenfor budsjett';
    return 'Ikke vurdert';
  };

  const metricExplanation = (title) => ({
    ADK: 'Andre driftskostnader',
    Konsulent: 'Kostnader til innleide konsulenter',
    Reise: 'Reise- og diettkostnader',
    Overtid: 'Utbetalt overtid',
    Lønnsandel: 'Lønn som andel av totale kostnader',
    'Totalt regnskap vs budsjett': 'Samlet forbruk sammenlignet med budsjettet',
    'Testlab prosjekt 7114': 'Kostnader ført på Testlab-prosjektet'
  }[title] ?? 'Regnskap sammenlignet med budsjett');

  const isMissingBudget = (value) =>
    value === null || value === undefined;

  const remainingLabel = (value) => {
    if (isMissingBudget(value.budsjett_nok1000)) return 'Mangler budsjett';
    const remaining = Number(value.gjenstaar_nok1000 ?? 0);
    if (Number(value.budsjett_nok1000 ?? 0) === 0) {
      return `${nok1000(value.hovedbok_nok1000)} uten budsjett`;
    }
    if (remaining < 0) return `${nok1000(Math.abs(remaining))} over budsjett`;
    return `${nok1000(remaining)} gjenstår`;
  };

  const actualValue = (value) =>
    value.prosentverdi !== null && value.prosentverdi !== undefined
      ? `${pct(value.prosentverdi)}%`
      : nok1000(value.hovedbok_nok1000);

  const budgetValue = (value) => {
    if (value.prosentverdi !== null && value.prosentverdi !== undefined) return 'Andel av totale kostnader';
    if (isMissingBudget(value.budsjett_nok1000)) return 'Mangler budsjett';
    if (Number(value.budsjett_nok1000) === 0) return 'Ikke budsjettert';
    return nok1000(value.budsjett_nok1000);
  };
</script>

{#if view === 'card'}
  <article class:hero class="metric-card card" data-metric-title={row.tittel}>
    <div class="metric-head">
      <h3 class="metric-title">{row.tittel}</h3>
      {#if row.status}<span class="status-dot {row.status}" title={row.status_tekst || statusLabel(row.status)}></span>{/if}
    </div>
    <div class="metric-body">
      <div class="label">{row.prosentverdi == null ? 'Hovedbok · NOK 1 000' : 'Andel'}</div>
      <div class="big-number">{actualValue(row)}</div>
      {#if row.prosentverdi == null && !isMissingBudget(row.budsjett_nok1000) && Number(row.budsjett_nok1000) !== 0}
        <div class="budget-line">Budsjett {budgetValue(row)}</div>
        <div class="progress"><div class="progress-fill" style:width={progress(row.budsjettandel)}></div></div>
      {:else}
        <div class="budget-line">{budgetValue(row)}</div>
      {/if}
      {#if row.prosentverdi == null}<div class="remaining-line">{remainingLabel(row)}</div>{/if}
    </div>
    {#if row.kommentar}<div class="note">{row.kommentar}</div>{/if}
  </article>
{:else if view === 'row'}
  <div class="metric-card row" data-metric-title={row.tittel}>
    <div class="row-title">
      {#if row.status}<span class="status-dot {row.status}" title={row.status_tekst || statusLabel(row.status)}></span>{/if}
      <strong>{row.tittel}</strong>
    </div>
    <div class="row-value"><span>Hovedbok</span><strong class="big-number">{actualValue(row)}</strong></div>
    <div class="row-value"><span>Budsjett</span><strong>{budgetValue(row)}</strong></div>
    <div class="row-value end"><span>Status</span><strong>{row.prosentverdi == null ? remainingLabel(row) : 'Andel'}</strong></div>
    <div class="row-chart" aria-hidden="true"><span style:width={progress(row.prosentverdi ?? row.budsjettandel)}></span></div>
  </div>
{:else if view === 'focus'}
  <article class="metric-card focus" data-metric-title={row.tittel}>
    <div class="focus-title">
      <span>{row.prosentverdi == null ? 'Hovedbok · NOK 1 000' : 'Andel'}</span>
      <h3>{row.tittel}</h3>
      <p>{metricExplanation(row.tittel)}</p>
    </div>
    <div class="donut" style:--gauge={gaugeDegrees(row)} aria-hidden="true">
      <div><strong class="big-number">{actualValue(row)}</strong><small>{row.prosentverdi == null ? 'av budsjett' : 'andel'}</small></div>
    </div>
    <div class="focus-context">
      <strong>{row.prosentverdi == null ? remainingLabel(row) : budgetValue(row)}</strong>
      {#if row.status}<span><i class="status-dot {row.status}"></i>{row.status_tekst || statusLabel(row.status)}</span>{/if}
    </div>
  </article>
{:else if view === 'table'}
  <div class="metric-card table-row" data-metric-title={row.tittel}>
    <strong class="table-title">{row.tittel}</strong>
    <span class="table-cell"><small>Hovedbok</small><b class="big-number">{actualValue(row)}</b><i class="microbar"><em style:width={progress(row.prosentverdi ?? row.budsjettandel)}></em></i></span>
    <span class="table-cell"><small>Budsjett</small><b>{budgetValue(row)}</b></span>
    <span class="table-cell status-cell">
      {#if row.status}<i class="status-dot {row.status}"></i>{/if}
      <b>{row.prosentverdi == null ? remainingLabel(row) : 'Andel'}</b>
    </span>
  </div>
{:else}
  <article class="metric-card stage" data-metric-title={row.tittel}>
    <div class="stage-title">{row.tittel}</div>
    <div class="big-number">{actualValue(row)}</div>
    <div class="stage-rule"></div>
    <div class="stage-context">{row.prosentverdi == null ? remainingLabel(row) : budgetValue(row)}</div>
    <div class="stage-chart" aria-hidden="true">
      <div><span>Hovedbok</span><i><em style:width={comparisonWidth(row, 'actual')}></em></i></div>
      {#if row.prosentverdi == null}<div><span>Budsjett</span><i><em class="budget" style:width={comparisonWidth(row, 'budget')}></em></i></div>{/if}
    </div>
  </article>
{/if}

<style>
  .metric-card {
    min-width: 0;
    color: #172033;
  }

  .card {
    min-height: 154px;
    display: grid;
    grid-template-rows: auto 1fr auto;
    gap: 12px;
    padding: 15px 16px 14px;
    border: 1px solid #dde4ed;
    border-radius: 8px;
    background: #ffffff;
    box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04), 0 10px 24px rgba(16, 24, 40, 0.06);
  }

  .card.hero {
    min-height: 194px;
  }

  .metric-head,
  .row-title,
  .focus-context > span,
  .status-cell {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .metric-head {
    justify-content: space-between;
  }

  .metric-title,
  .focus-title h3 {
    margin: 0;
    color: #1f2937;
    font-size: 16px;
    line-height: 1.18;
    font-weight: 760;
  }

  .status-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    flex: 0 0 auto;
    border-radius: 999px;
    background: #94a3b8;
  }

  .status-dot.ok { background: #16a34a; }
  .status-dot.warning { background: #f59e0b; }
  .status-dot.danger { background: #e54835; }

  .metric-body {
    min-width: 0;
    display: grid;
    align-content: center;
    gap: 8px;
  }

  .label,
  .row-value span,
  .focus-title > span,
  .table-cell small {
    color: #4976a3;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .label,
  .budget-line,
  .remaining-line,
  .note {
    text-align: center;
  }

  .big-number {
    color: #172033;
    font-variant-numeric: tabular-nums;
    font-size: clamp(38px, 2.65vw, 54px);
    line-height: 0.95;
    font-weight: 640;
  }

  .card .big-number {
    text-align: center;
  }

  .budget-line,
  .remaining-line,
  .note,
  .stage-context {
    color: #667085;
    font-size: 12px;
    line-height: 1.25;
  }

  .remaining-line {
    color: #243147;
    font-weight: 760;
  }

  .progress {
    height: 7px;
    overflow: hidden;
    border-radius: 999px;
    background: #e6ebf1;
  }

  .progress-fill {
    height: 100%;
    max-width: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #2f75b5, #4d96d8);
  }

  .row {
    display: grid;
    grid-template-columns: minmax(180px, 1.3fr) repeat(3, minmax(120px, 0.8fr));
    gap: 20px;
    align-items: center;
    min-height: 70px;
    padding: 10px 4px;
    border-bottom: 1px solid #d9e2ec;
    background: transparent;
  }

  .row-value {
    display: grid;
    gap: 4px;
    font-variant-numeric: tabular-nums;
  }

  .row .big-number {
    font-size: 24px;
  }

  .row-value.end {
    text-align: right;
  }

  .row-chart {
    grid-column: 2 / -1;
    height: 5px;
    overflow: hidden;
    border-radius: 999px;
    background: #e1e8ef;
  }

  .row-chart span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: #3f6f9f;
  }

  .focus {
    display: grid;
    grid-template-columns: minmax(150px, 1fr) auto minmax(160px, 0.8fr);
    gap: 24px;
    align-items: center;
    min-height: 112px;
    padding: 16px 4px;
    border-bottom: 1px solid #cbd7e2;
    background: transparent;
  }

  .focus-title {
    display: grid;
    gap: 5px;
  }

  .focus-title p {
    max-width: 230px;
    margin: 1px 0 0;
    color: #69788b;
    font-size: 11px;
    line-height: 1.35;
  }

  .focus-context {
    display: grid;
    gap: 8px;
    justify-items: end;
    color: #526277;
    font-size: 12px;
    text-align: right;
  }

  .focus-context i,
  .status-cell i {
    width: 8px;
    height: 8px;
  }

  .donut {
    width: 116px;
    height: 116px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: conic-gradient(#287c91 0 var(--gauge), #e2e9ef var(--gauge) 360deg);
  }

  .donut > div {
    width: 84px;
    height: 84px;
    display: grid;
    place-content: center;
    gap: 3px;
    border-radius: 50%;
    text-align: center;
    background: #f5f7fa;
  }

  .donut .big-number {
    font-size: 23px;
  }

  .donut small {
    color: #68778a;
    font-size: 9px;
    font-weight: 750;
    text-transform: uppercase;
  }

  .table-row {
    display: grid;
    grid-template-columns: minmax(190px, 1.25fr) repeat(3, minmax(130px, 0.8fr));
    gap: 12px;
    align-items: center;
    min-height: 58px;
    padding: 8px 10px;
    border-bottom: 1px solid #dfe6ee;
  }

  .table-row:nth-child(even) {
    background: #f7f9fb;
  }

  .table-cell {
    display: grid;
    gap: 2px;
    font-variant-numeric: tabular-nums;
  }

  .table-row .big-number {
    font-size: 18px;
  }

  .microbar {
    width: 100%;
    height: 4px;
    overflow: hidden;
    border-radius: 999px;
    background: #e2e9ef;
  }

  .microbar em {
    display: block;
    height: 100%;
    background: #4b8790;
  }

  .status-cell {
    justify-content: flex-end;
    text-align: right;
  }

  .stage {
    display: grid;
    justify-items: center;
    align-content: center;
    min-height: 180px;
    padding: 20px;
    text-align: center;
    background: transparent;
  }

  .stage-title {
    min-height: 34px;
    color: #42526b;
    font-size: 13px;
    font-weight: 750;
  }

  .stage .big-number {
    margin-top: 12px;
    font-size: clamp(44px, 4vw, 72px);
  }

  .stage-rule {
    width: 34px;
    height: 2px;
    margin: 18px 0 10px;
    background: #3f6f9f;
  }

  .stage-chart {
    width: min(100%, 240px);
    display: grid;
    gap: 7px;
    margin-top: 18px;
  }

  .stage-chart > div {
    display: grid;
    grid-template-columns: 58px 1fr;
    gap: 8px;
    align-items: center;
  }

  .stage-chart span {
    color: #68778a;
    font-size: 9px;
    font-weight: 750;
    text-align: right;
    text-transform: uppercase;
  }

  .stage-chart i {
    height: 8px;
    overflow: hidden;
    border-radius: 2px;
    background: #e2e9ef;
  }

  .stage-chart em {
    display: block;
    height: 100%;
    background: #c2672d;
  }

  .stage-chart em.budget {
    background: #7f93a8;
  }

  @media (max-width: 720px) {
    .row,
    .focus,
    .table-row {
      grid-template-columns: 1fr;
      gap: 8px;
    }

    .row-value.end,
    .focus-context,
    .status-cell {
      justify-items: start;
      justify-content: flex-start;
      text-align: left;
    }

    .row-chart {
      grid-column: 1;
    }
  }
</style>
