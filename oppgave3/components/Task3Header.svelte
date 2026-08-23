<script>
  export let metadata = [];

  const date = (value, includeTime = false) => {
    if (!value) return '–';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleString('nb-NO', includeTime
      ? { dateStyle: 'short', timeStyle: 'short' }
      : { dateStyle: 'short' });
  };

  $: source = metadata[0] ?? {};
</script>

<svelte:head><title>Oppgave 3 | Regnskapsrapportering</title></svelte:head>

<header class="task-header">
  <div>
    <span class="eyebrow">Oppgave 3 · Regnskap</span>
    <h1>Workflow og månedsavslutning</h1>
    <p>Følg fakturaflyten mot bokført regnskap, og kontroller hovedbok og budsjett ved månedsavslutning.</p>
    <small>
      Datadekning: workflow til {date(source.seneste_workflowhendelse, true)} · hovedbok til {date(source.seneste_bilagsdato)}
      · {source.snapshot_status ?? 'Uttrekkstidspunkt er ikke dokumentert'}
    </small>
  </div>
</header>

<style>
  .task-header{display:flex;justify-content:space-between;gap:24px;max-width:1540px;margin:8px auto 0;padding:28px 30px;box-sizing:border-box;background:linear-gradient(125deg,#24304a,#394b71);color:white;border-radius:14px}
  .task-header h1{margin:5px 0;color:white!important;font-size:32px}
  .task-header p{margin:0 0 7px;color:#d7deec}
  .task-header small{color:#adbcd5}
  .task-header nav{display:flex;gap:7px;align-items:flex-start}
  .task-header a{color:white;border:1px solid #71809d;border-radius:6px;padding:8px 10px;text-decoration:none;font-size:11px}
  .eyebrow{color:#8dd7cf;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em}
  @media(max-width:1000px){.task-header{flex-direction:column}.task-header nav{flex-wrap:wrap}}
</style>
