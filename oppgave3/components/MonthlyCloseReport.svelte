<script>
  export let summary = [];
  export let invoices = [];

  let section = '711';
  let financing = '154301';

  const number = (value) =>
    value === null || value === undefined
      ? '–'
      : Number(value / 1000).toLocaleString('nb-NO', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 1
        });

  const periodLabel = (period) => {
    const value = String(period ?? '');
    if (value.length !== 6) return value || '–';
    const date = new Date(Number(value.slice(0, 4)), Number(value.slice(4, 6)) - 1, 1);
    return date.toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' });
  };

  $: period = summary[0]?.periode;
  $: downloadPeriod = String(period ?? '').replace(/^(\d{4})(\d{2})$/, '$1-$2');
  $: downloadHref = downloadPeriod
    ? `/manedsavslutning_${downloadPeriod}.xlsx?v=${period}-cash712`
    : '/manedsavslutning-siste.xlsx';
  $: sections = [...new Set(summary.filter((row) => row.omfang === 'Seksjon').map((row) => row.omfang_id))].sort();
  $: sectionRows = summary.filter((row) => row.omfang === 'Seksjon' && row.omfang_id === section);
  $: financings = [...new Set(sectionRows.map((row) => row.finansiering))].sort();
  $: if (financings.length && !financings.includes(financing)) financing = financings[0];
  $: selectedRows = sectionRows.filter((row) => row.finansiering === financing);
  $: nkomRows = summary.filter((row) => row.omfang === 'Nkom' && row.kategori === 'Driftskostnader');
  $: sectionInvoices = invoices.filter((row) => row.seksjon === section);
</script>

<section class="close-shell">
  <div class="heading">
    <div>
      <span class="kicker">Månedsavslutning · {periodLabel(period)}</span>
      <h2>Hovedbok, budsjett og kandidater til fakturakontroll</h2>
      <p>Siste tilgjengelige periode velges automatisk. Beløp vises i NOK 1 000. Diff = budsjett − hovedbok.</p>
    </div>
    <a class="download" href={downloadHref} download>Last ned utfylt Excel-mal</a>
  </div>

  <div class="filters">
    <label><span>Seksjon</span><select bind:value={section}>{#each sections as value}<option value={value}>{value}</option>{/each}</select></label>
    <label><span>Finansiering</span><select bind:value={financing}>{#each financings as value}<option value={value}>{value}</option>{/each}</select></label>
  </div>

  <div class="table-scroll">
    <table>
      <thead><tr><th>Kategori</th><th>Hovedbok måned</th><th>Budsjett måned</th><th>Diff</th><th>Hovedbok hittil</th><th>Budsjett hittil</th><th>Diff hittil</th></tr></thead>
      <tbody>
        {#each selectedRows as row}
          <tr class:total={row.kategori === 'Driftskostnader'}>
            <th>{row.kategori}</th>
            <td>{number(row.hovedbok_maaned_nok)}</td><td>{number(row.budsjett_maaned_nok)}</td><td>{number(row.avvik_maaned_nok)}</td>
            <td>{number(row.hovedbok_hittil_nok)}</td><td>{number(row.budsjett_hittil_nok)}</td><td>{number(row.avvik_hittil_nok)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="subheading"><h3>Total Nkom per finansiering</h3><span>Driftskostnader</span></div>
  <div class="table-scroll">
    <table>
      <thead><tr><th>Finansiering</th><th>Hovedbok måned</th><th>Budsjett måned</th><th>Diff</th><th>Hovedbok hittil</th><th>Budsjett hittil</th><th>Diff hittil</th></tr></thead>
      <tbody>{#each nkomRows as row}<tr><th>{row.finansiering}</th><td>{number(row.hovedbok_maaned_nok)}</td><td>{number(row.budsjett_maaned_nok)}</td><td>{number(row.avvik_maaned_nok)}</td><td>{number(row.hovedbok_hittil_nok)}</td><td>{number(row.budsjett_hittil_nok)}</td><td>{number(row.avvik_hittil_nok)}</td></tr>{/each}</tbody>
    </table>
  </div>

  <div class="subheading"><h3>Kandidater til fakturakontroll for seksjon {section}</h3><span>{sectionInvoices.length} rader</span></div>
  {#if sectionInvoices.length}
    <div class="table-scroll">
      <table>
        <thead><tr><th>Faktura</th><th>Leverandør</th><th>Status</th><th>Konto</th><th>Prosjekt</th><th>Finansiering</th><th>Beløp</th><th>Alder</th></tr></thead>
        <tbody>{#each sectionInvoices as row}<tr><th>{row.fakturanr}</th><td>{row.leverandor_navn}</td><td title={row.statusgrunnlag}>{row.maanedsavslutningsstatus}</td><td>{row.konto}</td><td>{row.prosjektnr}</td><td>{row.finansiering}</td><td>{number(row.belop_nok)}</td><td>{row.alder_dager} dager</td></tr>{/each}</tbody>
      </table>
    </div>
  {:else}
    <p class="empty">Ingen kontrollkandidater som både mangler bokføringstreff, har en ACT-oppgave og siste fullførte handling ATTEST eller BDMGOD for denne seksjonen.</p>
  {/if}
</section>

<style>
  .close-shell{margin-top:20px;padding:20px;background:white;border:1px solid #dce3e9;border-radius:12px;color:#172433}.heading,.subheading{display:flex;align-items:center;justify-content:space-between;gap:18px}.heading h2{margin:3px 0!important;font-size:21px}.heading p{margin:0;color:#687786;font-size:11px}.kicker{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#317e7a}.download{padding:10px 13px;border-radius:8px;background:#285c78;color:white;text-decoration:none;font-size:11px;font-weight:750}.filters{display:flex;gap:10px;margin:16px 0}.filters label{display:grid;gap:4px}.filters span{font-size:9px;font-weight:750;color:#657485}.filters select{min-width:170px;height:36px;border:1px solid #ccd6e0;border-radius:7px;background:white;padding:0 9px}.table-scroll{overflow:auto;border:1px solid #e1e7ec;border-radius:8px}table{width:100%;border-collapse:collapse;font-size:10px}th,td{padding:8px 9px;border-bottom:1px solid #e8edf1;text-align:right;white-space:nowrap}th:first-child{text-align:left}thead th{background:#edf2f6;color:#445467;text-transform:uppercase;font-size:8px}.total th,.total td{background:#edf6f4;font-weight:800}.subheading{margin:20px 0 8px}.subheading h3{margin:0!important;font-size:15px}.subheading span{font-size:10px;color:#718091}.empty{margin:0;padding:12px;background:#f7f9fb;color:#697887;font-size:11px;border-radius:7px}@media(max-width:850px){.heading{align-items:flex-start;flex-direction:column}.filters{flex-direction:column}.filters select{width:100%}}
</style>
