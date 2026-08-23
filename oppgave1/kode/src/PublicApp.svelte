<script>
  import ExecutiveDashboard from '../components/ExecutiveDashboard.svelte';
  import LocalDataGate from '../../../shared/browser/LocalDataGate.svelte';
  import { loadTask1Data, TASK1_LOCAL_FILES } from './lib/loadTask1Data.js';

  let dataReady = false;
  let rows = [];
  let sourceMetadata = [];
  let sectionCode = 'all';
  let periodKey = 'latest';

  const loadLocalData = async (selection) => {
    const loaded = await loadTask1Data(selection);
    rows = loaded.rows;
    sourceMetadata = loaded.metadata;
    sectionCode = 'all';
    periodKey = 'latest';
    dataReady = true;
  };

  $: sections = [...new Map(rows.map((row) => [String(row.section_code), {
    value: String(row.section_code),
    label: String(row.section_label),
    sort: Number(row.section_sort ?? 0)
  }])).values()].sort((left, right) => left.sort - right.sort);
  $: periods = [...new Map(rows.map((row) => [String(row.end_period), {
    value: String(row.end_period),
    label: String(row.period_label),
    sort: Number(row.period_sort ?? row.end_period)
  }])).values()].sort((left, right) => right.sort - left.sort);
  $: effectivePeriod = periodKey === 'latest' ? periods[0]?.value : periodKey;
  $: currentRows = rows.filter((row) =>
    String(row.section_code) === sectionCode && String(row.end_period) === effectivePeriod
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
      <label class="public-picker cost-center-picker">
        <span>Kostnadssted</span>
        <select role="combobox" aria-label="Kostnadssted" bind:value={sectionCode}>
          {#each sections as section}<option value={section.value}>{section.label}</option>{/each}
        </select>
      </label>
      <label class="public-picker period-picker">
        <span>Rapportperiode</span>
        <select role="combobox" aria-label="Rapportperiode" bind:value={periodKey}>
          <option value="latest">Siste tilgjengelige · {periods[0]?.label?.toLocaleLowerCase('nb-NO')}</option>
          {#each periods as period}<option value={period.value}>{period.label}</option>{/each}
        </select>
      </label>
    </div>
  </ExecutiveDashboard>
{/if}

<style>
  :global(.public-filter-grid){align-items:end!important}.public-picker{display:grid!important;gap:5px}.public-picker>span{color:#668097;font-size:10px;font-weight:750;letter-spacing:.08em;text-transform:uppercase}.public-picker select{appearance:auto!important;text-overflow:ellipsis}.public-picker.period-picker{min-width:min(360px,100%)}@media(max-width:780px){.public-picker{width:100%}.public-picker.period-picker{min-width:0}}
</style>
