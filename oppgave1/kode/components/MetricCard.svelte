<script>
  export let row;
  export let featured = false;

  const hasValue = (value) => value !== null && value !== undefined && !Number.isNaN(Number(value));
  const nok1000 = (value) => hasValue(value)
    ? Number(value).toLocaleString('nb-NO', { maximumFractionDigits: 0 })
    : '–';
  const pct = (value) => hasValue(value)
    ? `${Number(value * 100).toLocaleString('nb-NO', { maximumFractionDigits: 0 })}%`
    : '–';
  const clampPercent = (value) => Math.max(0, Math.min(100, Number(value ?? 0) * 100));
  const statusLabel = (status) => ({
    danger: 'Over budsjett',
    warning: 'Nær budsjett'
  }[status] ?? 'Ikke vurdert');

  $: isRatio = row.tittel === 'Lønnsandel';
  $: hasBudget = hasValue(row.budsjett_nok1000);
  $: railValue = isRatio ? row.prosentverdi : row.budsjettandel;
  $: railWidth = `${clampPercent(railValue)}%`;
  $: ratioPercent = clampPercent(row.prosentverdi);
  $: actualValue = isRatio ? pct(row.prosentverdi) : nok1000(row.hovedbok_nok1000);
  $: remaining = Number(row.gjenstaar_nok1000 ?? 0);
</script>

<article
  class="metric-card status-{row.status ?? 'neutral'}"
  class:featured
  class:ratio-card={isRatio}
  data-metric-title={row.tittel}
>
  <header class="metric-header">
    <div>
      <h3>{row.tittel}</h3>
    </div>
    {#if row.status && row.status !== 'ok'}
      <span class="status-pill {row.status}">{statusLabel(row.status)}</span>
    {/if}
  </header>

  {#if isRatio}
    <div class="ratio-visual" role="img" aria-label="Lønnsandel: {actualValue}">
      <div class="ratio-chart">
        <svg viewBox="0 0 42 42" aria-hidden="true">
          <circle class="ratio-track" cx="21" cy="21" r="15.9155" pathLength="100"></circle>
          <circle
            class="ratio-slice"
            cx="21"
            cy="21"
            r="15.9155"
            pathLength="100"
            stroke-dasharray="{ratioPercent} {100 - ratioPercent}"
          ></circle>
        </svg>
        <strong>{actualValue}</strong>
      </div>
    </div>
  {:else}
    <div class="metric-value-row">
      <strong class="big-number">{actualValue}</strong>
      <span>NOK 1 000</span>
    </div>

    {#if hasBudget}
      <div class="comparison">
        <div><span>Budsjett</span><strong>{nok1000(row.budsjett_nok1000)}</strong></div>
        <div>
          <span>{remaining < 0 ? 'Over' : 'Gjenstår'}</span>
          <strong class:negative={remaining < 0}>{nok1000(Math.abs(remaining))}</strong>
        </div>
      </div>
      <div
        class="budget-rail {row.status ?? ''}"
        role="progressbar"
        aria-label="Brukt del av budsjettet"
        aria-valuenow={clampPercent(railValue)}
        aria-valuemin="0"
        aria-valuemax="100"
      ><span style:width={railWidth}></span><i title="Budsjettgrense"></i></div>
    {:else}
      <div class="missing-budget">
        <span></span>
        Budsjett mangler for dette utvalget
      </div>
    {/if}
  {/if}
</article>

<style>
  .metric-card {
    box-sizing: border-box;
    display: grid;
    grid-template-rows: auto auto 1fr;
    gap: 16px;
    min-width: 0;
    min-height: 220px;
    padding: 18px;
    border-top: 3px solid #8ec6e8;
    background: #ffffff;
  }

  .metric-card.featured {
    min-height: 220px;
    border-top-color: #2f80c2;
  }

  .metric-card.ratio-card {
    grid-template-rows: auto 1fr;
  }

  .metric-card.status-warning { border-top-color: #d89b31; }
  .metric-card.status-danger { border-top-color: #c95656; }
  .metric-card.status-ok { border-top-color: #3b9170; }

  .metric-header {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 10px;
  }

  .metric-header > div {
    min-width: 0;
  }

  .comparison span {
    color: #668097;
    font-size: 9px;
    font-weight: 750;
    letter-spacing: 0.09em;
    text-transform: uppercase;
  }

  .metric-header h3 {
    margin: 0;
    color: #17324b;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.25;
  }

  .status-pill {
    flex: 0 0 auto;
    padding: 4px 6px;
    border-radius: 4px;
    color: #527087;
    background: #eaf1f6;
    font-size: 8px;
    font-weight: 750;
    white-space: nowrap;
  }

  .status-pill.ok { color: #246a50; background: #e4f2ec; }
  .status-pill.warning { color: #8a5a08; background: #fbf0d8; }
  .status-pill.danger { color: #963b3b; background: #f9e4e4; }

  .metric-value-row {
    display: flex;
    align-items: baseline;
    gap: 7px;
  }

  .big-number {
    overflow: hidden;
    color: #0b1f36;
    font-size: clamp(32px, 2.6vw, 46px);
    font-weight: 690;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.045em;
    line-height: 0.95;
    text-overflow: ellipsis;
  }

  .metric-value-row > span {
    color: #6d8294;
    font-size: 9px;
    font-weight: 700;
    white-space: nowrap;
  }

  .comparison {
    align-self: end;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .comparison > div {
    display: grid;
    gap: 2px;
    padding-top: 9px;
    border-top: 1px solid #e0e8ee;
  }

  .comparison strong {
    color: #294860;
    font-size: 14px;
    font-variant-numeric: tabular-nums;
  }

  .comparison strong.negative { color: #a73f3f; }

  .budget-rail {
    position: relative;
    align-self: end;
    height: 7px;
    overflow: visible;
    border-radius: 2px;
    background: #e2ebf1;
  }

  .budget-rail span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: #2f80c2;
  }

  .budget-rail.ok span { background: #3b9170; }
  .budget-rail.warning span { background: #d89b31; }
  .budget-rail.danger span { background: #c95656; }

  .budget-rail i {
    position: absolute;
    top: -3px;
    right: 0;
    width: 2px;
    height: 13px;
    border-radius: 1px;
    background: #0b1f36;
  }

  .ratio-visual {
    align-self: center;
    display: grid;
    place-items: center;
  }

  .ratio-chart {
    position: relative;
    width: min(148px, 100%);
    aspect-ratio: 1;
  }

  .ratio-chart svg {
    display: block;
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .ratio-track,
  .ratio-slice {
    fill: none;
    stroke-width: 7;
  }

  .ratio-track { stroke: #dce8f0; }
  .ratio-slice { stroke: #2f80c2; }

  .ratio-chart strong {
    position: absolute;
    top: 50%;
    left: 50%;
    color: #0b1f36;
    font-size: clamp(30px, 2.4vw, 38px);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.04em;
    transform: translate(-50%, -50%);
  }

  .missing-budget {
    align-self: end;
    display: flex;
    align-items: center;
    gap: 7px;
    padding-top: 10px;
    border-top: 1px solid #e0e8ee;
    color: #6d8294;
    font-size: 10px;
  }

  .missing-budget span {
    width: 7px;
    height: 7px;
    border: 1px solid #8da2b3;
    border-radius: 50%;
  }

  @media (max-width: 780px) {
    .metric-card { min-height: 192px; }
    .big-number { font-size: 38px; }
    .ratio-chart { width: min(160px, 100%); }
  }
</style>
