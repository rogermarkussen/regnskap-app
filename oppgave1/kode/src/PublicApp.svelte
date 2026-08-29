<script>
  import ExecutiveDashboard from '../components/ExecutiveDashboard.svelte';
  import LocalDataGate from '../../../shared/browser/LocalDataGate.svelte';
  import { loadTask1Data, TASK1_LOCAL_FILES } from './lib/loadTask1Data.js';

  let dataReady = false;
  let rows = [];
  let sourceMetadata = [];
  let yearKey = '';
  let periodKey = 'latest';

  const availableYears = (dataRows) => [...new Set(
    dataRows.map((row) => Number(row.period_year)).filter(Number.isFinite)
  )].sort((left, right) => left - right);

  const selectYear = (year) => {
    yearKey = String(year);
    periodKey = 'latest';
  };

  const loadLocalData = async (selection) => {
    const loaded = await loadTask1Data(selection);
    rows = loaded.rows;
    sourceMetadata = loaded.metadata;
    yearKey = String(availableYears(loaded.rows).at(-1) ?? '');
    periodKey = 'latest';
    dataReady = true;
  };

  $: years = availableYears(rows);
  $: effectiveYear = Number(yearKey);
  $: periods = [...new Map(rows
    .filter((row) => Number(row.period_year) === effectiveYear)
    .map((row) => [String(row.end_period), {
    value: String(row.end_period),
    label: String(row.period_label),
    sort: Number(row.period_sort ?? row.end_period)
  }])).values()].sort((left, right) => right.sort - left.sort);
  $: effectivePeriod = periodKey === 'latest' ? periods[0]?.value : periodKey;
  $: currentRows = rows.filter((row) =>
    String(row.section_code) === 'all' && String(row.end_period) === effectivePeriod
  );
  $: fin154301 = currentRows.filter((row) => row.finansiering === '154301');
  $: fin154345 = currentRows.filter((row) => row.finansiering === '154345');
  $: fin154322 = currentRows.filter((row) => row.finansiering === '154322+045101');
</script>

{#if !dataReady}
  <LocalDataGate
    taskLabel="Oppgave 1 · Økonomisk status"
    requiredFiles={TASK1_LOCAL_FILES}
    onSelect={loadLocalData}
  />
{:else}
  <ExecutiveDashboard
    fin154301Data={fin154301}
    fin154345Data={fin154345}
    fin154322Data={fin154322}
    {sourceMetadata}
  >
    <div slot="filters" class="evidence-filter-grid public-filter-grid">
      <label class="public-picker period-picker">
        <span>Til og med</span>
        <select role="combobox" aria-label="Rapportperiode" bind:value={periodKey}>
          <option value="latest">Siste tilgjengelige · {periods[0]?.label?.toLocaleLowerCase('nb-NO')}</option>
          {#each periods as period}<option value={period.value}>{period.label}</option>{/each}
        </select>
      </label>
      <fieldset class="year-picker">
        <legend>År</legend>
        <div class="year-options" aria-label="Velg år">
          {#each years as year}
            <button
              type="button"
              class:active={effectiveYear === year}
              aria-pressed={effectiveYear === year}
              aria-label={`Vis ${year}`}
              on:click={() => selectYear(year)}
            >{String(year).slice(-2)}</button>
          {/each}
        </div>
      </fieldset>
    </div>
  </ExecutiveDashboard>
{/if}

<style>
  :global(.public-filter-grid) {
    align-items: end !important;
    width: 100%;
  }

  .public-picker {
    display: grid !important;
    gap: 5px;
  }

  .public-picker > span,
  .year-picker legend {
    color: #668097;
    font-size: 10px;
    font-weight: 750;
    letter-spacing: .08em;
    text-transform: uppercase;
  }

  .public-picker select {
    appearance: auto !important;
    text-overflow: ellipsis;
  }

  .public-picker.period-picker {
    min-width: min(360px, 100%);
  }

  .year-picker {
    display: grid;
    flex: 0 0 auto;
    gap: 5px;
    margin: 0 4px 0 auto;
    padding: 0;
    border: 0;
  }

  .year-picker legend {
    margin: 0;
    padding: 0;
  }

  .year-options {
    display: flex;
    gap: 4px;
    padding: 4px;
    border: 1px solid #c7d8e4;
    border-radius: 11px;
    background: #edf4f8;
    box-shadow: inset 0 1px 2px rgba(11, 31, 54, .05);
  }

  .year-options button {
    min-width: 42px;
    height: 38px;
    padding: 0 10px;
    border: 0;
    border-radius: 8px;
    color: #45657d;
    background: transparent;
    font-size: 13px;
    font-weight: 750;
    font-variant-numeric: tabular-nums;
    cursor: pointer;
    transition: color 140ms ease, background 140ms ease, box-shadow 140ms ease;
  }

  .year-options button:hover {
    color: #123e63;
    background: #ffffff;
  }

  .year-options button.active {
    color: #ffffff;
    background: #1f6fa8;
    box-shadow: 0 2px 6px rgba(18, 62, 99, .22);
  }

  .year-options button:focus-visible {
    outline: 3px solid rgba(47, 128, 194, .26);
    outline-offset: 2px;
  }

  @media (max-width: 980px) {
    .year-picker {
      margin-left: 0;
    }
  }

  @media (max-width: 780px) {
    .public-picker {
      width: 100%;
    }

    .public-picker.period-picker {
      min-width: 0;
    }

    .year-picker {
      width: 100%;
    }

    .year-options button {
      flex: 1 1 0;
    }
  }
</style>
