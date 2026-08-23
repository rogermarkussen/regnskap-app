# Prosjektinstruksjoner

## Utviklingsserver

Når brukeren ber om å kjøre eller starte prosjektet, skal Evidence-serveren
startes frakoblet fra terminaløkten og holdes kjørende i 30 minutter, slik at
den ikke avsluttes ved inaktivitet:

```bash
setsid timeout --signal=TERM 30m npm run dev:fast > /tmp/regnskap3-dev.log 2>&1 < /dev/null &
```

Kontroller etter oppstart at `http://localhost:3003/` svarer. Hvis port 3003
allerede brukes av prosjektets utviklingsserver, skal den eksisterende serveren
beholdes i stedet for å starte en ny prosess.

## Datagrense

- Repositoryet er kode-only. Operative data, fasit, maler og genererte
  leveranser skal ligge under ekstern `REGNSKAP_DATA_ROOT`.
- `data-manifest.json` er eneste autoritative kobling fra kode til data.
- Les `DATA.md` før dataoppdatering eller publisering.
- Nye datasnapshots skal være uforanderlige og få nye stier og kontrollsummer.

## Excel-filer og fasit

Datasett med rollen `fasit` er kun uavhengige, skrivebeskyttede testorakler. De skal
aldri brukes som beregningskilde, reserveverdi eller oppslag for publiserte
tall. Verdier fra fasit skal heller aldri kopieres eller hardkodes i
produksjonskode.

Hvert publisert hovedbok- og budsjettall skal kunne spores tilbake til operative
transaksjons- og budsjettdata. Tester kan lese eksterne fasitfiler for å
sammenligne beregnet resultat celle for celle. Hvis operative data ikke kan
reprodusere en Excel-verdi, skal avviket vises og dokumenteres; beregningen skal
ikke endres til Excel-verdien.

Operative Excel-datasett med rollen `operative-temporary` skal fases ut som
beregningskilder. De kan bare brukes der en tilsvarende Parquet-kilde ennå ikke
finnes, og denne avhengigheten skal merkes uttrykkelig i rapport og
dokumentasjon.

<!-- setup-jj-gitea-mirror:start -->
## JJ / Gitea / GitHub

- Bruk Jujutsu (`jj`) for alle lokale versjonskontrolloperasjoner. Ikke bruk `git`-CLI.
- Lokal Gitea er primær forge og `origin`: `http://127.0.0.1:3000/admin/Regnskap-app` (`admin/Regnskap-app`).
- GitHub er et enveis push-speil: `https://github.com/rogermarkussen/regnskap-app` (`rogermarkussen/regnskap-app`). Ikke push direkte til `github`.
- Standard bookmark er `main`. Fetch og push skal gå mot `origin`; Gitea speiler videre til GitHub ved commit.
- Bruk Gitea MCP for støttede Gitea-operasjoner som repository-metadata, issues, pull requests, releases, labels, milestones, brukere, organisasjoner og hooks. Bruk Gitea REST API bare når MCP-en mangler nødvendig operasjon, særlig administrasjon av push-speil.
- Bruk `gh` kun for GitHub-side forgeadministrasjon som ikke er en lokal versjonskontrolloperasjon.
<!-- setup-jj-gitea-mirror:end -->
