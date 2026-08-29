<script>
  export let summary = [];
  export let invoices = [];
  export let validations = [];
  export let showDownload = true;

  let section = '711';
  let financing = '154301';
  let showNkom = false;

  const money = (value, signed = false) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '–';
    const amount = Number(value) / 1000;
    return amount.toLocaleString('nb-NO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
      signDisplay: signed ? 'exceptZero' : 'auto'
    });
  };

  const periodLabel = (period) => {
    const value = String(period ?? '');
    if (value.length !== 6) return value || 'Ukjent periode';
    const date = new Date(Number(value.slice(0, 4)), Number(value.slice(4, 6)) - 1, 1);
    return date.toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' });
  };

  const diffClass = (value) => Number(value) < 0 ? 'negative' : Number(value) > 0 ? 'positive' : '';
  const dateLabel = (value) => {
    if (!value) return 'Ukjent dato';
    return new Date(value).toLocaleDateString('nb-NO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  $: period = summary[0]?.periode;
  $: downloadPeriod = String(period ?? '').replace(/^(\d{4})(\d{2})$/, '$1-$2');
  $: downloadHref = downloadPeriod ? `/manedsavslutning_${downloadPeriod}.xlsx` : '/manedsavslutning-siste.xlsx';
  $: sections = [...new Set(summary.filter((row) => row.omfang === 'Seksjon').map((row) => String(row.omfang_id)))].sort();
  $: if (sections.length && !sections.includes(section)) section = sections[0];
  $: sectionRows = summary.filter((row) => row.omfang === 'Seksjon' && String(row.omfang_id) === section);
  $: financings = [...new Set(sectionRows.map((row) => String(row.finansiering)))].sort((a, b) => a.localeCompare(b, 'nb-NO'));
  $: if (financings.length && !financings.includes(financing)) financing = financings.includes('154301') ? '154301' : financings[0];
  $: selectedRows = sectionRows.filter((row) => String(row.finansiering) === financing);
  $: nkomRows = summary.filter((row) => row.omfang === 'Nkom' && row.kategori === 'Driftskostnader');
  $: currentInvoices = invoices.filter((row) => row.er_aktuell === true);
  $: historicalInvoices = invoices.filter((row) => row.er_aktuell !== true);
  $: sectionInvoices = currentInvoices.filter((row) => String(row.seksjon) === section);
  $: sectionHistoricalInvoices = historicalInvoices.filter((row) => String(row.seksjon) === section);
  $: warningChecks = validations.filter((row) => row.status !== 'ok');
  $: totalRow = selectedRows.find((row) => row.kategori === 'Driftskostnader');
</script>

<div class="report-shell">
  <header class="page-heading">
    <div>
      <span class="eyebrow">Månedsavslutning · {periodLabel(period)}</span>
      <h1>Kontroller perioden før den lukkes</h1>
      <p>Sammenlign hovedbok og budsjett, undersøk avvik og følg opp fakturaer som kan mangle bokføring.</p>
    </div>
    {#if showDownload}
      <a class="download" href={downloadHref} download>
        <span aria-hidden="true">↓</span>
        <span><strong>Last ned Excel</strong><small>Utfylt mal for {downloadPeriod || 'siste periode'}</small></span>
      </a>
    {/if}
  </header>

  <section class="control-rail" aria-label="Kontrollstatus">
    <div class="rail-title"><span>Kontrollbilde</span><strong>{warningChecks.length ? `${warningChecks.length} punkt må avklares` : 'Ingen varslede kontrollpunkt'}</strong></div>
    <div class="rail-items">
      <article>
        <span class="rail-marker period" aria-hidden="true"></span>
        <div><small>Aktuell periode</small><strong>{periodLabel(period)}</strong></div>
      </article>
      <article class:attention={currentInvoices.length > 0}>
        <span class="rail-marker" aria-hidden="true"></span>
        <div><small>Fakturakandidater</small><strong>{currentInvoices.length} til kontroll</strong></div>
      </article>
      <article class:attention={warningChecks.length > 0}>
        <span class="rail-marker" aria-hidden="true"></span>
        <div><small>Faglige avklaringer</small><strong>{warningChecks.length} åpne punkt</strong></div>
      </article>
      <article>
        <span class="rail-marker complete" aria-hidden="true"></span>
        <div><small>Dekning</small><strong>{sections.length} seksjoner</strong></div>
      </article>
    </div>
  </section>

  {#if warningChecks.length}
    <details class="notice">
      <summary><span class="notice-icon" aria-hidden="true">i</span><span><strong>Foreløpig faglig grunnlag</strong><small>Åpne for å se kontrollpunktene som ikke er endelig godkjent.</small></span><b>Vis {warningChecks.length}</b></summary>
      <div class="notice-list">
        {#each warningChecks as check}
          <div><strong>{check.kontroll}</strong><span>{check.detalj}</span><b>{check.antall}</b></div>
        {/each}
      </div>
    </details>
  {/if}

  <section class="workspace">
    <div class="workspace-heading">
      <div><span class="eyebrow">Resultat mot budsjett</span><h2>Seksjonsoversikt</h2></div>
      <p>Beløp i NOK 1 000. Avvik er budsjett minus hovedbok.</p>
    </div>

    <div class="section-selector">
      <label>
        <span>Seksjon</span>
        <select bind:value={section}>
          {#each sections as value}
            <option value={value}>Seksjon {value}</option>
          {/each}
        </select>
      </label>
      <p><strong>{sections.length}</strong> seksjoner med rapportdata</p>
    </div>

    <div class="table-controls">
      <label><span>Finansiering</span><select bind:value={financing}>{#each financings as value}<option value={value}>{value}</option>{/each}</select></label>
      {#if totalRow}
        <div class="selected-total"><span>Driftskostnader denne måneden</span><strong class="tabular">{money(totalRow.hovedbok_maaned_nok)}</strong></div>
        <div class="selected-total"><span>Avvik denne måneden</span><strong class="tabular {diffClass(totalRow.avvik_maaned_nok)}">{money(totalRow.avvik_maaned_nok, true)}</strong></div>
      {/if}
    </div>

    <div class="finance-table-scroll">
      <table class="finance-table">
        <thead>
          <tr class="group-row"><th rowspan="2">Kategori</th><th colspan="3">Denne måneden</th><th colspan="3">Hittil i år</th></tr>
          <tr><th>Hovedbok</th><th>Budsjett</th><th>Avvik</th><th>Hovedbok</th><th>Budsjett</th><th>Avvik</th></tr>
        </thead>
        <tbody>
          {#each selectedRows as row}
            <tr class:total={row.kategori === 'Driftskostnader'}>
              <th>{row.kategori}</th>
              <td>{money(row.hovedbok_maaned_nok)}</td>
              <td>{money(row.budsjett_maaned_nok)}</td>
              <td class={diffClass(row.avvik_maaned_nok)}>{money(row.avvik_maaned_nok, true)}</td>
              <td>{money(row.hovedbok_hittil_nok)}</td>
              <td>{money(row.budsjett_hittil_nok)}</td>
              <td class={diffClass(row.avvik_hittil_nok)}>{money(row.avvik_hittil_nok, true)}</td>
            </tr>
          {:else}
            <tr><td colspan="7" class="empty-cell">Ingen tall for valgt kombinasjon.</td></tr>
          {/each}
        </tbody>
      </table>
    </div>

    <button class="nkom-toggle" type="button" on:click={() => (showNkom = !showNkom)} aria-expanded={showNkom}>
      <span><strong>Nkom samlet per finansiering</strong><small>Driftskostnader for hele virksomheten</small></span><b>{showNkom ? 'Skjul' : 'Vis oversikt'} <i aria-hidden="true">⌄</i></b>
    </button>
    {#if showNkom}
      <div class="finance-table-scroll nkom-table">
        <table class="finance-table">
          <thead><tr><th>Finansiering</th><th>Hovedbok måned</th><th>Budsjett måned</th><th>Avvik måned</th><th>Hovedbok hittil</th><th>Budsjett hittil</th><th>Avvik hittil</th></tr></thead>
          <tbody>{#each nkomRows as row}<tr><th>{row.finansiering}</th><td>{money(row.hovedbok_maaned_nok)}</td><td>{money(row.budsjett_maaned_nok)}</td><td class={diffClass(row.avvik_maaned_nok)}>{money(row.avvik_maaned_nok, true)}</td><td>{money(row.hovedbok_hittil_nok)}</td><td>{money(row.budsjett_hittil_nok)}</td><td class={diffClass(row.avvik_hittil_nok)}>{money(row.avvik_hittil_nok, true)}</td></tr>{/each}</tbody>
        </table>
      </div>
    {/if}
  </section>

  <section class="workspace invoice-workspace">
    <div class="workspace-heading">
      <div><span class="eyebrow">Arbeidsliste</span><h2>Aktuelle fakturaer i seksjon {section}</h2></div>
      <span class:has-items={sectionInvoices.length > 0} class="count-pill">{sectionInvoices.length} fakturaer</span>
    </div>

    {#if sectionInvoices.length}
      <div class="invoice-list">
        {#each sectionInvoices as row}
          <article>
            <div class="invoice-id"><span>Faktura</span><strong>{row.fakturanr}</strong><small>{row.leverandor_navn || 'Ukjent leverandør'}</small></div>
            <dl>
              <div><dt>Status</dt><dd><span class="status-badge">{row.maanedsavslutningsstatus}</span></dd></div>
              <div><dt>Konto / prosjekt</dt><dd>{row.konto || '–'} / {row.prosjektnr || '–'}</dd></div>
              <div><dt>Finansiering</dt><dd>{row.finansiering || '–'}</dd></div>
              <div><dt>Beløp</dt><dd class="tabular">{money(row.belop_nok)}</dd></div>
              <div><dt>Siste handling</dt><dd>{dateLabel(row.siste_handling_tid)} · {row.alder_dager} dager</dd></div>
            </dl>
            <p>{row.statusgrunnlag}</p>
          </article>
        {/each}
      </div>
    {:else}
      <div class="empty-state"><span aria-hidden="true">✓</span><div><strong>Ingen aktuelle fakturaer i arbeidslisten</strong><p>Ingen fakturaer i seksjon {section} har en registrert handling de siste 31 dagene og oppfyller resten av kontrollregelen.</p></div></div>
    {/if}

    {#if sectionHistoricalInvoices.length}
      <details class="historical-invoices">
        <summary>
          <span><strong>{sectionHistoricalInvoices.length} historiske workflowposter</strong><small>Holdes utenfor arbeidslisten og påvirker ikke regnskapstallene.</small></span>
          <b>Vis poster <i aria-hidden="true">⌄</i></b>
        </summary>
        <div class="historical-explanation">
          Disse postene har fortsatt minst én ACT-rad i workflowsnapshotet, men siste registrerte handling er eldre enn 31 dager. Det er ikke dokumentert at ACT-rader ryddes bort når en flyt avsluttes. Derfor må statusen bekreftes mot fakturasystemet før postene kan behandles som åpne fakturaer.
        </div>
        <div class="historical-table-scroll">
          <table class="historical-table">
            <thead><tr><th>Faktura</th><th>Leverandør</th><th>Siste handling</th><th>Alder</th><th>Status</th></tr></thead>
            <tbody>
              {#each sectionHistoricalInvoices as row}
                <tr>
                  <th>{row.fakturanr}</th>
                  <td>{row.leverandor_navn || 'Ukjent leverandør'}</td>
                  <td>{dateLabel(row.siste_handling_tid)}</td>
                  <td class="old">{row.alder_dager} dager</td>
                  <td>{row.statusgrunnlag}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </details>
    {/if}
  </section>
</div>

<style>
  .report-shell{max-width:1480px;margin:0 auto;color:var(--ink)}
  .page-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:30px;margin-bottom:28px}.eyebrow{display:block;margin-bottom:7px;color:var(--teal-700);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.14em}.page-heading h1{max-width:720px;margin:0 0 8px;font-family:"Aptos Display","Segoe UI Variable Display",sans-serif;font-size:clamp(30px,3vw,44px);line-height:1.08;letter-spacing:-.035em}.page-heading p{max-width:760px;margin:0;color:var(--muted);font-size:13px;line-height:1.55}.download{display:flex;align-items:center;gap:11px;min-width:205px;padding:11px 13px;border:1px solid #0f6662;border-radius:8px;background:var(--teal-700);color:white;text-decoration:none;box-shadow:0 7px 18px rgba(20,116,111,.18)}.download>span:first-child{display:grid;place-items:center;width:30px;height:30px;border:1px solid rgba(255,255,255,.35);border-radius:5px;font-size:18px}.download>span:last-child{display:grid;gap:2px}.download strong{font-size:11px}.download small{color:#bfe3df;font-size:8px}
  .control-rail{display:grid;grid-template-columns:190px 1fr;margin-bottom:16px;background:var(--navy-900);color:white;border-radius:10px;overflow:hidden;box-shadow:0 8px 24px rgba(20,40,59,.09)}.rail-title{display:grid;align-content:center;gap:5px;padding:18px 20px;background:var(--navy-950);border-right:1px solid #294256}.rail-title span{color:#86a0b3;font-size:9px;text-transform:uppercase;letter-spacing:.13em}.rail-title strong{font-size:11px;line-height:1.35}.rail-items{display:grid;grid-template-columns:repeat(4,1fr)}.rail-items article{position:relative;display:flex;align-items:center;gap:11px;min-height:75px;padding:14px 16px;border-right:1px solid #2c4559}.rail-items article:last-child{border:0}.rail-marker{width:8px;height:28px;background:#5f7b8f;border-radius:2px}.rail-marker.period,.rail-marker.complete{background:#63bdb7}.rail-items article.attention .rail-marker{background:#e09a4f}.rail-items div{display:grid;gap:4px}.rail-items small{color:#91a6b5;font-size:8px}.rail-items strong{font-size:11px}
  .notice{margin-bottom:16px;border:1px solid #e8cda4;border-radius:9px;background:#fffaf2;overflow:hidden}.notice summary{display:grid;grid-template-columns:32px 1fr auto;align-items:center;gap:10px;padding:12px 15px;cursor:pointer;list-style:none}.notice summary::-webkit-details-marker{display:none}.notice-icon{display:grid;place-items:center;width:25px;height:25px;border:1px solid #d5a967;border-radius:50%;color:var(--amber);font-family:Georgia,serif;font-weight:700}.notice summary>span:nth-child(2){display:grid;gap:2px}.notice summary strong{font-size:10px}.notice summary small{color:#806c52;font-size:9px}.notice summary b{color:var(--amber);font-size:9px}.notice-list{display:grid;border-top:1px solid #ecd8b9;background:white}.notice-list div{display:grid;grid-template-columns:minmax(180px,.7fr) minmax(300px,2fr) 45px;gap:15px;align-items:start;padding:10px 15px;border-bottom:1px solid #eee4d6;font-size:9px}.notice-list div:last-child{border:0}.notice-list span{color:var(--muted);line-height:1.45}.notice-list b{text-align:right;color:var(--amber)}
  .workspace{margin-top:16px;padding:22px;background:var(--paper);border:1px solid var(--line);border-radius:11px}.workspace-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:20px}.workspace-heading h2{margin:0;font-family:"Aptos Display","Segoe UI Variable Display",sans-serif;font-size:22px;letter-spacing:-.02em}.workspace-heading p{margin:0 0 2px;color:var(--muted);font-size:9px}.section-selector{display:flex;align-items:end;gap:16px;margin:20px 0 16px;padding:12px 14px;background:#edf2f4;border-radius:9px}.section-selector label{display:grid;gap:5px;min-width:220px}.section-selector label span{color:var(--muted);font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.07em}.section-selector select{height:38px;padding:0 32px 0 11px;border:1px solid var(--line-strong);border-radius:6px;background:white;color:var(--ink);font-size:11px}.section-selector p{margin:0 0 9px;color:var(--muted);font-size:9px}.section-selector p strong{color:var(--ink);font-size:11px}
  .table-controls{display:flex;align-items:end;gap:24px;margin-bottom:12px}.table-controls label{display:grid;gap:5px;min-width:210px}.table-controls label span,.selected-total span{color:var(--muted);font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.07em}.table-controls select{height:36px;padding:0 32px 0 10px;border:1px solid var(--line-strong);border-radius:6px;background:white;color:var(--ink);font-size:10px}.selected-total{display:grid;gap:4px;margin-left:auto;text-align:right}.selected-total+.selected-total{margin-left:0;padding-left:24px;border-left:1px solid var(--line)}.selected-total strong{font-size:15px}.positive{color:var(--green)!important}.negative{color:var(--red)!important}
  .finance-table-scroll{overflow:auto;border:1px solid var(--line);border-radius:7px}.finance-table{width:100%;border-collapse:collapse;font-size:10px;font-variant-numeric:tabular-nums}.finance-table th,.finance-table td{padding:11px 13px;border-bottom:1px solid #e7edf0;text-align:right;white-space:nowrap}.finance-table th:first-child{text-align:left}.finance-table thead th{background:#f2f6f7;color:#536777;font-size:8px;text-transform:uppercase;letter-spacing:.04em}.finance-table thead .group-row th{background:#e8eff2;color:#314c61;border-bottom:1px solid #d5e0e5}.finance-table thead .group-row th+th{border-left:1px solid #d3dfe5}.finance-table tbody th{font-weight:650}.finance-table tbody tr:last-child th,.finance-table tbody tr:last-child td{border-bottom:0}.finance-table tr.total th,.finance-table tr.total td{background:#e8f4f1;font-weight:800;border-top:2px solid #80bcb5}.empty-cell{text-align:center!important;color:var(--muted)!important;padding:28px!important}
  .nkom-toggle{display:flex;align-items:center;justify-content:space-between;width:100%;margin-top:13px;padding:11px 13px;border:1px solid var(--line);border-radius:7px;background:#f8fafb;text-align:left;cursor:pointer}.nkom-toggle>span{display:grid;gap:3px}.nkom-toggle strong{font-size:10px}.nkom-toggle small{color:var(--muted);font-size:8px}.nkom-toggle b{color:var(--teal-700);font-size:9px}.nkom-toggle i{display:inline-block;margin-left:5px;font-style:normal}.nkom-table{margin-top:8px}
  .invoice-workspace{margin-top:20px}.count-pill{padding:5px 9px;border-radius:99px;background:#edf2f4;color:var(--muted);font-size:9px;font-weight:700}.count-pill.has-items{background:var(--amber-soft);color:var(--amber)}.invoice-list{display:grid;gap:8px;margin-top:16px}.invoice-list article{display:grid;grid-template-columns:minmax(160px,.7fr) minmax(480px,2fr);gap:12px 28px;padding:15px;border:1px solid var(--line);border-left:3px solid #d18a3e;border-radius:7px}.invoice-id{display:grid;align-content:start;gap:3px}.invoice-id>span{color:var(--muted);font-size:8px;text-transform:uppercase;letter-spacing:.08em}.invoice-id>strong{font-family:"Cascadia Mono","SFMono-Regular",Consolas,monospace;font-size:13px}.invoice-id>small{color:var(--muted);font-size:9px}.invoice-list dl{display:grid;grid-template-columns:1.3fr repeat(4,1fr);gap:16px;margin:0}.invoice-list dl div{display:grid;align-content:start;gap:5px}.invoice-list dt{color:var(--quiet);font-size:8px}.invoice-list dd{margin:0;font-size:9px;font-weight:650}.status-badge{display:inline-block;padding:4px 6px;border-radius:4px;background:var(--amber-soft);color:var(--amber);font-size:8px}.old{color:var(--red)}.invoice-list article>p{grid-column:1/-1;margin:0;padding-top:9px;border-top:1px solid #edf1f3;color:var(--muted);font-size:8px;line-height:1.4}.empty-state{display:flex;align-items:center;gap:13px;margin-top:16px;padding:21px;background:#f4f8f7;border:1px solid #d6e7e2;border-radius:7px}.empty-state>span{display:grid;place-items:center;width:31px;height:31px;border-radius:50%;background:var(--green-soft);color:var(--green);font-weight:800}.empty-state div{display:grid;gap:3px}.empty-state strong{font-size:10px}.empty-state p{margin:0;color:var(--muted);font-size:9px}.historical-invoices{margin-top:14px;border:1px solid #e5d7c5;border-radius:8px;background:#fffcf7;overflow:hidden}.historical-invoices summary{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:13px 14px;cursor:pointer;list-style:none}.historical-invoices summary::-webkit-details-marker{display:none}.historical-invoices summary>span{display:grid;gap:3px}.historical-invoices summary strong{font-size:10px}.historical-invoices summary small{color:var(--muted);font-size:8px}.historical-invoices summary b{color:var(--amber);font-size:9px}.historical-invoices summary i{font-style:normal}.historical-explanation{padding:12px 14px;border-top:1px solid #eadfce;background:#fff;color:var(--muted);font-size:9px;line-height:1.55}.historical-table-scroll{overflow:auto;border-top:1px solid var(--line)}.historical-table{width:100%;border-collapse:collapse;background:#fff;font-size:9px}.historical-table th,.historical-table td{padding:10px 12px;border-bottom:1px solid #edf1f3;text-align:left;vertical-align:top}.historical-table thead th{background:#f3f6f7;color:var(--muted);font-size:8px;text-transform:uppercase}.historical-table tbody th{white-space:nowrap;font-family:"Cascadia Mono","SFMono-Regular",Consolas,monospace}.historical-table td:last-child{min-width:360px;color:var(--muted);line-height:1.4}
  @media(max-width:1150px){.control-rail{grid-template-columns:1fr}.rail-title{border:0;border-bottom:1px solid #294256}.invoice-list article{grid-template-columns:1fr}.invoice-list dl{grid-template-columns:repeat(3,1fr)}}
  @media(max-width:760px){.page-heading{align-items:stretch;flex-direction:column}.download{width:max-content}.control-rail{display:block}.rail-items{grid-template-columns:1fr 1fr}.rail-items article{border-bottom:1px solid #2c4559}.notice-list div{grid-template-columns:1fr}.notice-list b{text-align:left}.workspace{padding:16px}.workspace-heading{align-items:flex-start;flex-direction:column}.section-selector{align-items:stretch;flex-direction:column}.section-selector label{min-width:0}.table-controls{align-items:stretch;flex-direction:column;gap:10px}.table-controls label{min-width:0}.selected-total{margin-left:0;text-align:left}.selected-total+.selected-total{padding:0;border:0}.invoice-list dl{grid-template-columns:1fr 1fr}}
  @media(max-width:480px){.page-heading h1{font-size:30px}.rail-items{grid-template-columns:1fr}.invoice-list dl{grid-template-columns:1fr}.download{width:100%}}
</style>
