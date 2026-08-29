<script>
  import AppHeader from '../components/AppHeader.svelte';
  import MonthlyCloseReport from '../components/MonthlyCloseReport.svelte';
  import WorkflowInvoiceReport from '../components/WorkflowInvoiceReport.svelte';
  import LocalDataGate from '../../shared/browser/LocalDataGate.svelte';
  import {
    COMMON_DATA_FILES,
    requireCommonDataFiles
  } from '../../shared/browser/localDataFolder.js';
  import { loadTask3Data } from './buildTask3Data.js';

  const requiredLocalFiles = COMMON_DATA_FILES;

  let view = 'close';
  let dataReady = false;
  let baseLoading = false;
  let workflowLoading = false;
  let error = '';
  let dataFolderName = '';
  let metadata = [];
  let monthlySummary = [];
  let monthlyInvoices = [];
  let monthlyValidations = [];
  let selectedYear = '2026';
  let selectedMonth = '';
  let selectedPeriod = '';
  let workflowRows = null;
  let workflowEvents = null;
  let task3Data = null;
  const isPublicBuild = __PUBLIC_BUILD__;

  const loadLocalData = async (selection) => {
    baseLoading = true;
    error = '';
    try {
      const files = requireCommonDataFiles(selection);
      task3Data = await loadTask3Data(files);
      metadata = task3Data.metadata;
      monthlySummary = task3Data.summary;
      monthlyInvoices = task3Data.invoices;
      monthlyValidations = task3Data.validations;
      const availablePeriods = [...new Set(monthlySummary.map((row) => String(row.periode)))].sort();
      const availableYears = [...new Set(availablePeriods.map((period) => period.slice(0, 4)))].sort();
      selectedYear = availableYears.includes('2026') ? '2026' : availableYears.at(-1) ?? '';
      selectedMonth = availablePeriods
        .filter((period) => period.startsWith(selectedYear))
        .at(-1)
        ?.slice(4) ?? '';
      dataFolderName = selection.folderName;
      dataReady = true;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
      dataReady = false;
      throw cause;
    } finally {
      baseLoading = false;
    }
  };

  async function openView(nextView) {
    view = nextView;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (nextView !== 'workflow' || workflowRows) return;
    workflowLoading = true;
    try {
      workflowRows = await task3Data.loadWorkflow();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    } finally {
      workflowLoading = false;
    }
  }

  async function loadWorkflowEvents(row) {
    if (!workflowEvents) {
      workflowEvents = await task3Data.loadEvents();
    }
    return workflowEvents;
  }

  function chooseYear(year) {
    selectedYear = year;
    selectedMonth = monthlyPeriods
      .filter((period) => period.startsWith(year))
      .at(0)
      ?.slice(4) ?? '';
  }

  const monthLabel = (month) => {
    const label = new Intl.DateTimeFormat('nb-NO', { month: 'long' }).format(
      new Date(2026, Number(month) - 1, 1)
    );
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  $: monthlyPeriods = [...new Set(monthlySummary.map((row) => String(row.periode)))]
    .sort((left, right) => right.localeCompare(left));
  $: monthlyYears = [...new Set(monthlyPeriods.map((period) => period.slice(0, 4)))].sort(
    (left, right) => right.localeCompare(left)
  );
  $: yearPeriods = monthlyPeriods.filter((period) => period.startsWith(selectedYear));
  $: selectedPeriod = selectedYear && selectedMonth ? `${selectedYear}${selectedMonth}` : '';
  $: if (yearPeriods.length && !yearPeriods.some((period) => period.slice(4) === selectedMonth)) {
    selectedMonth = yearPeriods[0].slice(4);
  }
  $: selectedMonthlySummary = monthlySummary.filter(
    (row) => String(row.periode) === selectedPeriod
  );
  $: latestMonthlyPeriod = monthlyPeriods[0] ?? '';
  $: selectedMonthlyInvoices = selectedPeriod === latestMonthlyPeriod ? monthlyInvoices : [];
  $: currentMonthlyInvoices = selectedMonthlyInvoices.filter((row) => row.er_aktuell === true);
</script>

<svelte:head>
  <title>{view === 'close' ? 'Månedsavslutning' : 'Fakturaflyt'} | Oppgave 3</title>
</svelte:head>

{#if !dataReady && !baseLoading}
  <LocalDataGate
    taskLabel="Oppgave 3 · Regnskapskontroll"
    requiredFiles={requiredLocalFiles}
    onSelect={loadLocalData}
  />
{:else if baseLoading}
  <main class="standalone-state state-card" aria-live="polite">
    <span class="spinner" aria-hidden="true"></span>
    <div><h1>Leser lokale data</h1><p>Kontrollgrunnlaget blir liggende i denne nettleserfanen.</p></div>
  </main>
{:else}
<div class="app-frame" data-folder={dataFolderName}>
  <AppHeader {view} {metadata} candidateCount={currentMonthlyInvoices.length} onNavigate={openView} />

  <main id="main-content" tabindex="-1">
    {#if error}
      <section class="state-card error-state" role="alert">
        <span class="state-mark">!</span>
        <div>
          <h1>Dataene kunne ikke lastes</h1>
          <p>{error}. Last siden på nytt og velg den felles mappen med de 12 råfilene.</p>
        </div>
      </section>
    {:else if view === 'close'}
      <section class="period-control" aria-label="Rapportperiode">
        <div class="year-control">
          <span>År</span>
          <div class="year-pills" role="group" aria-label="Velg rapportår">
            {#each monthlyYears as year}
              <button
                type="button"
                class:active={selectedYear === year}
                aria-pressed={selectedYear === year}
                on:click={() => chooseYear(year)}
              >{year}</button>
            {/each}
          </div>
        </div>
        <label class="month-control">
          <span>Måned</span>
          <select bind:value={selectedMonth}>
            {#each yearPeriods as period}
              <option value={period.slice(4)}>{monthLabel(period.slice(4))}</option>
            {/each}
          </select>
        </label>
        <p class="period-help">Viser månedstall og hittil i år til og med valgt måned.</p>
        {#if selectedPeriod !== latestMonthlyPeriod}
          <p class="period-note">Historiske tall vises. Fakturakandidater og Excel-utkast lages bare for den nyeste perioden.</p>
        {/if}
      </section>
      <MonthlyCloseReport
        summary={selectedMonthlySummary}
        invoices={selectedMonthlyInvoices}
        validations={selectedPeriod === latestMonthlyPeriod ? monthlyValidations : []}
        showDownload={!isPublicBuild}
      />
    {:else if workflowLoading}
      <section class="state-card" aria-live="polite">
        <span class="spinner" aria-hidden="true"></span>
        <div><h1>Henter fakturaflyten</h1><p>Workflowdata lastes først når du åpner arbeidsområdet.</p></div>
      </section>
    {:else}
      <WorkflowInvoiceReport rows={workflowRows ?? []} loadEvents={loadWorkflowEvents} />
    {/if}
  </main>
</div>
{/if}
