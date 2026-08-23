<script>
  import { onDestroy, tick } from 'svelte';

  export let rows = [];
  export let loadEvents = async () => [];

  let search = '';
  let quality = 'alle';
  let workflowStatus = 'alle';
  let currentPage = 1;
  let pageSize = 50;
  let selected = null;
  let selectedEvents = [];
  let detailsLoading = false;
  let detailsError = '';
  let closeButton;
  let returnFocus;

  const number = (value, digits = 0) => value === null || value === undefined
    ? '–'
    : Number(value).toLocaleString('nb-NO', { maximumFractionDigits: digits });

  const money = (value) => value === null || value === undefined
    ? '–'
    : Number(value).toLocaleString('nb-NO', { maximumFractionDigits: 2 });

  const date = (value) => {
    if (!value) return '–';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString('nb-NO', { dateStyle: 'short', timeStyle: 'short' });
  };

  const shortOid = (value) => {
    const text = String(value ?? 'Ukjent oid');
    return text.length > 26 ? `${text.slice(0, 13)}…${text.slice(-8)}` : text;
  };

  const qualityClass = (value) => value === 'Sikker' ? 'safe' : value === 'Mulig' ? 'possible' : value === 'Tvetydig' ? 'uncertain' : 'missing';

  $: normalizedSearch = search.trim().toLocaleLowerCase('nb-NO');
  $: filteredRows = rows.filter((row) => {
    const searchMatch = !normalizedSearch || [row.fakturanr, row.leverandor_navn, row.workflow_leverandor_id, row.regnskap_bilagsnr]
      .some((value) => String(value ?? '').toLocaleLowerCase('nb-NO').includes(normalizedSearch));
    return searchMatch && (quality === 'alle' || row.koblingskvalitet === quality) && (workflowStatus === 'alle' || row.workflow_status === workflowStatus);
  });
  $: totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  $: if (currentPage > totalPages) currentPage = totalPages;
  $: pageStart = (currentPage - 1) * pageSize;
  $: pageEnd = Math.min(pageStart + pageSize, filteredRows.length);
  $: visibleRows = filteredRows.slice(pageStart, pageEnd);
  $: statuses = [...new Set(rows.map((row) => row.workflow_status).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'nb-NO'));
  $: safeMatches = rows.filter((row) => row.koblingskvalitet === 'Sikker').length;
  $: possibleMatches = rows.filter((row) => row.koblingskvalitet === 'Mulig').length;
  $: ambiguousMatches = rows.filter((row) => row.koblingskvalitet === 'Tvetydig').length;
  $: unmatched = rows.filter((row) => row.koblingskvalitet === 'Ikke matchet').length;
  $: activeInvoices = rows.filter((row) => Number(row.aktive_oppgaver) > 0).length;
  $: safePercent = rows.length ? Math.round((safeMatches / rows.length) * 100) : 0;
  $: eventGroups = groupEvents(selectedEvents);

  function groupEvents(events) {
    const groups = new Map();
    for (const event of events) {
      const key = String(event.oid ?? 'Ukjent oid');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(event);
    }
    return [...groups.entries()].map(([oid, flowEvents]) => ({ oid, events: flowEvents }));
  }

  function resetPage() { currentPage = 1; }

  async function openDetails(row, event) {
    selected = row;
    selectedEvents = [];
    detailsError = '';
    detailsLoading = true;
    returnFocus = event?.currentTarget;
    document.body.style.overflow = 'hidden';
    await tick();
    closeButton?.focus();
    try {
      const allEvents = await loadEvents(row);
      selectedEvents = allEvents.filter((item) => String(item.fakturanr ?? '') === String(row.fakturanr ?? ''));
    } catch (cause) {
      detailsError = cause instanceof Error ? cause.message : String(cause);
    } finally {
      detailsLoading = false;
    }
  }

  function closeDetails() {
    selected = null;
    selectedEvents = [];
    document.body.style.overflow = '';
    returnFocus?.focus?.();
  }

  function handleKeydown(event) {
    if (selected && event.key === 'Escape') closeDetails();
  }

  onDestroy(() => { document.body.style.overflow = ''; });
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="workflow-shell">
  <header class="page-heading">
    <div>
      <span class="eyebrow">Workflow mot regnskap</span>
      <h1>Finn fakturaene som trenger et blikk</h1>
      <p>Fakturanummer og leverandør-id brukes som kontrollnøkkel. Usikre koblinger holdes synlige og skal ikke drive automatiske beslutninger.</p>
    </div>
    <div class="coverage"><span>Entydig koblet</span><strong>{safePercent}%</strong><small>{number(safeMatches)} av {number(rows.length)} fakturaer</small></div>
  </header>

  <section class="quality-strip" aria-label="Koblingskvalitet">
    <button type="button" class:active={quality === 'alle'} on:click={() => { quality = 'alle'; resetPage(); }}><span>Alle fakturaer</span><strong>{number(rows.length)}</strong><small>{number(activeInvoices)} med aktive oppgaver</small></button>
    <button type="button" class="safe" class:active={quality === 'Sikker'} on:click={() => { quality = 'Sikker'; resetPage(); }}><span>Sikker kobling</span><strong>{number(safeMatches)}</strong><small>Entydig faktura og leverandør</small></button>
    <button type="button" class="possible" class:active={quality === 'Mulig'} on:click={() => { quality = 'Mulig'; resetPage(); }}><span>Mulig kobling</span><strong>{number(possibleMatches)}</strong><small>Mangler sikker kontrollnøkkel</small></button>
    <button type="button" class="uncertain" class:active={quality === 'Tvetydig'} on:click={() => { quality = 'Tvetydig'; resetPage(); }}><span>Tvetydig</span><strong>{number(ambiguousMatches)}</strong><small>Flere mulige treff</small></button>
    <button type="button" class="missing" class:active={quality === 'Ikke matchet'} on:click={() => { quality = 'Ikke matchet'; resetPage(); }}><span>Ikke matchet</span><strong>{number(unmatched)}</strong><small>Mangler treff i hovedboken</small></button>
  </section>

  <section class="workspace">
    <div class="workspace-heading">
      <div><span class="eyebrow">Fakturaoversikt</span><h2>Workflowstatus</h2></div>
      <span>Viser {filteredRows.length ? pageStart + 1 : 0}–{pageEnd} av {filteredRows.length}</span>
    </div>

    <div class="toolbar">
      <label class="search-field"><span>Søk i fakturaer</span><div><i aria-hidden="true">⌕</i><input bind:value={search} on:input={resetPage} placeholder="Fakturanummer, leverandør eller bilag" /></div></label>
      <label><span>Koblingskvalitet</span><select bind:value={quality} on:change={resetPage}><option value="alle">Alle kvaliteter</option><option>Sikker</option><option>Mulig</option><option>Tvetydig</option><option>Ikke matchet</option></select></label>
      <label><span>Workflowstatus</span><select bind:value={workflowStatus} on:change={resetPage}><option value="alle">Alle statuser</option>{#each statuses as status}<option value={status}>{status}</option>{/each}</select></label>
    </div>

    <div class="table-scroll desktop-table">
      <table>
        <thead><tr><th>Faktura</th><th>Leverandør</th><th>Beløp NOK</th><th>Workflowstatus</th><th>Aktive oppgaver</th><th>Kobling</th><th>Siste hendelse</th><th><span class="sr-only">Åpne</span></th></tr></thead>
        <tbody>
          {#each visibleRows as row}
            <tr>
              <th class="invoice-number">{row.fakturanr}</th>
              <td><span class="vendor">{row.leverandor_navn ?? 'Ukjent leverandør'}</span><small>{row.workflow_leverandor_id ?? 'Ingen leverandør-id'}</small></td>
              <td class="numeric">{money(row.workflow_belop_nok)}</td>
              <td><span class="workflow-badge">{row.workflow_status}</span></td>
              <td><strong>{number(row.aktive_oppgaver)}</strong><small>{number(row.aktive_brukere_antall)} brukere</small></td>
              <td><span class="quality-badge {qualityClass(row.koblingskvalitet)}"><i aria-hidden="true"></i>{row.koblingskvalitet}</span></td>
              <td>{date(row.siste_hendelse_tid)}</td>
              <td><button class="open-button" type="button" on:click={(event) => openDetails(row, event)} aria-label={`Åpne detaljer for faktura ${row.fakturanr}`}>→</button></td>
            </tr>
          {:else}
            <tr><td class="empty-cell" colspan="8">Ingen fakturaer passer med filtrene.</td></tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="mobile-cards">
      {#each visibleRows as row}
        <button type="button" on:click={(event) => openDetails(row, event)}>
          <span class="card-top"><strong>{row.fakturanr}</strong><i class="quality-badge {qualityClass(row.koblingskvalitet)}">{row.koblingskvalitet}</i></span>
          <span class="vendor">{row.leverandor_navn ?? 'Ukjent leverandør'}</span>
          <span class="card-meta"><i>{row.workflow_status}</i><i>{number(row.aktive_oppgaver)} aktive oppgaver</i><b>→</b></span>
        </button>
      {:else}
        <p>Ingen fakturaer passer med filtrene.</p>
      {/each}
    </div>

    <footer class="pagination">
      <label><span>Rader per side</span><select bind:value={pageSize} on:change={resetPage}><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label>
      <nav aria-label="Bla i fakturaer">
        <button type="button" disabled={currentPage === 1} on:click={() => (currentPage -= 1)}>Forrige</button>
        <span>Side <strong>{currentPage}</strong> av {totalPages}</span>
        <button type="button" disabled={currentPage === totalPages} on:click={() => (currentPage += 1)}>Neste</button>
      </nav>
    </footer>
  </section>
</div>

{#if selected}
  <div class="drawer-layer" role="presentation" on:click|self={closeDetails}>
    <div class="invoice-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <header>
        <div><span class="eyebrow">Bilagsmappe</span><h2 id="drawer-title">Faktura {selected.fakturanr}</h2><p>{selected.leverandor_navn ?? 'Ukjent leverandør'}</p></div>
        <button bind:this={closeButton} class="close-button" type="button" on:click={closeDetails} aria-label="Lukk fakturadetaljer">×</button>
      </header>

      <div class="drawer-body">
        <section class="verdict {qualityClass(selected.koblingskvalitet)}">
          <div><span>Koblingskvalitet</span><strong>{selected.koblingskvalitet}</strong></div>
          <p>{selected.koblingsaarsak ?? 'Ingen forklaring registrert.'}</p>
        </section>

        <section class="facts" aria-label="Fakturadetaljer">
          <div><span>Workflowbilag</span><strong>{selected.workflow_bilagsnr ?? '–'}</strong></div>
          <div><span>Regnskapsbilag</span><strong>{selected.regnskap_bilagsnr ?? '–'}</strong></div>
          <div><span>Beløp</span><strong>{money(selected.workflow_belop_nok)} NOK</strong></div>
          <div><span>Finansiering</span><strong>{selected.finansieringer ?? '–'}</strong></div>
          <div><span>Perioder</span><strong>{selected.perioder ?? '–'}</strong></div>
          <div><span>Kontoer</span><strong>{selected.kontoer ?? '–'}</strong></div>
          <div><span>Workflowflyter</span><strong>{number(selected.workflow_flyter)}</strong></div>
          <div><span>Aktive brukere</span><strong>{selected.aktive_brukere ?? '–'}</strong></div>
        </section>

        <section class="history">
          <div class="history-heading"><div><span class="eyebrow">Oppgavehistorikk</span><h3>Hendelser per workflow-oid</h3></div>{#if !detailsLoading}<span>{selectedEvents.length} hendelser</span>{/if}</div>
          {#if detailsLoading}
            <div class="history-state"><span class="spinner" aria-hidden="true"></span><p>Henter oppgavehistorikken.</p></div>
          {:else if detailsError}
            <div class="history-state error"><strong>Historikken kunne ikke lastes</strong><p>{detailsError}</p></div>
          {:else}
            {#each eventGroups as flow}
              <article class="flow">
                <div class="flow-heading"><strong title={flow.oid}>{shortOid(flow.oid)}</strong><span>{flow.events.length} hendelser</span></div>
                <ol>
                  {#each flow.events as event}
                    <li class:current={event.er_aktiv}>
                      <span class="timeline-mark" aria-hidden="true"></span>
                      <div class="event-time"><strong>{date(event.hendelse_tid)}</strong><small>Oppgave {event.task_id ?? '–'} · node {event.node_id ?? '–'}</small></div>
                      <div class="event-copy"><strong>{event.oppgavestatus_tekst}</strong><span>{event.handling_tekst}</span><small>{event.er_aktiv ? (event.wf_user_id ?? 'Ingen bruker') : (event.real_user ?? 'Ingen bruker')}</small></div>
                    </li>
                  {/each}
                </ol>
              </article>
            {:else}
              <div class="history-state"><p>Ingen hendelser funnet for fakturaen.</p></div>
            {/each}
          {/if}
        </section>
      </div>
    </div>
  </div>
{/if}

<style>
  .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
  .workflow-shell{max-width:1480px;margin:0 auto}.page-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:32px;margin-bottom:26px}.eyebrow{display:block;margin-bottom:7px;color:var(--teal-700);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.14em}.page-heading h1{max-width:760px;margin:0 0 8px;font-family:"Aptos Display","Segoe UI Variable Display",sans-serif;font-size:clamp(30px,3vw,44px);line-height:1.08;letter-spacing:-.035em}.page-heading p{max-width:790px;margin:0;color:var(--muted);font-size:13px;line-height:1.55}.coverage{display:grid;min-width:165px;padding:13px 16px;border-left:3px solid var(--teal-600);background:white;box-shadow:0 7px 22px rgba(20,40,59,.06)}.coverage span{color:var(--muted);font-size:8px;text-transform:uppercase;letter-spacing:.09em}.coverage strong{margin:3px 0 1px;font-family:"Cascadia Mono","SFMono-Regular",Consolas,monospace;font-size:27px}.coverage small{color:var(--quiet);font-size:8px}
  .quality-strip{display:grid;grid-template-columns:repeat(5,1fr);margin-bottom:16px;border:1px solid var(--line);border-radius:9px;background:white;overflow:hidden}.quality-strip button{position:relative;display:grid;gap:3px;padding:14px 16px;border:0;border-right:1px solid var(--line);background:white;text-align:left;cursor:pointer}.quality-strip button:last-child{border:0}.quality-strip button::after{content:"";position:absolute;inset:auto 14px 0;height:3px;background:#7890a0;opacity:.55}.quality-strip button.safe::after{background:var(--green)}.quality-strip button.possible::after{background:#57849a}.quality-strip button.uncertain::after{background:var(--amber)}.quality-strip button.missing::after{background:var(--red)}.quality-strip button:hover,.quality-strip button.active{background:#f7fafb}.quality-strip button.active::after{inset-inline:0;opacity:1}.quality-strip span{color:var(--muted);font-size:8px;text-transform:uppercase;letter-spacing:.06em}.quality-strip strong{font-size:21px;line-height:1.1}.quality-strip small{color:var(--quiet);font-size:8px}
  .workspace{background:white;border:1px solid var(--line);border-radius:10px;overflow:hidden}.workspace-heading{display:flex;align-items:flex-end;justify-content:space-between;padding:20px 20px 14px}.workspace-heading h2{margin:0;font-family:"Aptos Display","Segoe UI Variable Display",sans-serif;font-size:22px}.workspace-heading>span{color:var(--muted);font-size:9px}.toolbar{display:grid;grid-template-columns:1.5fr .65fr .65fr;gap:10px;padding:0 20px 16px}.toolbar label{display:grid;gap:5px}.toolbar label>span{color:var(--muted);font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.07em}.toolbar input,.toolbar select{width:100%;height:36px;border:1px solid var(--line-strong);border-radius:6px;background:white;color:var(--ink);font-size:10px}.toolbar select{padding:0 28px 0 9px}.search-field div{position:relative}.search-field i{position:absolute;left:10px;top:7px;color:var(--quiet);font-size:17px;font-style:normal}.search-field input{padding:0 10px 0 33px}.search-field input::placeholder{color:#9ba7af}
  .table-scroll{overflow:auto;border-top:1px solid var(--line)}table{width:100%;border-collapse:collapse;font-size:9px}th,td{padding:10px 11px;border-bottom:1px solid #e8edf0;text-align:left;white-space:nowrap}thead th{position:sticky;top:0;z-index:2;background:#edf3f5;color:#526676;font-size:7px;text-transform:uppercase;letter-spacing:.05em}tbody tr:hover td,tbody tr:hover th{background:#fafcfc}tbody tr:last-child td,tbody tr:last-child th{border-bottom:0}.invoice-number{font-family:"Cascadia Mono","SFMono-Regular",Consolas,monospace;font-size:9px}.vendor{display:block;max-width:220px;overflow:hidden;text-overflow:ellipsis;font-weight:650}.vendor+small,td strong+small{display:block;margin-top:3px;color:var(--quiet);font-size:7px}.numeric{text-align:right;font-variant-numeric:tabular-nums}.workflow-badge{display:inline-block;padding:4px 6px;border-radius:4px;background:#e9eff4;color:#3a5970;font-size:8px;font-weight:700}.quality-badge{display:inline-flex;align-items:center;gap:5px;padding:4px 6px;border-radius:4px;font-size:8px;font-weight:750;font-style:normal}.quality-badge i{width:5px;height:5px;border-radius:50%;background:currentColor}.quality-badge.safe{background:var(--green-soft);color:var(--green)}.quality-badge.possible{background:#e7f0f4;color:#436f83}.quality-badge.uncertain{background:var(--amber-soft);color:var(--amber)}.quality-badge.missing{background:var(--red-soft);color:var(--red)}.open-button{display:grid;place-items:center;width:27px;height:27px;border:1px solid var(--line-strong);border-radius:5px;background:white;color:var(--teal-700);cursor:pointer}.open-button:hover{border-color:var(--teal-600);background:var(--teal-100)}.empty-cell{padding:34px!important;text-align:center!important;color:var(--muted)}
  .mobile-cards{display:none}.pagination{display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-top:1px solid var(--line);background:#fafcfc}.pagination>label{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:8px}.pagination select{height:30px;border:1px solid var(--line-strong);border-radius:5px;background:white;font-size:9px}.pagination nav{display:flex;align-items:center;gap:10px}.pagination nav button{height:30px;padding:0 10px;border:1px solid var(--line-strong);border-radius:5px;background:white;color:var(--navy-700);font-size:8px;font-weight:700;cursor:pointer}.pagination nav button:disabled{opacity:.4;cursor:not-allowed}.pagination nav span{min-width:90px;color:var(--muted);font-size:8px;text-align:center}
  .drawer-layer{position:fixed;inset:0;z-index:80;background:rgba(9,22,34,.48);backdrop-filter:blur(2px);animation:fade-in .18s ease}.invoice-drawer{position:absolute;inset:0 0 0 auto;width:min(760px,92vw);display:flex;flex-direction:column;background:#f4f7f8;box-shadow:-24px 0 70px rgba(8,24,37,.25);animation:slide-in .24s ease}.invoice-drawer>header{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:22px 24px;background:var(--navy-900);color:white}.invoice-drawer header .eyebrow{color:#74c5bf}.invoice-drawer h2{margin:0;font-family:"Aptos Display","Segoe UI Variable Display",sans-serif;font-size:26px}.invoice-drawer header p{margin:4px 0 0;color:#afc0cc;font-size:10px}.close-button{display:grid;place-items:center;width:34px;height:34px;border:1px solid #50697c;border-radius:6px;background:transparent;color:white;font-size:22px;line-height:1;cursor:pointer}.close-button:hover{background:#26445b}.drawer-body{overflow:auto;padding:18px 20px 40px}.verdict{display:grid;grid-template-columns:150px 1fr;gap:20px;padding:15px 16px;border:1px solid var(--line);border-left:4px solid #638095;border-radius:7px;background:white}.verdict.safe{border-left-color:var(--green)}.verdict.possible{border-left-color:#57849a}.verdict.uncertain{border-left-color:var(--amber)}.verdict.missing{border-left-color:var(--red)}.verdict div{display:grid;gap:4px}.verdict span,.facts span{color:var(--quiet);font-size:8px;text-transform:uppercase;letter-spacing:.07em}.verdict strong{font-size:13px}.verdict p{margin:0;color:var(--muted);font-size:9px;line-height:1.55}.facts{display:grid;grid-template-columns:repeat(4,1fr);margin:12px 0;background:white;border:1px solid var(--line);border-radius:7px;overflow:hidden}.facts div{display:grid;align-content:start;gap:4px;min-height:65px;padding:12px;border-right:1px solid var(--line);border-bottom:1px solid var(--line)}.facts div:nth-child(4n){border-right:0}.facts div:nth-last-child(-n+4){border-bottom:0}.facts strong{font-size:9px;overflow-wrap:anywhere}.history{padding:17px;background:white;border:1px solid var(--line);border-radius:7px}.history-heading{display:flex;align-items:flex-end;justify-content:space-between}.history-heading h3{margin:0;font-family:"Aptos Display","Segoe UI Variable Display",sans-serif;font-size:17px}.history-heading>span{color:var(--muted);font-size:8px}.flow{margin-top:15px;border:1px solid var(--line);border-radius:7px;overflow:hidden}.flow-heading{display:flex;justify-content:space-between;gap:12px;padding:9px 11px;background:#edf3f5}.flow-heading strong{font-family:"Cascadia Mono","SFMono-Regular",Consolas,monospace;font-size:8px}.flow-heading span{color:var(--muted);font-size:8px}.flow ol{margin:0;padding:0;list-style:none}.flow li{position:relative;display:grid;grid-template-columns:13px 145px 1fr;gap:9px;padding:11px 12px;border-top:1px solid #e7edf0}.flow li.current{background:#f0f8f5}.timeline-mark{position:relative;width:7px;height:7px;margin-top:3px;border:2px solid #7893a4;border-radius:50%;background:white}.timeline-mark::after{content:"";position:absolute;left:1px;top:7px;width:1px;height:calc(100% + 14px);background:#ced9df}.flow li:last-child .timeline-mark::after{display:none}.flow li.current .timeline-mark{border-color:var(--green);background:var(--green)}.event-time,.event-copy{display:grid;align-content:start;gap:3px}.event-time strong,.event-copy strong{font-size:8px}.event-time small,.event-copy small{color:var(--quiet);font-size:7px}.event-copy span{color:var(--muted);font-size:8px;line-height:1.4}.history-state{display:flex;align-items:center;justify-content:center;gap:10px;min-height:130px;color:var(--muted);font-size:9px;text-align:center}.history-state .spinner{width:23px;height:23px;border:2px solid var(--line);border-top-color:var(--teal-600);border-radius:50%;animation:spin .8s linear infinite}.history-state.error{display:grid;color:var(--red)}.history-state p{margin:0}
  @keyframes fade-in{from{opacity:0}}@keyframes slide-in{from{transform:translateX(40px);opacity:.8}}@keyframes spin{to{transform:rotate(360deg)}}
  @media(max-width:1100px){.quality-strip{grid-template-columns:repeat(3,1fr)}.quality-strip button:nth-child(3){border-right:0}.quality-strip button:nth-child(-n+3){border-bottom:1px solid var(--line)}.toolbar{grid-template-columns:1fr 1fr}.search-field{grid-column:1/-1}.facts{grid-template-columns:repeat(2,1fr)}.facts div:nth-child(2n){border-right:0}.facts div:nth-last-child(-n+4){border-bottom:1px solid var(--line)}.facts div:nth-last-child(-n+2){border-bottom:0}}
  @media(max-width:760px){.page-heading{flex-direction:column}.coverage{width:100%}.quality-strip{grid-template-columns:1fr 1fr}.quality-strip button{border-bottom:1px solid var(--line)}.quality-strip button:nth-child(3){border-right:1px solid var(--line)}.quality-strip button:nth-child(even){border-right:0}.quality-strip button:last-child{grid-column:1/-1}.workspace-heading{align-items:flex-start;flex-direction:column}.toolbar{grid-template-columns:1fr}.search-field{grid-column:auto}.desktop-table{display:none}.mobile-cards{display:grid;border-top:1px solid var(--line)}.mobile-cards>button{display:grid;gap:7px;padding:13px 15px;border:0;border-bottom:1px solid var(--line);background:white;text-align:left}.mobile-cards>p{margin:0;padding:25px;color:var(--muted);font-size:10px;text-align:center}.card-top,.card-meta{display:flex;align-items:center;justify-content:space-between;gap:10px}.card-top>strong{font-family:"Cascadia Mono","SFMono-Regular",Consolas,monospace;font-size:10px}.mobile-cards .vendor{font-size:10px}.card-meta i{color:var(--muted);font-size:8px;font-style:normal}.card-meta b{margin-left:auto;color:var(--teal-700)}.pagination{align-items:flex-start;flex-direction:column;gap:12px}.pagination nav{width:100%;justify-content:space-between}.invoice-drawer{width:100vw}.drawer-body{padding:14px 12px 30px}.verdict{grid-template-columns:1fr}.flow li{grid-template-columns:13px 1fr}.event-copy{grid-column:2}.invoice-drawer>header{padding:18px}.invoice-drawer h2{font-size:22px}}
  @media(max-width:480px){.page-heading h1{font-size:30px}.facts{grid-template-columns:1fr}.facts div,.facts div:nth-child(2n){border-right:0;border-bottom:1px solid var(--line)!important}.facts div:last-child{border-bottom:0!important}}
</style>
