<script>
  import ProjectPurposeGuide from './ProjectPurposeGuide.svelte';
  import EvidenceTutorial from './EvidenceTutorial.svelte';

  let track = 'project';
</script>

<div class="learning-hub">
  <div class="track-switch" aria-label="Velg opplæringsspor">
    <div>
      <strong>Hva vil du lære?</strong>
      <span>Start med prosjektforståelse. Gå til teknisk fordypning når helheten er klar.</span>
    </div>
    <div class="buttons">
      <button class:active={track === 'project'} type="button" on:click={() => (track = 'project')}>
        Forstå prosjektet
      </button>
      <button class:active={track === 'technical'} type="button" on:click={() => (track = 'technical')}>
        Teknisk Evidence-guide
      </button>
    </div>
  </div>

  {#if track === 'project'}
    <ProjectPurposeGuide />
  {:else}
    <EvidenceTutorial />
  {/if}
</div>

<style>
  :global(html), :global(body) { overflow-y: auto !important; }
  :global(body) { background: #edf2f3 !important; }
  :global(#evidence-main-article > h1.title) { display: none !important; }
  :global(#evidence-main-article) { width: 100%; max-width: none; }
  .learning-hub { width: 100%; }
  .track-switch { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; gap: 24px; width: calc(100% - 8px); max-width: 1532px; margin: 8px auto 0; padding: 13px 18px; box-sizing: border-box; border: 1px solid #cdd9dc; background: rgba(255, 255, 255, .97); box-shadow: 0 5px 18px rgba(26, 54, 65, .08); }
  .track-switch > div:first-child { display: grid; gap: 2px; }
  .track-switch strong { color: #1e3c49; font-size: 12px; }
  .track-switch span { color: #6a7d84; font-size: 10px; }
  .buttons { display: flex; flex: 0 0 auto; gap: 4px; padding: 3px; background: #e8eef0; }
  button { min-height: 36px; padding: 0 13px; border: 0; border-radius: 4px; color: #52676f; background: transparent; font: inherit; font-size: 11px; font-weight: 750; cursor: pointer; }
  button.active { color: white; background: #176f68; box-shadow: 0 2px 5px rgba(23, 77, 75, .18); }
  @media (max-width: 720px) {
    .track-switch { position: static; align-items: stretch; flex-direction: column; gap: 10px; width: 100%; }
    .buttons { display: grid; grid-template-columns: 1fr 1fr; }.buttons button { padding: 5px 8px; }
  }
</style>
