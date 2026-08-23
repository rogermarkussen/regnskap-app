<script>
  export let view = 'close';
  export let metadata = [];
  export let candidateCount = 0;
  export let onNavigate = () => {};

  const date = (value, includeTime = false) => {
    if (!value) return 'Ikke oppgitt';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleString('nb-NO', includeTime
      ? { dateStyle: 'short', timeStyle: 'short' }
      : { dateStyle: 'short' });
  };

  $: source = metadata[0] ?? {};
</script>

<a class="skip-link" href="#main-content">Hopp til innhold</a>

<aside class="sidebar" aria-label="Oppgave 3">
  <div class="brand">
    <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
    <div><strong>Regnskapskontroll</strong><span>Oppgave 3</span></div>
  </div>

  <nav aria-label="Arbeidsområder">
    <button class:active={view === 'close'} type="button" on:click={() => onNavigate('close')}>
      <span class="nav-icon" aria-hidden="true">↳</span>
      <span><strong>Månedsavslutning</strong><small>Hovedbok og budsjett</small></span>
      {#if candidateCount}<b>{candidateCount}</b>{/if}
    </button>
    <button class:active={view === 'workflow'} type="button" on:click={() => onNavigate('workflow')}>
      <span class="nav-icon" aria-hidden="true">⇄</span>
      <span><strong>Fakturaflyt</strong><small>Workflow mot regnskap</small></span>
    </button>
  </nav>

  <div class="source-card">
    <div><span class="status-dot" aria-hidden="true"></span><strong>Lokalt snapshot</strong></div>
    <dl>
      <div><dt>Workflow til</dt><dd>{date(source.seneste_workflowhendelse, true)}</dd></div>
      <div><dt>Hovedbok til</dt><dd>{date(source.seneste_bilagsdato)}</dd></div>
    </dl>
    <p>{source.snapshot_status ?? 'Uttrekkstidspunkt er ikke dokumentert'}</p>
  </div>

  <div class="access"><span aria-hidden="true">●</span> Kun for intern bruk</div>
</aside>

<header class="mobile-header">
  <div class="brand"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span><strong>Oppgave 3</strong></div>
  <nav aria-label="Arbeidsområder">
    <button class:active={view === 'close'} type="button" on:click={() => onNavigate('close')}>Avslutning</button>
    <button class:active={view === 'workflow'} type="button" on:click={() => onNavigate('workflow')}>Fakturaflyt</button>
  </nav>
</header>

<style>
  .skip-link{position:fixed;left:12px;top:-60px;z-index:100;padding:10px 14px;background:white;color:var(--navy-900);border-radius:7px;box-shadow:var(--shadow)}
  .skip-link:focus{top:12px}
  .sidebar{position:fixed;inset:0 auto 0 0;z-index:20;width:248px;display:flex;flex-direction:column;padding:27px 18px 20px;background:var(--navy-900);color:white;border-left:4px solid var(--teal-600)}
  .brand{display:flex;align-items:center;gap:11px;padding:0 8px}.brand>div{display:grid;gap:2px}.brand strong{font-size:14px;letter-spacing:.01em}.brand span{color:#a9bbc8;font-size:10px;text-transform:uppercase;letter-spacing:.12em}
  .brand-mark{display:flex!important;align-items:end;gap:3px;width:27px;height:29px;padding:5px;border:1px solid #496176;border-radius:4px}.brand-mark i{display:block;width:4px;background:#88cbc6;border-radius:1px}.brand-mark i:nth-child(1){height:7px}.brand-mark i:nth-child(2){height:15px}.brand-mark i:nth-child(3){height:11px}
  nav{display:grid;gap:5px;margin-top:38px}.sidebar nav button{position:relative;display:grid;grid-template-columns:26px 1fr auto;gap:8px;align-items:center;width:100%;padding:12px 10px;border:0;border-radius:7px;background:transparent;color:#c8d4dd;text-align:left;cursor:pointer}.sidebar nav button:hover{background:#1a3349}.sidebar nav button.active{background:#23455e;color:white}.sidebar nav button.active::before{content:"";position:absolute;left:-18px;top:10px;bottom:10px;width:4px;background:#65c1bb;border-radius:0 3px 3px 0}.sidebar nav span{display:grid;gap:3px}.sidebar nav strong{font-size:12px}.sidebar nav small{font-size:9px;color:#9eb0bd}.nav-icon{display:block!important;font-size:17px;color:#74bdb8}.sidebar nav b{min-width:24px;padding:3px 6px;border-radius:99px;background:#d88739;color:#fff;font-size:9px;text-align:center}
  .source-card{margin-top:auto;padding:15px 13px;background:#102436;border:1px solid #2c465b;border-radius:9px}.source-card>div{display:flex;align-items:center;gap:7px;font-size:10px}.status-dot{width:7px;height:7px;border-radius:50%;background:#65c1bb;box-shadow:0 0 0 4px rgba(101,193,187,.12)}dl{display:grid;gap:8px;margin:13px 0 11px}dl div{display:flex;justify-content:space-between;gap:8px}dt{color:#8299aa;font-size:9px}dd{margin:0;color:#d3dde4;font-size:9px;text-align:right}.source-card p{margin:0;padding-top:10px;border-top:1px solid #2b4356;color:#8fa4b3;font-size:8px;line-height:1.45}
  .access{padding:14px 8px 0;color:#8096a6;font-size:8px;text-transform:uppercase;letter-spacing:.12em}.access span{color:#65c1bb;font-size:7px;margin-right:5px}
  .mobile-header{display:none}
  @media(max-width:900px){.sidebar{display:none}.mobile-header{position:fixed;inset:0 0 auto 0;z-index:20;display:flex;align-items:center;justify-content:space-between;height:78px;padding:13px 18px;background:var(--navy-900);color:white;box-shadow:0 5px 18px rgba(15,33,49,.16)}.mobile-header .brand{padding:0}.mobile-header nav{display:flex;gap:3px;margin:0;padding:3px;background:#102436;border-radius:7px}.mobile-header button{padding:7px 9px;border:0;border-radius:5px;background:transparent;color:#aebec9;font-size:10px;font-weight:700}.mobile-header button.active{background:#2a506a;color:white}}
  @media(max-width:520px){.mobile-header .brand strong{display:none}.brand-mark{width:25px}.mobile-header{padding-inline:12px}.mobile-header nav{margin-left:auto}}
</style>
