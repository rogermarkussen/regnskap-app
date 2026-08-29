<script>
  import { pickLocalDirectory, selectionFromInput } from './localDataFolder.js';

  export let taskLabel = '';
  export let requiredFiles = [];
  export let onSelect = async () => {};

  let fileInput;
  let loading = false;
  let error = '';

  const useSelection = async (selection) => {
    if (!selection) return;
    loading = true;
    error = '';
    try {
      await onSelect(selection);
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    } finally {
      loading = false;
    }
  };

  const chooseFolder = async () => {
    if (typeof window.showDirectoryPicker !== 'function') {
      fileInput?.click();
      return;
    }
    try {
      await useSelection(await pickLocalDirectory());
    } catch (cause) {
      if (cause?.name !== 'AbortError') error = cause instanceof Error ? cause.message : String(cause);
    }
  };

  const chooseFallback = async (event) => {
    await useSelection(selectionFromInput(event.currentTarget.files));
    event.currentTarget.value = '';
  };
</script>

<main class="data-gate">
  <section aria-labelledby="local-data-title">
    <div class="gate-mark" aria-hidden="true"><span></span><span></span><span></span></div>
    <p class="eyebrow">{taskLabel}</p>
    <h1 id="local-data-title">Velg lokal datamappe</h1>
    <p class="intro">Rapporten starter uten data. Velg testmappen eller den oppgavespesifikke mappen med beregnede Parquet-filer.</p>

    <button type="button" on:click={chooseFolder} disabled={loading}>
      {loading ? 'Leser mappen…' : 'Velg datamappe'}
    </button>
    <input
      bind:this={fileInput}
      class="folder-input"
      type="file"
      multiple
      webkitdirectory
      aria-label="Velg datamappe"
      on:change={chooseFallback}
    />

    {#if error}<p class="error" role="alert">{error}</p>{/if}

    <div class="privacy-note">
      <strong>Dataene forlater ikke maskinen.</strong>
      <span>Filene leses direkte i nettleseren og lastes ikke opp. Oppdatering eller lukking av fanen fjerner dataene fra rapporten.</span>
    </div>

    <details>
      <summary>Filer som må finnes i mappen</summary>
      <ul>{#each requiredFiles as name}<li>{name}</li>{/each}</ul>
    </details>
  </section>
</main>

<style>
  .data-gate{box-sizing:border-box;display:grid;place-items:center;min-height:100vh;padding:32px;background:#eaf1f6;color:#14263a;font-family:Inter,Aptos,"Segoe UI",system-ui,sans-serif}.data-gate section{width:min(620px,100%);padding:38px 40px;border:1px solid #cfdae3;border-top:5px solid #2f80c2;border-radius:14px;background:#fff;box-shadow:0 22px 60px rgba(11,31,54,.12)}.gate-mark{display:flex;align-items:end;gap:4px;width:46px;height:46px;margin-bottom:22px;padding:10px;border-radius:11px;background:#123e63}.gate-mark span{width:7px;border-radius:2px 2px 0 0;background:#70beeb}.gate-mark span:nth-child(1){height:40%;opacity:.62}.gate-mark span:nth-child(2){height:70%;opacity:.82}.gate-mark span:nth-child(3){height:100%}.eyebrow{margin:0;color:#2f80c2;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}h1{margin:5px 0 10px;color:#0b1f36;font-size:clamp(29px,5vw,42px);letter-spacing:-.035em;line-height:1.05}.intro{max-width:520px;margin:0 0 24px;color:#5f7487;font-size:14px;line-height:1.55}button{min-height:46px;padding:0 18px;border:0;border-radius:8px;background:#123e63;color:#fff;font:inherit;font-size:13px;font-weight:750;cursor:pointer}button:hover{background:#195276}button:focus-visible{outline:3px solid rgba(47,128,194,.25);outline-offset:3px}button:disabled{cursor:wait;opacity:.65}.folder-input{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0,0,0,0)}.error{margin:16px 0 0;padding:10px 12px;border-left:4px solid #b54848;background:#fae9e9;color:#8c3434;font-size:12px}.privacy-note{display:grid;gap:4px;margin-top:26px;padding:15px 16px;border-left:4px solid #3b9170;background:#edf7f3}.privacy-note strong{color:#246a50;font-size:12px}.privacy-note span{color:#526f65;font-size:11px;line-height:1.45}details{margin-top:18px;color:#63798c;font-size:11px}summary{cursor:pointer;font-weight:700}ul{margin:9px 0 0;padding-left:20px;font-family:"SFMono-Regular",Consolas,monospace;line-height:1.7}@media(max-width:620px){.data-gate{padding:0}.data-gate section{min-height:100vh;padding:30px 24px;border-right:0;border-left:0;border-radius:0}}
</style>
