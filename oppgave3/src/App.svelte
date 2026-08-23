<script>
  import { parquetReadObjects } from 'hyparquet';
  import { compressors } from 'hyparquet-compressors';
  import AppHeader from '../components/AppHeader.svelte';
  import MonthlyCloseReport from '../components/MonthlyCloseReport.svelte';
  import WorkflowInvoiceReport from '../components/WorkflowInvoiceReport.svelte';
  import LocalDataGate from '../../shared/browser/LocalDataGate.svelte';
  import { requireLocalFiles } from '../../shared/browser/localDataFolder.js';

  const requiredLocalFiles = [
    'workflow_source_metadata.parquet',
    'monthly_close_summary.parquet',
    'monthly_close_invoices.parquet',
    'monthly_close_validation.parquet',
    'workflow_invoice_status.parquet',
    'workflow_invoice_validation.parquet',
    'workflow_invoice_events.parquet'
  ];

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
  let workflowRows = null;
  let workflowEvents = null;
  let localFiles = null;
  const isPublicBuild = __PUBLIC_BUILD__;

  const readParquet = async (file) => parquetReadObjects({
    file: await file.arrayBuffer(),
    compressors
  });

  const loadLocalData = async (selection) => {
    baseLoading = true;
    error = '';
    try {
      localFiles = requireLocalFiles(selection, requiredLocalFiles);
      [metadata, monthlySummary, monthlyInvoices, monthlyValidations] = await Promise.all([
        readParquet(localFiles['workflow_source_metadata.parquet']),
        readParquet(localFiles['monthly_close_summary.parquet']),
        readParquet(localFiles['monthly_close_invoices.parquet']),
        readParquet(localFiles['monthly_close_validation.parquet'])
      ]);
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
      workflowRows = await readParquet(localFiles['workflow_invoice_status.parquet']);
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    } finally {
      workflowLoading = false;
    }
  }

  async function loadWorkflowEvents(row) {
    if (!workflowEvents) {
      workflowEvents = await readParquet(localFiles['workflow_invoice_events.parquet']);
    }
    return workflowEvents;
  }
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
  <AppHeader {view} {metadata} candidateCount={monthlyInvoices.length} onNavigate={openView} />

  <main id="main-content" tabindex="-1">
    {#if error}
      <section class="state-card error-state" role="alert">
        <span class="state-mark">!</span>
        <div>
          <h1>Dataene kunne ikke lastes</h1>
          <p>{error}. Last siden på nytt og velg den oppgavespesifikke datamappen på nytt.</p>
        </div>
      </section>
    {:else if view === 'close'}
      <MonthlyCloseReport
        summary={monthlySummary}
        invoices={monthlyInvoices}
        validations={monthlyValidations}
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
