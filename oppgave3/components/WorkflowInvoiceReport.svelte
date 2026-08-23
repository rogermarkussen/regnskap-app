<script>
  import { onMount } from 'svelte';
  import { showQueries } from '@evidence-dev/component-utilities/stores';

  export let rows = [];
  export let events = [];

  let search = '';
  let quality = 'alle';
  let workflowStatus = 'alle';
  let currentPage = 1;
  let pageSize = 250;

  onMount(() => showQueries.set(false));

  const number = (value) =>
    value === null || value === undefined
      ? '–'
      : Number(value).toLocaleString('nb-NO', { maximumFractionDigits: 2 });

  const date = (value) => {
    if (!value) return '–';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? String(value)
      : parsed.toLocaleString('nb-NO', { dateStyle: 'short', timeStyle: 'short' });
  };

  const shortOid = (value) => {
    const text = String(value ?? 'Ukjent oid');
    return text.length > 24 ? `${text.slice(0, 12)}…${text.slice(-8)}` : text;
  };

  $: eventsByInvoice = events.reduce((index, event) => {
    const key = String(event.fakturanr ?? '');
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(event);
    return index;
  }, new Map());

  const eventGroups = (invoiceNumber) => {
    const grouped = new Map();
    for (const event of eventsByInvoice.get(String(invoiceNumber ?? '')) ?? []) {
      const key = String(event.oid ?? 'Ukjent oid');
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(event);
    }
    return [...grouped.entries()].map(([oid, flowEvents]) => ({ oid, events: flowEvents }));
  };

  $: normalizedSearch = search.trim().toLocaleLowerCase('nb-NO');
  $: filteredRows = rows.filter((row) => {
    const searchMatch =
      !normalizedSearch ||
      [row.fakturanr, row.leverandor_navn, row.workflow_leverandor_id, row.regnskap_bilagsnr]
        .some((value) => String(value ?? '').toLocaleLowerCase('nb-NO').includes(normalizedSearch));
    return searchMatch &&
      (quality === 'alle' || row.koblingskvalitet === quality) &&
      (workflowStatus === 'alle' || row.workflow_status === workflowStatus);
  });
  $: totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  $: if (currentPage > totalPages) currentPage = totalPages;
  $: pageStart = (currentPage - 1) * pageSize;
  $: pageEnd = Math.min(pageStart + pageSize, filteredRows.length);
  $: visibleRows = filteredRows.slice(pageStart, pageEnd);
  $: safeMatches = rows.filter((row) => row.koblingskvalitet === 'Sikker').length;
  $: ambiguousMatches = rows.filter((row) => row.koblingskvalitet === 'Tvetydig').length;
  $: unmatched = rows.filter((row) => row.koblingskvalitet === 'Ikke matchet').length;
  $: activeInvoices = rows.filter((row) => Number(row.aktive_oppgaver) > 0).length;
</script>

<div class="workflow-shell">
  <header class="section-heading">
    <div>
      <span class="eyebrow">Workflow og fakturakontroll</span>
      <h2>Fakturastatus</h2>
      <p>Kobling mellom fakturaflyt og bokført regnskap. Usikre koblinger vises eksplisitt.</p>
      <small>Snapshot fra datamanifestet · Fakturanummer + leverandør-id brukes som kontrollnøkkel</small>
    </div>
  </header>

  <section class="metric-grid" aria-label="Nøkkeltall">
    <article><span>Workflowfakturaer</span><strong>{number(rows.length)}</strong><small>Unike fakturanumre</small></article>
    <article class="good"><span>Sikre koblinger</span><strong>{number(safeMatches)}</strong><small>Mot regnskap</small></article>
    <article class="warning"><span>Tvetydige</span><strong>{number(ambiguousMatches)}</strong><small>Krever flere nøkler</small></article>
    <article class="bad"><span>Ikke matchet</span><strong>{number(unmatched)}</strong><small>Mangler ext_inv_ref-treff</small></article>
    <article><span>Med aktive oppgaver</span><strong>{number(activeInvoices)}</strong><small>Minst én ACT-rad</small></article>
  </section>

  <section class="panel explanation">
    <h2>Slik skal statusen tolkes</h2>
    <p><strong>Har aktive oppgaver</strong> betyr at minst én underliggende workflowoppgave har dokumentert status <code>ACT</code>. Fullførte <code>FIN</code>-steg og aktive steg kan finnes i samme flyt. Åpne detaljene for å se oppgavene gruppert per workflow-oid; handlingskodene er beskrevet konservativt der kodeboken mangler.</p>
  </section>

  <section class="panel">
    <div class="panel-heading"><div><span class="kicker">Fakturaer</span><h2>Workflow mot regnskap</h2></div><span>Viser {filteredRows.length ? pageStart + 1 : 0}–{pageEnd} av {filteredRows.length}</span></div>
    <div class="toolbar">
      <label><span>Søk</span><input bind:value={search} on:input={() => (currentPage = 1)} placeholder="Fakturanummer, leverandør eller bilag…" /></label>
      <label><span>Koblingskvalitet</span><select bind:value={quality} on:change={() => (currentPage = 1)}><option value="alle">Alle</option><option>Sikker</option><option>Mulig</option><option>Tvetydig</option><option>Ikke matchet</option></select></label>
      <label><span>Workflowstatus</span><select bind:value={workflowStatus} on:change={() => (currentPage = 1)}><option value="alle">Alle</option>{#each [...new Set(rows.map((row) => row.workflow_status))] as status}<option value={status}>{status}</option>{/each}</select></label>
    </div>
    <div class="table-scroll">
      <table>
        <thead><tr><th>Faktura</th><th>Leverandør</th><th>Beløp</th><th>Status</th><th>Aktive oppgaver</th><th>Kobling</th><th>Siste hendelse</th><th>Detaljer</th></tr></thead>
        <tbody>
          {#each visibleRows as row}
            <tr>
              <th>{row.fakturanr}</th>
              <td>{row.leverandor_navn ?? '–'}</td>
              <td>{number(row.workflow_belop_nok)}</td>
              <td><span class="badge active">{row.workflow_status}</span></td>
              <td>{number(row.aktive_oppgaver)} / {number(row.aktive_brukere_antall)} brukere</td>
              <td><span class="badge quality" class:safe={row.koblingskvalitet === 'Sikker'} class:uncertain={row.koblingskvalitet === 'Tvetydig'} class:missing={row.koblingskvalitet === 'Ikke matchet'}>{row.koblingskvalitet}</span></td>
              <td>{date(row.siste_hendelse_tid)}</td>
              <td>
                <details><summary>Vis</summary><div class="details-grid">
                  <p><strong>Workflowbilag</strong><span>{row.workflow_bilagsnr ?? '–'}</span></p>
                  <p><strong>Regnskapsbilag</strong><span>{row.regnskap_bilagsnr ?? '–'}</span></p>
                  <p><strong>Leverandør-id</strong><span>{row.workflow_leverandor_id ?? '–'}</span></p>
                  <p><strong>Finansiering</strong><span>{row.finansieringer ?? '–'}</span></p>
                  <p><strong>Perioder</strong><span>{row.perioder ?? '–'}</span></p>
                  <p><strong>Workflowflyter</strong><span>{number(row.workflow_flyter)}</span></p>
                  <p class="wide"><strong>Årsak til koblingskvalitet</strong><span>{row.koblingsaarsak ?? '–'}</span></p>
                  <p class="wide"><strong>Aktive brukere</strong><span>{row.aktive_brukere ?? '–'}</span></p>
                  <p class="wide"><strong>Kontoer</strong><span>{row.kontoer ?? '–'}</span></p>
                  <div class="history wide">
                    <h4>Oppgavehistorikk per workflow-oid</h4>
                    {#each eventGroups(row.fakturanr) as flow}
                      <section class="flow">
                        <div class="flow-heading"><strong title={flow.oid}>{shortOid(flow.oid)}</strong><span>{flow.events.length} oppgaver/hendelser</span></div>
                        <div class="history-scroll">
                          <table>
                            <thead><tr><th>Tid</th><th>Oppgave/node</th><th>Oppgavestatus</th><th>Handling</th><th>Bruker</th></tr></thead>
                            <tbody>
                              {#each flow.events as event}
                                <tr class:current={event.er_aktiv}>
                                  <td>{date(event.hendelse_tid)}</td>
                                  <td>{event.task_id ?? '–'} / {event.node_id ?? '–'}</td>
                                  <td><span class="badge" class:active-task={event.er_aktiv}>{event.oppgavestatus_tekst}</span></td>
                                  <td title={event.action_code ?? ''}>{event.handling_tekst}</td>
                                  <td>{event.er_aktiv ? (event.wf_user_id ?? '–') : (event.real_user ?? '–')}</td>
                                </tr>
                              {/each}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    {:else}
                      <p>Ingen oppgavehendelser funnet for fakturanummeret.</p>
                    {/each}
                  </div>
                </div></details>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <div class="pagination">
      <label>
        <span>Rader per side</span>
        <select bind:value={pageSize} on:change={() => (currentPage = 1)}>
          <option value={100}>100</option>
          <option value={250}>250</option>
          <option value={500}>500</option>
        </select>
      </label>
      <nav aria-label="Bla i fakturaer">
        <button type="button" disabled={currentPage === 1} on:click={() => (currentPage = 1)} aria-label="Første side">«</button>
        <button type="button" disabled={currentPage === 1} on:click={() => (currentPage -= 1)}>Forrige</button>
        <span>Side <strong>{currentPage}</strong> av {totalPages}</span>
        <button type="button" disabled={currentPage === totalPages} on:click={() => (currentPage += 1)}>Neste</button>
        <button type="button" disabled={currentPage === totalPages} on:click={() => (currentPage = totalPages)} aria-label="Siste side">»</button>
      </nav>
    </div>
  </section>
</div>

<style>
  :global(html), :global(body){overflow-y:auto!important}:global(body){background:#f3f6f8!important}:global(#evidence-main-article>h1.title){display:none!important}:global(#evidence-main-article){width:100%;max-width:none}
  .workflow-shell{max-width:1540px;margin:auto;padding:8px 4px 60px;color:#172433}.section-heading{margin-top:20px;padding:20px;background:white;border:1px solid #dce3e9;border-radius:12px}.section-heading h2{margin:3px 0!important;font-size:21px}.section-heading p{margin:0 0 5px;color:#687786;font-size:11px}.section-heading small{color:#718091;font-size:10px}.eyebrow,.kicker{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em}.eyebrow,.kicker{color:#317e7a}
  .metric-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin:18px 0}.metric-grid article{display:grid;gap:4px;padding:16px 18px;background:white;border:1px solid #dce3e9;border-top:3px solid #55739a;border-radius:10px}.metric-grid article.good{border-top-color:#2d8b70}.metric-grid article.warning{border-top-color:#c38a2c}.metric-grid article.bad{border-top-color:#bd5454}.metric-grid span{font-size:11px;color:#667587}.metric-grid strong{font-size:25px}.metric-grid small{font-size:10px;color:#8994a0}
  .panel{margin-top:16px;background:white;border:1px solid #dce3e9;border-radius:12px;overflow:hidden}.explanation{padding:17px 20px;border-left:4px solid #47779a}.explanation h2{margin:0 0 5px!important;font-size:16px}.explanation p{margin:0;color:#5d6d7c;font-size:12px;line-height:1.5}.panel-heading{display:flex;justify-content:space-between;align-items:center;padding:18px 20px 13px}.panel-heading h2{margin:2px 0 0!important;font-size:20px}.panel-heading>span{font-size:11px;color:#718091}
  .toolbar{display:grid;grid-template-columns:1.5fr .7fr .7fr;gap:12px;padding:0 20px 16px}.toolbar label{display:grid;gap:5px}.toolbar span{font-size:10px;font-weight:750;color:#5b6b7c}.toolbar input,.toolbar select{height:38px;border:1px solid #ccd6e0;border-radius:7px;background:white;padding:0 10px}.table-scroll{overflow:auto;border-top:1px solid #e2e8ed}table{width:100%;border-collapse:collapse;font-size:11px}th,td{padding:9px 10px;border-bottom:1px solid #e8edf1;text-align:left;white-space:nowrap}thead th{position:sticky;top:0;background:#edf2f6;color:#445467;text-transform:uppercase;font-size:9px;z-index:2}tbody th{font-weight:750}.badge{display:inline-block;padding:4px 7px;border-radius:99px;background:#e8eef5;color:#405b78;font-size:9px;font-weight:750}.badge.safe{background:#dff2e8;color:#256b4a}.badge.uncertain{background:#fff0ce;color:#8a5b13}.badge.missing{background:#f8dddd;color:#973c3c}.badge.active-task{background:#dff2e8;color:#256b4a}details{position:relative}summary{cursor:pointer;color:#2c687a;font-weight:750}.details-grid{position:absolute;right:0;z-index:8;display:grid;grid-template-columns:1fr 1fr;gap:7px;width:min(980px,85vw);max-height:75vh;overflow:auto;padding:13px;background:white;border:1px solid #ccd6df;border-radius:8px;box-shadow:0 10px 30px rgba(30,45,65,.18)}.details-grid p{display:grid;gap:2px;margin:0;white-space:normal}.details-grid strong{font-size:9px;color:#657485;text-transform:uppercase}.details-grid span{font-size:10px;overflow-wrap:anywhere}.details-grid .wide{grid-column:1/-1}.history{margin-top:6px;border-top:1px solid #dce4ea;padding-top:10px}.history h4{margin:0 0 8px;font-size:12px}.flow{margin-top:9px;border:1px solid #dce4ea;border-radius:7px;overflow:hidden}.flow-heading{display:flex;justify-content:space-between;gap:12px;padding:8px 9px;background:#f4f7f9}.flow-heading strong{text-transform:none}.flow-heading span{color:#718091}.history-scroll{max-height:260px;overflow:auto}.history table{font-size:9px}.history th,.history td{padding:6px 7px;white-space:normal;vertical-align:top}.history tr.current td{background:#f3faf6}
  .pagination{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:13px 20px 15px;border-top:1px solid #e2e8ed;background:#fafcfd}.pagination>label{display:flex;align-items:center;gap:8px;color:#667587;font-size:10px;font-weight:700}.pagination select{height:32px;border:1px solid #cbd6df;border-radius:7px;background:white;padding:0 8px;color:#30475d}.pagination nav{display:flex;align-items:center;gap:6px}.pagination nav span{min-width:110px;text-align:center;color:#667587;font-size:11px}.pagination button{min-height:32px;padding:0 10px;border:1px solid #c5d1dc;border-radius:7px;background:white;color:#28556d;font-size:10px;font-weight:750;cursor:pointer}.pagination button:hover:not(:disabled){background:#edf5f7}.pagination button:disabled{opacity:.4;cursor:not-allowed}
  @media(max-width:1000px){.metric-grid{grid-template-columns:repeat(2,1fr)}.toolbar{grid-template-columns:1fr}.details-grid{position:fixed;left:5%;right:5%;bottom:5%;width:90%;box-sizing:border-box}.pagination{align-items:flex-start;flex-direction:column}.pagination nav{width:100%;justify-content:space-between}.pagination nav span{min-width:auto}}
</style>
