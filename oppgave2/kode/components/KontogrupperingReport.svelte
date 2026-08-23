<script>
  import { onMount } from 'svelte';
  import { showQueries } from '@evidence-dev/component-utilities/stores';
  import writeExcelFile from 'write-excel-file/browser';
  import { createTask2WorkbookSheets, task2WorkbookFilename } from './task2ExcelExport.js';

  export let rows = [];

  let financing = '154301';
  let reportPeriod = 'latest';
  let search = '';
  let section = 'alle';
  let level = 'oversikt';
  let view = 'virksomhet';
  let expandedGroups = [];
  const reportOptions = [
    { value: '154301', label: '154301' },
    { value: '154345', label: '154345' },
    { value: '154322+045101', label: '154322 + 045101' },
    { value: 'alle', label: 'Alle finansieringer' }
  ];
  const periodOptions = [
    { value: 'latest', label: 'Til nyeste komplette måned' },
    { value: 'p1_3', label: 'Jan–mar' },
    { value: 'p1_4', label: 'Jan–apr' },
    { value: 'p1_6', label: 'Jan–jun' }
  ];
  const monthOptions = [
    { period: 202601, shortLabel: 'Jan', exportLabel: 'Januar' },
    { period: 202602, shortLabel: 'Feb', exportLabel: 'Februar' },
    { period: 202603, shortLabel: 'Mar', exportLabel: 'Mars' },
    { period: 202604, shortLabel: 'Apr', exportLabel: 'April' },
    { period: 202605, shortLabel: 'Mai', exportLabel: 'Mai' },
    { period: 202606, shortLabel: 'Jun', exportLabel: 'Juni' },
    { period: 202607, shortLabel: 'Jul', exportLabel: 'Juli' },
    { period: 202608, shortLabel: 'Aug', exportLabel: 'August' },
    { period: 202609, shortLabel: 'Sep', exportLabel: 'September' },
    { period: 202610, shortLabel: 'Okt', exportLabel: 'Oktober' },
    { period: 202611, shortLabel: 'Nov', exportLabel: 'November' },
    { period: 202612, shortLabel: 'Des', exportLabel: 'Desember' }
  ];

  onMount(() => showQueries.set(false));

  const number = (value, digits = 0) =>
    value === null || value === undefined
      ? '–'
      : Number(value).toLocaleString('nb-NO', {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits
        });

  const percent = (value) =>
    value === null || value === undefined ? '–' : `${number(Number(value) * 100, 1)} %`;

  const displayLabel = (value) =>
    String(value ?? '').replace(/\s*\(\s*\d{4}(?:\s*,\s*\d{4})*\s*\)\s*$/, '');

  $: financingRows = rows.filter(
    (row) => row.finansiering === financing && row.rapportperiode === reportPeriod
  );
  $: selectedReport = reportOptions.find((option) => option.value === financing) ?? reportOptions[0];
  $: periodText = financingRows[0]?.periodetekst ?? '01–03 2026';
  $: hierarchicalRows = (() => {
    let currentGroupKey = null;
    return financingRows.map((row) => {
      if (row.row_type === 'group') currentGroupKey = `${financing}:${row.excel_row}`;
      if (row.row_type === 'section' || row.row_type === 'total') currentGroupKey = null;
      return {
        ...row,
        group_key: row.row_type === 'group' ? currentGroupKey : null,
        parent_group_key: row.row_type === 'account' ? currentGroupKey : null
      };
    });
  })();
  $: allGroupKeys = hierarchicalRows.filter((row) => row.row_type === 'group').map((row) => row.group_key);
  $: total = financingRows.find((row) => row.radtekst === 'Driftskostnader') ?? {};
  $: sections = [...new Set(financingRows.map((row) => row.hovedgruppe).filter(Boolean))];
  $: normalizedSearch = search.trim().toLocaleLowerCase('nb-NO');
  const filterRowsForView = (
    candidateRows,
    selectedSection,
    selectedLevel,
    selectedSearch,
    openGroups
  ) => candidateRows.filter((row) => {
    const sectionMatch = selectedSection === 'alle' || row.hovedgruppe === selectedSection;
    const searchMatch =
      !selectedSearch ||
      String(row.konto ?? '').toLocaleLowerCase('nb-NO').includes(selectedSearch) ||
      String(row.konto_navn ?? '').toLocaleLowerCase('nb-NO').includes(selectedSearch) ||
      String(row.radtekst ?? '').toLocaleLowerCase('nb-NO').includes(selectedSearch) ||
      String(row.hovedgruppe ?? '').toLocaleLowerCase('nb-NO').includes(selectedSearch);
    const levelMatch =
      (selectedLevel === 'oversikt' && (
        ['section', 'group', 'total'].includes(row.row_type) ||
        (row.row_type === 'account' && (
          openGroups.includes(row.parent_group_key) || Boolean(selectedSearch)
        ))
      )) ||
      (selectedLevel === 'konto' && row.row_type === 'account');
    return sectionMatch && levelMatch && searchMatch;
  });
  $: filteredRows = filterRowsForView(
    hierarchicalRows,
    section,
    level,
    normalizedSearch,
    expandedGroups
  );

  const setFinancing = (value) => {
    financing = value;
    section = 'alle';
    search = '';
    expandedGroups = [];
  };

  const toggleGroup = (key) => {
    expandedGroups = expandedGroups.includes(key)
      ? expandedGroups.filter((candidate) => candidate !== key)
      : [...expandedGroups, key];
  };

  const toggleAllGroups = () => {
    expandedGroups = expandedGroups.length === allGroupKeys.length ? [] : [...allGroupKeys];
  };

  const downloadExcel = async () => {
    const exportRowsForView = () => filterRowsForView(
      hierarchicalRows,
      section,
      level,
      normalizedSearch,
      expandedGroups
    );
    const rowIdentity = (row) => ({
      Hovedgruppe: row.hovedgruppe,
      Radtype: row.row_type,
      'Kontogruppe/konto': displayLabel(row.radtekst),
      Kontonummer: row.konto,
      Kontonavn: row.konto_navn,
      Datastatus: row.data_status
    });
    const virksomhetRows = exportRowsForView().map((row) => ({
      ...rowIdentity(row),
      [`Budsjett ${periodText}`]: row.virksomhet_budsjett_tusen,
      Hovedbok: row.hovedbok_tusen,
      Avvik: row.avvik_tusen,
      Årsbudsjett: row.aarets_budsjett_tusen,
      'Forbruk av årsbudsjett': row.forbruk_av_aarets_budsjett,
      Investeringsbudsjett: row.investeringsbudsjett_tusen,
      Investeringsregnskap: row.investeringsregnskap_tusen
    }));
    const kontantRows = exportRowsForView().map((row) => ({
      ...rowIdentity(row),
      Kontantbudsjett: row.kontant_budsjett_tusen,
      Kontant: row.kontant_tusen,
      Kontantavvik: row.kontant_avvik_tusen
    }));
    const maanedRows = exportRowsForView().map((row) => ({
      ...rowIdentity(row),
      ...Object.fromEntries(
        monthOptions.map(({ period, exportLabel }) => [
          exportLabel,
          row[`budsjett_${period}_tusen`]
        ])
      ),
      'Totalt alle måneder': row.aarets_budsjett_tusen
    }));
    const metadata = [
      { Felt: 'Finansiering', Verdi: selectedReport.label },
      { Felt: 'Periode', Verdi: periodText },
      { Felt: 'Budsjettversjon', Verdi: '2026B' },
      { Felt: 'Investeringsregel', Verdi: 'Budsjett dim_1=212 · Regnskap dim_4=154345' },
      { Felt: 'Enhet', Verdi: 'NOK 1 000' },
      { Felt: 'Hovedgruppefilter', Verdi: section === 'alle' ? 'Alle hovedgrupper' : section },
      { Felt: 'Nivåfilter', Verdi: level },
      { Felt: 'Søk', Verdi: search || 'Ingen' },
      { Felt: 'Rader i Virksomhet-fanen', Verdi: virksomhetRows.length },
      { Felt: 'Rader i Kontant-fanen', Verdi: kontantRows.length },
      { Felt: 'Rader i Måneder-fanen', Verdi: maanedRows.length },
      { Felt: 'Kilde', Verdi: financingRows[0]?.source_file ?? '' }
    ];
    const workbookSheets = createTask2WorkbookSheets({
      virksomhetRows,
      kontantRows,
      maanedRows,
      metadata
    });
    await writeExcelFile(workbookSheets).toFile(task2WorkbookFilename(financing, periodText));
  };
</script>

<div class="report-shell">
  <header class="hero">
    <div>
      <div class="eyebrow">Oppgave 2 · Regnskap</div>
      <h1>Kontogruppering</h1>
      <p>Virksomhets-, investerings- og kontantregnskap for periode {periodText} · Budsjettversjon 2026B · Beløp i NOK 1 000</p>
      <small class="source-line">Beregnet fra: {financingRows[0]?.source_file ?? 'operative Excel-uttrekk'} · Fasit brukes kun til kontroll</small>
    </div>
    <div class="hero-actions">
      <div class="period-badge"><span>Periode</span><strong>{periodText.slice(0, 5)}</strong><small>{periodText.slice(-4)}</small></div>
    </div>
  </header>

  <nav class="finance-switch" aria-label="Velg finansiering">
    {#each reportOptions as option}
      <button class:active={financing === option.value} on:click={() => setFinancing(option.value)}>{option.label}</button>
    {/each}
  </nav>

  <nav class="period-switch" aria-label="Velg rapportperiode">
    <span>Periode</span>
    {#each periodOptions as option}
      <button class:active={reportPeriod === option.value} on:click={() => (reportPeriod = option.value)}>{option.label}</button>
    {/each}
  </nav>

  <details class="report-help">
    <summary>Slik leses rapporten</summary>
    <div class="help-grid">
      <p><strong>Hovedbok</strong><span>Regnskapsførte kostnader i periode {periodText}.</span></p>
      <p><strong>Budsjett</strong><span>Virksomhetsbudsjett for samme periode.</span></p>
      <p><strong>Avvik</strong><span>Budsjett minus hovedbok. Negativt avvik betyr at forbruket er høyere enn budsjettet.</span></p>
      <p><strong>Forbruk</strong><span>Hovedbok som andel av hele årsbudsjettet.</span></p>
      <p><strong>Kontant</strong><span>Utbetalinger og innbetalinger ført i kontantregnskapet.</span></p>
      <p><strong>Investering</strong><span>Budsjett med dim_1 = 212 og hovedbok med finansiering 154345.</span></p>
      <p><strong>Beløp</strong><span>Alle beløp vises i tusen kroner. «–» betyr at kilden ikke har en tallverdi.</span></p>
    </div>
  </details>

  <section class="metric-grid" aria-label="Nøkkeltall">
    <article><span>Hovedbok</span><strong>{number(total.hovedbok_tusen)}</strong><small>Akkumulert {periodText}</small></article>
    <article><span>Budsjett</span><strong>{number(total.virksomhet_budsjett_tusen)}</strong><small>Akkumulert {periodText}</small></article>
    <article class:negative={Number(total.avvik_tusen) < 0}><span>Avvik</span><strong>{number(total.avvik_tusen)}</strong><small>Budsjett minus hovedbok</small></article>
    <article><span>Forbruk</span><strong>{percent(total.forbruk_av_aarets_budsjett)}</strong><small>Av årsbudsjett</small></article>
  </section>

  <section class="panel overview-panel">
    <div class="panel-heading">
      <div><span class="kicker">Sammendrag</span><h2>Hovedgrupper</h2></div>
      <span class="row-count">4 totaler</span>
    </div>
    <div class="table-scroll compact">
      <table>
        <thead><tr><th>Kontogruppe</th><th>Budsjett</th><th>Hovedbok</th><th>Avvik</th><th>Årsbudsjett</th><th>Forbruk</th><th>Investeringsbudsjett</th><th>Investeringsregnskap</th></tr></thead>
        <tbody>
          {#each financingRows.filter((row) => row.row_type === 'total') as row}
            <tr class:grand-total={row.radtekst === 'Driftskostnader'}>
              <th>{row.radtekst}</th><td>{number(row.virksomhet_budsjett_tusen)}</td><td>{number(row.hovedbok_tusen)}</td>
              <td class:bad={Number(row.avvik_tusen) < 0}>{number(row.avvik_tusen)}</td><td>{number(row.aarets_budsjett_tusen)}</td><td>{percent(row.forbruk_av_aarets_budsjett)}</td><td>{number(row.investeringsbudsjett_tusen)}</td><td>{number(row.investeringsregnskap_tusen)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <section class="panel detail-panel">
    <div class="panel-heading detail-heading">
      <div><span class="kicker">Detaljer</span><h2>Kontogrupper og kontoer</h2></div>
      <button class="export" on:click={downloadExcel}>Eksporter Excel</button>
    </div>

    <div class="toolbar">
      <label class="search"><span>Søk</span><input bind:value={search} placeholder="Søk etter kontonummer, konto eller kontogruppe…" /></label>
      <label><span>Hovedgruppe</span><select bind:value={section}><option value="alle">Alle hovedgrupper</option>{#each sections as name}<option value={name}>{name}</option>{/each}</select></label>
      <label><span>Nivå</span><select bind:value={level}><option value="oversikt">Kontogrupper</option><option value="konto">Bare kontoer</option></select></label>
      <div class="segmented" aria-label="Velg tallvisning">
        <button class:active={view === 'virksomhet'} on:click={() => (view = 'virksomhet')}>Virksomhet</button>
        <button class:active={view === 'kontant'} on:click={() => (view = 'kontant')}>Kontant</button>
        <button class:active={view === 'maaned'} on:click={() => (view = 'maaned')}>Måneder</button>
      </div>
    </div>

    <div class="result-bar">
      <div class="result-meta">Viser <strong>{filteredRows.length}</strong> rader</div>
      {#if level === 'oversikt'}
        <button class="expand-all" on:click={toggleAllGroups}>{expandedGroups.length === allGroupKeys.length ? 'Lukk alle grupper' : 'Åpne alle grupper'}</button>
      {/if}
    </div>
    {#if view === 'kontant' && (total.kontant_tusen === null || total.kontant_tusen === undefined)}
      <p class="source-warning">Kontantdata finnes ikke for {selectedReport.label}, periode {periodText}. Rapporten viser ikke null som erstatning for en manglende kilde.</p>
    {:else if view === 'maaned'}
      <p class="source-note">Månedsbudsjettet viser alle tolv måneder fra januar til desember. Valgt rapportperiode brukes bare for akkumulerte budsjett- og hovedbokstall.</p>
    {/if}
    <div class="table-scroll detail-scroll">
      <table class="detail-table">
        <thead>
          <tr>
            <th class="sticky-col">Kontogruppe / konto</th><th>Type</th>
            {#if view === 'virksomhet'}<th>Budsjett {periodText}</th><th>Hovedbok</th><th>Avvik</th><th>Årsbudsjett</th><th>Forbruk</th><th>Investeringsbudsjett</th><th>Investeringsregnskap</th>
            {:else if view === 'kontant'}<th>Kontantbudsjett</th><th>Kontant</th><th>Avvik</th>
            {:else}{#each monthOptions as month}<th>{month.shortLabel}</th>{/each}<th class="month-total">Totalt alle måneder</th>{/if}
          </tr>
        </thead>
        <tbody>
          {#each filteredRows as row}
            <tr class:section-row={row.row_type === 'section'} class:total-row={row.row_type === 'total'} class:group-row={row.row_type === 'group'}>
              <td class="sticky-col">
                {#if row.row_type === 'group'}
                  <button class="group-toggle" aria-expanded={expandedGroups.includes(row.group_key)} on:click={() => toggleGroup(row.group_key)}>
                    <span class="chevron" class:open={expandedGroups.includes(row.group_key)}>›</span>{displayLabel(row.radtekst)}
                  </button>
                {:else}
                  <span class:account-indent={row.row_type === 'account'}>{displayLabel(row.radtekst)}</span>
                {/if}
              </td><td><span class="type-badge">{row.row_type === 'account' ? 'Konto' : row.row_type === 'group' ? 'Gruppe' : row.row_type === 'total' ? 'Total' : 'Hovedgruppe'}</span></td>
              {#if view === 'virksomhet'}<td>{number(row.virksomhet_budsjett_tusen)}</td><td>{number(row.hovedbok_tusen)}</td><td class:bad={Number(row.avvik_tusen) < 0}>{number(row.avvik_tusen)}</td><td>{number(row.aarets_budsjett_tusen)}</td><td>{percent(row.forbruk_av_aarets_budsjett)}</td><td>{number(row.investeringsbudsjett_tusen)}</td><td>{number(row.investeringsregnskap_tusen)}</td>
              {:else if view === 'kontant'}<td>{number(row.kontant_budsjett_tusen)}</td><td>{number(row.kontant_tusen)}</td><td class:bad={Number(row.kontant_avvik_tusen) < 0}>{number(row.kontant_avvik_tusen)}</td>
              {:else}{#each monthOptions as month}<td>{number(row[`budsjett_${month.period}_tusen`])}</td>{/each}<td class="month-total">{number(row.aarets_budsjett_tusen)}</td>{/if}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class="scroll-hint">Bruk vanlig siderulling for å se alle radene. Tabellen kan rulles sideveis ved behov.</p>
  </section>
</div>

<style>
  :global(html), :global(body) { overflow-y: auto !important; }
  :global(body) { background: #f4f7fb !important; }
  :global(#evidence-main-article > h1.title) { display:none !important; }
  :global(#evidence-main-article) { width:100%; max-width:none; }
  .report-shell { color: #172033; padding: 8px 4px 56px; width:100%; max-width: 1540px; margin: 0 auto; box-sizing:border-box; }
  .hero { display:flex; justify-content:space-between; gap:24px; align-items:center; padding:28px 30px; border-radius:18px; color:white; background:linear-gradient(125deg,#13294b,#1d4f79 62%,#287c91); box-shadow:0 12px 32px rgba(22,48,83,.18); }
  .hero h1 { color:white !important; margin:4px 0 8px; font-size:32px; line-height:1.1; }
  .hero p { margin:0; color:#d9e8f4; font-size:14px; }.source-line{display:block;margin-top:8px;color:#a9cadc;font-size:10px}
  .eyebrow,.kicker { font-size:11px; text-transform:uppercase; letter-spacing:.12em; font-weight:750; }
  .eyebrow { color:#8ed7df; }
  .period-badge { flex:0 0 auto; display:grid; text-align:center; min-width:100px; padding:12px 18px; border:1px solid rgba(255,255,255,.25); border-radius:12px; background:rgba(255,255,255,.1); }
  .hero-actions{display:flex;align-items:flex-start;gap:12px}.task-nav{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.task-nav a{padding:8px 10px;border:1px solid rgba(255,255,255,.3);border-radius:7px;color:white;font-size:10px;font-weight:700;text-decoration:none;background:rgba(255,255,255,.06)}.task-nav a:hover{background:rgba(255,255,255,.14)}
  .period-badge span,.period-badge small { color:#d7e7f2; font-size:11px; }.period-badge strong{font-size:21px;}
  .finance-switch { display:flex; flex-wrap:wrap; gap:6px; margin:20px 0; padding:5px; width:max-content; max-width:100%; border:1px solid #d8e0ea; border-radius:11px; background:white; box-shadow:0 2px 8px rgba(30,50,80,.05); }
  .period-switch{display:flex;align-items:center;gap:5px;width:max-content;max-width:100%;margin:-10px 0 20px;padding:5px;border:1px solid #d8e0ea;border-radius:10px;background:white}.period-switch>span{padding:0 8px;color:#667489;font-size:11px;font-weight:750}.period-switch button{border:0;border-radius:7px;background:transparent;color:#526174;padding:8px 12px;font-weight:650}.period-switch button.active{background:#287c91;color:white}
  .report-help{margin:-4px 0 18px;border:1px solid #d8e2eb;border-radius:10px;background:#f9fbfd;color:#435267}.report-help summary{cursor:pointer;padding:11px 14px;font-size:12px;font-weight:700;color:#294f68}.help-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:0 14px 14px}.help-grid p{display:grid;gap:3px;margin:0;padding:10px;border-radius:8px;background:white}.help-grid strong{font-size:11px;color:#24455f}.help-grid span{font-size:11px;line-height:1.4;color:#67778a}
  button { font:inherit; cursor:pointer; }.finance-switch button,.segmented button { border:0; border-radius:7px; background:transparent; color:#526174; padding:9px 14px; font-weight:650; }.finance-switch button.active,.segmented button.active { background:#173f68; color:white; box-shadow:0 2px 5px rgba(20,50,80,.16); }
  .metric-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; margin-bottom:18px; }
  .metric-grid article { display:grid; gap:5px; padding:18px 20px; background:white; border:1px solid #dfe6ee; border-radius:13px; box-shadow:0 4px 14px rgba(30,50,80,.05); border-top:3px solid #2a7893; }
  .metric-grid span{font-size:12px;color:#667489;font-weight:650}.metric-grid strong{font-size:26px;letter-spacing:-.03em}.metric-grid small{font-size:11px;color:#8793a4}.metric-grid article.negative{border-top-color:#c65050}.metric-grid article.negative strong{color:#a63131}
  .panel { background:white; border:1px solid #dfe6ee; border-radius:14px; box-shadow:0 4px 18px rgba(30,50,80,.055); margin-top:18px; overflow:hidden; }
  .panel-heading { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:19px 22px 14px; }.panel-heading h2{color:#1c2a3e!important;margin:2px 0 0;font-size:20px}.kicker{color:#2d7188}.row-count,.result-meta{color:#718095;font-size:12px}.row-count{background:#eef4f7;padding:5px 9px;border-radius:99px}
  .table-scroll { overflow-x:auto; overflow-y:visible; scrollbar-color:#9aabba #edf1f5; scrollbar-width:thin; }.compact{padding:0 14px 14px}.detail-scroll{border-top:1px solid #e4e9ef;border-bottom:1px solid #e4e9ef;}
  table { width:100%; border-collapse:separate; border-spacing:0; font-size:13px; }th,td{padding:10px 12px;border-bottom:1px solid #e8edf2;white-space:nowrap;text-align:right}thead th{position:sticky;top:0;z-index:3;background:#edf3f7;color:#38485d;font-size:11px;text-transform:uppercase;letter-spacing:.04em}th:first-child,td:first-child{text-align:left}.compact tbody th{font-weight:600}.grand-total th,.grand-total td,.total-row td{font-weight:750;background:#f0f6f8}.bad{color:#a83636}.detail-table{min-width:900px}.sticky-col{position:sticky!important;left:0;z-index:2;background:white;min-width:280px;width:36%;max-width:480px;overflow:hidden;text-overflow:ellipsis}.detail-table thead .sticky-col{z-index:5;background:#edf3f7}.section-row td{background:#173f68!important;color:white;font-weight:750}.group-row .sticky-col{font-weight:700;color:#234f6d;background:#f7fafc}.total-row .sticky-col{background:#f0f6f8}.account-indent{display:block;padding-left:31px;color:#435267;overflow:hidden;text-overflow:ellipsis}.type-badge{font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#68788c;background:#edf1f5;padding:4px 7px;border-radius:99px}.group-toggle{display:flex;align-items:center;gap:8px;width:100%;min-width:0;padding:0;border:0;background:transparent;color:#234f6d;font-weight:700;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.chevron{display:inline-block;flex:0 0 auto;font-size:21px;line-height:12px;transition:transform .16s}.chevron.open{transform:rotate(90deg)}
  .toolbar{display:grid;grid-template-columns:minmax(240px,1.4fr) minmax(180px,.8fr) minmax(150px,.6fr) auto;gap:12px;align-items:end;padding:0 22px 15px}.toolbar label{display:grid;gap:5px}.toolbar label>span{font-size:11px;font-weight:700;color:#56667b}.toolbar input,.toolbar select{width:100%;height:39px;border:1px solid #cdd7e2;border-radius:8px;background:white;color:#172033;padding:0 11px;outline:none}.toolbar input:focus,.toolbar select:focus{border-color:#29738a;box-shadow:0 0 0 3px rgba(41,115,138,.12)}.segmented{display:flex;background:#edf1f5;border-radius:9px;padding:3px}.segmented button{padding:8px 10px;font-size:12px}.export,.expand-all{border:1px solid #b9c8d5;border-radius:8px;background:white;color:#294c67;padding:8px 12px;font-weight:650}.export:hover,.expand-all:hover{background:#edf5f7}.result-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 22px 10px}.result-meta{color:#718095;font-size:12px}.expand-all{padding:6px 9px;font-size:11px}.scroll-hint{margin:10px 22px 14px;color:#7b8899;font-size:11px}
  .source-warning{margin:0 22px 14px;padding:10px 12px;border-left:4px solid #b57b23;border-radius:7px;background:#fff8ea;color:#73551f;font-size:11px}
  .source-note{margin:0 22px 14px;padding:10px 12px;border-left:4px solid #397b9d;border-radius:7px;background:#f2f8fc;color:#365c73;font-size:11px}
  .month-total{border-left:2px solid #c6d4df!important;background:#e4eef3!important;font-weight:750!important}
  @media(max-width:1200px){.toolbar{grid-template-columns:1fr 1fr}.segmented{grid-column:1/-1;width:max-content}}
  @media(max-width:900px){.hero{padding:22px;align-items:flex-start;flex-direction:column}.hero-actions{width:100%}.task-nav{justify-content:flex-start}.period-badge{display:none}.metric-grid{grid-template-columns:repeat(2,1fr)}.help-grid{grid-template-columns:1fr 1fr}.sticky-col{min-width:260px}.report-shell{padding-left:0;padding-right:0}}
  @media(max-width:560px){.metric-grid,.help-grid{grid-template-columns:1fr}.finance-switch{width:100%}.finance-switch button{flex:1}.toolbar{grid-template-columns:1fr}.segmented{grid-column:auto;max-width:100%;overflow:auto}.hero h1{font-size:27px}}
</style>
