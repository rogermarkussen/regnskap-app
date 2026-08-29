<script>
  import { parquetReadObjects } from 'hyparquet';
  import { compressors } from 'hyparquet-compressors';
  import writeExcelFile from 'write-excel-file/browser';
  import {
    displayLabel,
    filterReportRows,
    reportTotals,
    selectReportRows
  } from './lib/reportModel.js';
  import {
    createTask2WorkbookSheets,
    task2WorkbookFilename
  } from './lib/task2ExcelExport.js';
  import LocalDataGate from '../../../shared/browser/LocalDataGate.svelte';
  import { requireLocalFiles } from '../../../shared/browser/localDataFolder.js';

  const requiredLocalFiles = ['task2-report.parquet'];

  const reportOptions = [
    { value: '154301', label: '154301' },
    { value: '154345', label: '154345' },
    { value: '154322+045101', label: '154322 + 045101' },
    { value: 'alle', label: 'Alle finansieringer' }
  ];
  const monthNames = [
    ['Jan', 'Januar'], ['Feb', 'Februar'], ['Mar', 'Mars'], ['Apr', 'April'],
    ['Mai', 'Mai'], ['Jun', 'Juni'], ['Jul', 'Juli'], ['Aug', 'August'],
    ['Sep', 'September'], ['Okt', 'Oktober'], ['Nov', 'November'], ['Des', 'Desember']
  ];

  let loading = false;
  let dataReady = false;
  let loadError = '';
  let dataFolderName = '';
  let rows = [];
  let sections = [];
  let budgetVersion = '2026B';
  let selectedYear = 2026;
  let financing = '154301';
  let reportPeriod = 'latest';
  let sectionCode = 'all';
  let search = '';
  let mainGroup = 'alle';
  let level = 'oversikt';
  let view = 'virksomhet';
  let expandedGroups = [];
  let exporting = false;
  let total = {};
  let summaryRows = [];
  let mainGroups = [];
  let groupKeys = [];

  const number = (value, digits = 0) =>
    value === null || value === undefined
      ? '–'
      : Number(value).toLocaleString('nb-NO', {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits
        });

  const percent = (value) =>
    value === null || value === undefined ? '–' : `${number(Number(value) * 100, 1)} %`;

  const validParam = (value, options, fallback) =>
    options.some((option) => option.value === value) ? value : fallback;

  const resetDrilldown = () => {
    mainGroup = 'alle';
    search = '';
    expandedGroups = [];
  };

  const setFinancing = (value) => {
    financing = value;
    resetDrilldown();
  };

  const toggleGroup = (key) => {
    expandedGroups = expandedGroups.includes(key)
      ? expandedGroups.filter((candidate) => candidate !== key)
      : [...expandedGroups, key];
  };

  const toggleAllGroups = () => {
    expandedGroups = expandedGroups.length === groupKeys.length ? [] : [...groupKeys];
  };

  const rowIdentity = (row) => ({
    Seksjon: selectedSection.label,
    Hovedgruppe: row.hovedgruppe,
    Radtype: row.row_type,
    'Kontogruppe/konto': displayLabel(row.radtekst),
    Kontonummer: row.konto,
    Kontonavn: row.konto_navn,
    Datastatus: row.data_status
  });

  const downloadExcel = async () => {
    exporting = true;
    try {
      const exportRows = filterReportRows(hierarchicalRows, {
        mainGroup,
        level,
        search,
        openGroups: expandedGroups
      });
      const virksomhetRows = exportRows.map((row) => ({
        ...rowIdentity(row),
        [`Budsjett ${periodText}`]: row.virksomhet_budsjett_tusen,
        Hovedbok: row.hovedbok_tusen,
        Avvik: row.avvik_tusen,
        Årsbudsjett: row.aarets_budsjett_tusen,
        'Forbruk av årsbudsjett': row.forbruk_av_aarets_budsjett,
        Investeringsbudsjett: row.investeringsbudsjett_tusen,
        Investeringsregnskap: row.investeringsregnskap_tusen
      }));
      const kontantRows = exportRows.map((row) => ({
        ...rowIdentity(row),
        Kontantbudsjett: row.kontant_budsjett_tusen,
        Kontant: row.kontant_tusen,
        Kontantavvik: row.kontant_avvik_tusen
      }));
      const maanedRows = exportRows.map((row) => ({
        ...rowIdentity(row),
        ...Object.fromEntries(
          monthOptions.map(({ month, exportLabel }) => [
            exportLabel,
            row[`budsjett_${String(month).padStart(2, '0')}_tusen`]
          ])
        ),
        'Totalt alle måneder': row.aarets_budsjett_tusen
      }));
      const metadata = [
        { Felt: 'Finansiering', Verdi: selectedReport.label },
        { Felt: 'Periode', Verdi: periodText },
        { Felt: 'Seksjon / kostnadssted', Verdi: selectedSection.label },
        { Felt: 'Budsjettversjon', Verdi: budgetVersion },
        { Felt: 'Investeringsregel', Verdi: 'Budsjett dim_1=212 · Regnskap dim_4=154345' },
        { Felt: 'Enhet', Verdi: 'NOK 1 000' },
        { Felt: 'Hovedgruppefilter', Verdi: mainGroup === 'alle' ? 'Alle hovedgrupper' : mainGroup },
        { Felt: 'Nivåfilter', Verdi: level },
        { Felt: 'Søk', Verdi: search || 'Ingen' },
        { Felt: 'Rader i Virksomhet-fanen', Verdi: virksomhetRows.length },
        { Felt: 'Rader i Kontant-fanen', Verdi: kontantRows.length },
        { Felt: 'Rader i Måneder-fanen', Verdi: maanedRows.length },
        { Felt: 'Kilde', Verdi: hierarchicalRows[0]?.source_file ?? '' }
      ];
      const workbookSheets = createTask2WorkbookSheets({
        virksomhetRows,
        kontantRows,
        maanedRows,
        metadata
      });
      await writeExcelFile(workbookSheets).toFile(
        task2WorkbookFilename(financing, periodText, sectionCode)
      );
    } finally {
      exporting = false;
    }
  };

  const loadLocalData = async (selection) => {
    loading = true;
    loadError = '';
    try {
      const files = requireLocalFiles(selection, requiredLocalFiles);
      const loadedRows = await parquetReadObjects({
        file: await files['task2-report.parquet'].arrayBuffer(),
        compressors
      });
      const columns = new Set(Object.keys(loadedRows[0] ?? {}));
      if (!['section_code', 'finansiering', 'rapportperiode', 'row_type'].every((name) => columns.has(name))) {
        throw new Error('Datakilden har et ukjent format');
      }
      const modernRows = loadedRows.some((row) => Number.isFinite(Number(row.report_year)))
        ? loadedRows
        : loadedRows.filter((row) => row.rapportperiode !== 'latest');
      rows = modernRows.map((row) => {
        const legacyPeriod = { p1_3: 202603, p1_4: 202604, p1_6: 202606 }[row.rapportperiode];
        const periodTo = Number(row.period_to ?? legacyPeriod);
        const reportYear = Number(row.report_year ?? Math.trunc(periodTo / 100));
        return {
          ...row,
          ...Object.fromEntries(monthNames.map((_, index) => {
            const month = String(index + 1).padStart(2, '0');
            return [
              `budsjett_${month}_tusen`,
              row[`budsjett_${reportYear}${month}_tusen`] ?? row[`budsjett_${month}_tusen`]
            ];
          })),
          report_year: reportYear,
          period_to: periodTo,
          rapportperiode: String(periodTo),
          excel_row: Number(row.excel_row),
          section_sort: Number(row.section_sort)
        };
      });
      budgetVersion = String(rows[0]?.budsjettversjon ?? budgetVersion);
      dataFolderName = selection.folderName;
      dataReady = true;
      sections = [...new Map(
        rows.map((row) => [row.section_code, {
          value: row.section_code,
          label: row.section_label,
          name: row.section_name,
          sort: row.section_sort
        }])
      ).values()].sort((left, right) => Number(left.sort) - Number(right.sort));

      const dataYears = rows.map((row) => Number(row.report_year)).filter(Number.isFinite);
      if (dataYears.length) selectedYear = Math.max(...dataYears);

      const params = new URLSearchParams(window.location.search);
      financing = validParam(params.get('finansiering'), reportOptions, financing);
      const yearParam = Number(params.get('aar'));
      if ([...new Set(dataYears)].includes(yearParam)) selectedYear = yearParam;
      reportPeriod = params.get('periode') ?? reportPeriod;
      sectionCode = validParam(params.get('seksjon'), sections, sectionCode);
    } catch (error) {
      loadError = error instanceof Error ? error.message : 'Rapportdata kunne ikke lastes';
      dataReady = false;
      throw error;
    } finally {
      loading = false;
    }
  };

  $: availableYears = [...new Set(rows.map((row) => Number(row.report_year)).filter(Number.isFinite))]
    .sort((left, right) => right - left);
  $: availablePeriods = [...new Set(rows
    .filter((row) => Number(row.report_year) === selectedYear)
    .map((row) => String(row.rapportperiode)))]
    .sort();
  $: effectivePeriod = reportPeriod === 'latest' || !availablePeriods.includes(reportPeriod)
    ? availablePeriods.at(-1)
    : reportPeriod;
  $: periodOptions = availablePeriods.map((period) => ({
    value: period,
    label: `Januar–${monthNames[Number(period.slice(4)) - 1]?.[1].toLocaleLowerCase('nb-NO')} ${period.slice(0, 4)}`
  })).reverse();
  $: monthOptions = monthNames.map(([shortLabel, exportLabel], index) => ({
    month: index + 1,
    shortLabel,
    exportLabel
  }));
  $: hierarchicalRows = selectReportRows(rows, {
    financing,
    reportPeriod: effectivePeriod,
    sectionCode
  });
  $: ({ grandTotal: total, summaryRows, mainGroups, groupKeys } = reportTotals(hierarchicalRows));
  $: filteredRows = filterReportRows(hierarchicalRows, {
    mainGroup,
    level,
    search,
    openGroups: expandedGroups
  });
  $: selectedReport = reportOptions.find((option) => option.value === financing) ?? reportOptions[0];
  $: selectedSection = sections.find((option) => option.value === sectionCode) ?? {
    value: 'all',
    label: 'Alle seksjoner',
    name: 'Alle seksjoner'
  };
  $: periodText = hierarchicalRows[0]?.periodetekst ?? '01–03 2026';
  $: if (dataReady && !loading && !loadError && typeof window !== 'undefined') {
    const params = new URLSearchParams();
    if (financing !== '154301') params.set('finansiering', financing);
    if (selectedYear !== availableYears[0]) params.set('aar', String(selectedYear));
    if (reportPeriod !== 'latest') params.set('periode', effectivePeriod);
    if (sectionCode !== 'all') params.set('seksjon', sectionCode);
    const query = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
  }
</script>

<svelte:head>
  <title>{selectedSection.label} | Kontogruppering</title>
</svelte:head>

{#if !dataReady && !loading}
  <LocalDataGate
    taskLabel="Oppgave 2 · Kontogruppering"
    requiredFiles={requiredLocalFiles}
    onSelect={loadLocalData}
  />
{:else if loading}
  <main class="state-shell" aria-live="polite">
    <div class="loader" aria-hidden="true"></div>
    <h1>Bygger rapporten</h1>
    <p>Leser kontogrupper og operative tall.</p>
  </main>
{:else if loadError}
  <main class="state-shell error-state" role="alert">
    <span class="state-code">Datakilde</span>
    <h1>Rapporten kan ikke åpnes</h1>
    <p>{loadError}. Bygg rapportdata på nytt og last siden igjen.</p>
  </main>
{:else}
  <main class="report-shell">
    <header class="masthead">
      <div class="masthead-copy">
        <span class="eyebrow">Oppgave 2 · Regnskap</span>
        <h1>Kontogruppering</h1>
        <p>Virksomhets-, investerings- og kontantregnskap. Beløp i NOK 1 000.</p>
      </div>
      <div class="period-stamp" aria-label={`Rapportperiode ${periodText}`}>
        <span>Periode</span>
        <strong>{periodText}</strong>
      </div>
    </header>

    <section class="scope-bar" aria-label="Rapportfilter">
      <div class="scope-heading">
        <span>Rapportutvalg</span>
        <strong>{selectedSection.name}</strong>
      </div>
      <label class="scope-select">
        <span>Seksjon / kostnadssted</span>
        <select bind:value={sectionCode} on:change={resetDrilldown}>
          {#each sections as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </label>
      <div class="scope-period">
        <span>Rapportperiode</span>
        <div class="period-switch period-selects">
          <label>
            <span>År</span>
            <select bind:value={selectedYear} on:change={() => { reportPeriod = 'latest'; resetDrilldown(); }}>
              {#each availableYears as year}<option value={year}>{year}</option>{/each}
            </select>
          </label>
          <label>
            <span>Til og med</span>
            <select bind:value={reportPeriod} on:change={resetDrilldown}>
              <option value="latest">Nyaste tilgjengelege månad</option>
              {#each periodOptions as option}<option value={option.value}>{option.label}</option>{/each}
            </select>
          </label>
        </div>
      </div>
    </section>

    <nav class="finance-switch" aria-label="Velg finansiering">
      {#each reportOptions as option}
        <button
          type="button"
          class:active={financing === option.value}
          aria-pressed={financing === option.value}
          on:click={() => setFinancing(option.value)}>{option.label}</button
        >
      {/each}
    </nav>

    <div class="context-line">
      <span>{selectedReport.label}</span>
      <span>{periodText}</span>
      <span>{selectedSection.label}</span>
      <span>Budsjett {budgetVersion}</span>
    </div>

    <details class="report-help">
      <summary>Slik leses rapporten</summary>
      <div class="help-grid">
        <p><strong>Hovedbok</strong><span>Regnskapsførte kostnader i {periodText}.</span></p>
        <p><strong>Budsjett</strong><span>Virksomhetsbudsjett for samme periode.</span></p>
        <p><strong>Avvik</strong><span>Budsjett minus hovedbok. Et negativt tall betyr at forbruket er høyere enn budsjettet.</span></p>
        <p><strong>Forbruk</strong><span>Hovedbok som andel av hele årsbudsjettet.</span></p>
        <p><strong>Kontant</strong><span>Utbetalinger og innbetalinger fra kontantregnskapet.</span></p>
        <p><strong>Investering</strong><span>Budsjett med dim_1 = 212 og hovedbok med finansiering 154345.</span></p>
        <p><strong>Seksjon</strong><span>Operative tall filtrert på seksjonskoden i dim_1.</span></p>
        <p><strong>Tom verdi</strong><span>«–» betyr at kilden ikke har en tallverdi.</span></p>
      </div>
    </details>

    <section class="metric-grid" aria-label="Nøkkeltall">
      <article>
        <span>Hovedbok</span><strong>{number(total.hovedbok_tusen)}</strong><small>Akkumulert {periodText}</small>
      </article>
      <article>
        <span>Budsjett</span><strong>{number(total.virksomhet_budsjett_tusen)}</strong><small>Akkumulert {periodText}</small>
      </article>
      <article class:negative={Number(total.avvik_tusen) < 0}>
        <span>Avvik</span><strong>{number(total.avvik_tusen)}</strong><small>Budsjett minus hovedbok</small>
      </article>
      <article>
        <span>Forbruk</span><strong>{percent(total.forbruk_av_aarets_budsjett)}</strong><small>Av årsbudsjettet</small>
      </article>
    </section>

    <section class="panel overview-panel">
      <div class="panel-heading">
        <div><span class="kicker">Sammendrag</span><h2>Hovedgrupper</h2></div>
        <span class="row-count">{summaryRows.length} totaler</span>
      </div>
      <div class="table-scroll compact">
        <table>
          <thead>
            <tr><th>Kontogruppe</th><th>Budsjett</th><th>Hovedbok</th><th>Avvik</th><th>Årsbudsjett</th><th>Forbruk</th><th>Investeringsbudsjett</th><th>Investeringsregnskap</th></tr>
          </thead>
          <tbody>
            {#each summaryRows as row}
              <tr class:grand-total={row.radtekst === 'Driftskostnader'}>
                <th>{row.radtekst}</th>
                <td>{number(row.virksomhet_budsjett_tusen)}</td>
                <td>{number(row.hovedbok_tusen)}</td>
                <td class:bad={Number(row.avvik_tusen) < 0}>{number(row.avvik_tusen)}</td>
                <td>{number(row.aarets_budsjett_tusen)}</td>
                <td>{percent(row.forbruk_av_aarets_budsjett)}</td>
                <td>{number(row.investeringsbudsjett_tusen)}</td>
                <td>{number(row.investeringsregnskap_tusen)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel detail-panel">
      <div class="panel-heading detail-heading">
        <div><span class="kicker">Detaljer</span><h2>Kontogrupper og kontoer</h2></div>
        <button class="export" type="button" disabled={exporting} on:click={downloadExcel}>
          {exporting ? 'Lager Excel…' : 'Eksporter Excel'}
        </button>
      </div>

      <div class="toolbar">
        <label class="search">
          <span>Søk</span>
          <input bind:value={search} type="search" placeholder="Kontonummer, konto eller kontogruppe" />
        </label>
        <label>
          <span>Hovedgruppe</span>
          <select bind:value={mainGroup}>
            <option value="alle">Alle hovedgrupper</option>
            {#each mainGroups as name}<option value={name}>{name}</option>{/each}
          </select>
        </label>
        <label>
          <span>Nivå</span>
          <select bind:value={level}>
            <option value="oversikt">Kontogrupper</option>
            <option value="konto">Bare kontoer</option>
          </select>
        </label>
        <div class="segmented" aria-label="Velg tallvisning">
          <button type="button" class:active={view === 'virksomhet'} aria-pressed={view === 'virksomhet'} on:click={() => (view = 'virksomhet')}>Virksomhet</button>
          <button type="button" class:active={view === 'kontant'} aria-pressed={view === 'kontant'} on:click={() => (view = 'kontant')}>Kontant</button>
          <button type="button" class:active={view === 'maaned'} aria-pressed={view === 'maaned'} on:click={() => (view = 'maaned')}>Måneder</button>
        </div>
      </div>

      <div class="result-bar">
        <div class="result-meta">Viser <strong>{filteredRows.length}</strong> rader</div>
        {#if level === 'oversikt'}
          <button class="expand-all" type="button" on:click={toggleAllGroups}>
            {expandedGroups.length === groupKeys.length ? 'Lukk alle grupper' : 'Åpne alle grupper'}
          </button>
        {/if}
      </div>

      {#if view === 'kontant' && sectionCode !== 'all'}
        <p class="source-warning">Kontantkilden har ikke en pålitelig seksjonsfordeling. Kontantverdier vises derfor ikke når en seksjon er valgt.</p>
      {:else if view === 'kontant' && (total.kontant_tusen === null || total.kontant_tusen === undefined)}
        <p class="source-warning">Kontantdata finnes ikke for {selectedReport.label}, periode {periodText}. Rapporten bruker ikke null som erstatning for en manglende kilde.</p>
      {:else if view === 'maaned'}
        <p class="source-note">Månedsbudsjettet viser januar til desember. Rapportperioden brukes bare for akkumulerte budsjett- og hovedbokstall.</p>
      {/if}

      <div class="table-scroll detail-scroll">
        <table class="detail-table">
          <thead>
            <tr>
              <th class="sticky-col">Kontogruppe / konto</th><th>Type</th>
              {#if view === 'virksomhet'}
                <th>Budsjett {periodText}</th><th>Hovedbok</th><th>Avvik</th><th>Årsbudsjett</th><th>Forbruk</th><th>Investeringsbudsjett</th><th>Investeringsregnskap</th>
              {:else if view === 'kontant'}
                <th>Kontantbudsjett</th><th>Kontant</th><th>Avvik</th>
              {:else}
                {#each monthOptions as month}<th>{month.shortLabel}</th>{/each}<th class="month-total">Totalt alle måneder</th>
              {/if}
            </tr>
          </thead>
          <tbody>
            {#each filteredRows as row}
              <tr class:section-row={row.row_type === 'section'} class:total-row={row.row_type === 'total'} class:group-row={row.row_type === 'group'}>
                <td class="sticky-col">
                  {#if row.row_type === 'group'}
                    <button class="group-toggle" type="button" aria-expanded={expandedGroups.includes(row.group_key)} on:click={() => toggleGroup(row.group_key)}>
                      <span class="chevron" class:open={expandedGroups.includes(row.group_key)} aria-hidden="true">›</span>
                      {displayLabel(row.radtekst)}
                    </button>
                  {:else}
                    <span class:account-indent={row.row_type === 'account'}>{displayLabel(row.radtekst)}</span>
                  {/if}
                </td>
                <td><span class="type-badge">{row.row_type === 'account' ? 'Konto' : row.row_type === 'group' ? 'Gruppe' : row.row_type === 'total' ? 'Total' : 'Hovedgruppe'}</span></td>
                {#if view === 'virksomhet'}
                  <td>{number(row.virksomhet_budsjett_tusen)}</td><td>{number(row.hovedbok_tusen)}</td><td class:bad={Number(row.avvik_tusen) < 0}>{number(row.avvik_tusen)}</td><td>{number(row.aarets_budsjett_tusen)}</td><td>{percent(row.forbruk_av_aarets_budsjett)}</td><td>{number(row.investeringsbudsjett_tusen)}</td><td>{number(row.investeringsregnskap_tusen)}</td>
                {:else if view === 'kontant'}
                  <td>{number(row.kontant_budsjett_tusen)}</td><td>{number(row.kontant_tusen)}</td><td class:bad={Number(row.kontant_avvik_tusen) < 0}>{number(row.kontant_avvik_tusen)}</td>
                {:else}
                  {#each monthOptions as month}<td>{number(row[`budsjett_${month.period}_tusen`])}</td>{/each}<td class="month-total">{number(row.aarets_budsjett_tusen)}</td>
                {/if}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p class="scroll-hint">Tabellen kan rulles sideveis. Den første kolonnen blir stående.</p>
    </section>

    <footer class="report-footer">
      <span>Lokal datamappe</span>
      <p>{dataFolderName}. {hierarchicalRows[0]?.source_file ?? 'Kilde mangler'}. Dataene er bare lest i denne nettleserfanen.</p>
    </footer>
  </main>
{/if}
